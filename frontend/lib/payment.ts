'use client'

// The highest-leverage file in the project.
//
// Nimiq Pay shows a NATIVE confirmation dialog for every transaction. On
// mobile that dialog backgrounds the WebView. A promise-only implementation
// loses the result and leaves the user staring at a spinner forever, which is
// exactly how the "success, failure and cancellation handled properly"
// criterion is lost.
//
// Explicit state machine, plus reconciliation when the WebView returns.

import { create } from 'zustand'
import { isUserRejection, isInvalidTransaction } from './nimiq'

export type FailureReason = 'invalid' | 'network' | 'unknown'

export type PaymentState =
  | { status: 'idle' }
  | { status: 'submitting'; amountLuna: number }
  | { status: 'pending'; amountLuna: number; txHash: string }
  | { status: 'success'; amountLuna: number; txHash: string }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: FailureReason }

type Store = {
  state: PaymentState
  reset: () => void
  run: (amountLuna: number, send: () => Promise<string>) => Promise<void>
}

export const usePayment = create<Store>((set, get) => ({
  state: { status: 'idle' },

  reset: () => set({ state: { status: 'idle' } }),

  run: async (amountLuna, send) => {
    // Guard against a double tap firing two real transactions.
    const s = get().state
    if (s.status === 'submitting' || s.status === 'pending') return

    set({ state: { status: 'submitting', amountLuna } })

    let txHash: string
    try {
      txHash = await send()
    } catch (err) {
      // Dismissing the native dialog is a normal outcome, not an error, and
      // must never be presented as a failure.
      if (isUserRejection(err)) {
        set({ state: { status: 'cancelled' } })
        return
      }
      set({
        state: {
          status: 'failed',
          reason: isInvalidTransaction(err) ? 'invalid' : classify(err),
        },
      })
      return
    }

    set({ state: { status: 'success', amountLuna, txHash } })
  },
}))

function classify(err: unknown): FailureReason {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return 'network'
  }
  return 'unknown'
}

/**
 * Called when the WebView comes back to the foreground.
 *
 * Deliberately conservative: never resolves to success without a hash.
 * Claiming a transaction succeeded without evidence is far worse than asking
 * the user to check. An interrupted attempt reports as cancelled, which is
 * both the common case and the safe one.
 */
function reconcile(): void {
  const { state } = usePayment.getState()
  if (state.status === 'submitting') {
    usePayment.setState({ state: { status: 'cancelled' } })
    return
  }
  if (state.status === 'pending') {
    usePayment.setState({
      state: { status: 'success', amountLuna: state.amountLuna, txHash: state.txHash },
    })
  }
}

let listening = false

/** Install once, at app start. Idempotent. */
export function watchVisibility(): void {
  if (listening || typeof document === 'undefined') return
  listening = true

  const check = () => {
    const s = usePayment.getState().state
    if (s.status === 'submitting' || s.status === 'pending') reconcile()
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })

  // iOS Safari does not always fire visibilitychange when returning from a
  // native sheet. pageshow is the reliable companion event.
  window.addEventListener('pageshow', check)
}
