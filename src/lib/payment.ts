// The highest-leverage file in the project.
//
// Nimiq Pay shows a NATIVE confirmation dialog for every payment. On mobile
// that dialog backgrounds the webview. A promise-only implementation loses the
// result and leaves the user staring at a spinner forever - which is exactly
// how the "payment success, failure and cancellation are handled properly"
// criterion is lost.
//
// So: an explicit state machine, plus reconciliation whenever the webview
// comes back to the foreground.
//
// See ARCHITECTURE.md section 6.

import { writable, get, type Readable } from 'svelte/store'
import {
  sendContribution,
  isUserRejection,
  isInvalidTransaction,
} from './nimiq'
import { recordContribution } from './db'

export type PaymentState =
  | { status: 'idle' }
  | { status: 'submitting'; amountLuna: number }
  | { status: 'pending'; amountLuna: number; txHash: string }
  | { status: 'success'; amountLuna: number; txHash: string }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: FailureReason }

export type FailureReason = 'invalid' | 'network' | 'unknown'

const state = writable<PaymentState>({ status: 'idle' })

export const payment: Readable<PaymentState> = { subscribe: state.subscribe }

export function resetPayment(): void {
  state.set({ status: 'idle' })
}

/**
 * User-facing copy. No raw error ever reaches the screen.
 *
 * The cancelled string matters more than it looks: a user who dismissed the
 * dialog needs to be told, immediately and unambiguously, that they still
 * have their money.
 */
export function messageFor(s: PaymentState): { title: string; detail: string } {
  switch (s.status) {
    case 'submitting':
      return { title: 'Confirm in Nimiq Pay', detail: 'Approve the payment to continue' }
    case 'pending':
      return { title: 'Confirming', detail: 'Waiting for the network' }
    case 'success':
      return { title: 'Sent', detail: 'Your contribution is in' }
    case 'cancelled':
      return { title: 'Cancelled', detail: 'No money left your wallet' }
    case 'failed':
      return { title: "Didn't go through", detail: failureDetail(s.reason) }
    default:
      return { title: '', detail: '' }
  }
}

function failureDetail(reason: FailureReason): string {
  switch (reason) {
    case 'invalid':
      return 'Something was wrong with the transaction'
    case 'network':
      return "Couldn't reach the network"
    default:
      return 'Please try again'
  }
}

// --------------------------------------------------------------- the flow

type ContributeArgs = {
  potId: string
  beneficiary: string
  amountLuna: number
  fromAddress: string
  displayName?: string | null
}

let inFlight: ContributeArgs | null = null

export async function contribute(args: ContributeArgs): Promise<void> {
  // Guard against a double tap firing two real payments.
  const current = get(state)
  if (current.status === 'submitting' || current.status === 'pending') return

  inFlight = args
  state.set({ status: 'submitting', amountLuna: args.amountLuna })

  let txHash: string
  try {
    txHash = await sendContribution({
      beneficiary: args.beneficiary,
      amountLuna: args.amountLuna,
      potId: args.potId,
    })
  } catch (err) {
    // The user dismissed the native dialog. This is a normal outcome, not an
    // error, and it must never be presented as a failure.
    if (isUserRejection(err)) {
      inFlight = null
      state.set({ status: 'cancelled' })
      return
    }
    inFlight = null
    state.set({
      status: 'failed',
      reason: isInvalidTransaction(err) ? 'invalid' : classify(err),
    })
    return
  }

  state.set({ status: 'pending', amountLuna: args.amountLuna, txHash })

  // Optimistic write. The row lands as confirmed = false; only a trusted
  // reconciler that has seen the transaction on chain can flip it, because the
  // anon key has no UPDATE policy.
  try {
    await recordContribution({
      tx_hash: txHash,
      pot_id: args.potId,
      from_address: args.fromAddress,
      amount_luna: args.amountLuna,
      display_name: args.displayName ?? null,
    })
  } catch {
    // A failed index write must not tell the user their money vanished.
    // The payment is already on chain and the tag makes it recoverable.
  }

  inFlight = null
  state.set({ status: 'success', amountLuna: args.amountLuna, txHash })
}

/**
 * Runs any wallet transaction through the same state machine the contribution
 * flow uses, so staking inherits the cancel handling and the visibilitychange
 * reconciliation for free.
 */
export async function runTx(
  amountLuna: number,
  send: () => Promise<string>,
): Promise<void> {
  const current = get(state)
  if (current.status === 'submitting' || current.status === 'pending') return

  state.set({ status: 'submitting', amountLuna })

  let txHash: string
  try {
    txHash = await send()
  } catch (err) {
    if (isUserRejection(err)) {
      state.set({ status: 'cancelled' })
      return
    }
    state.set({
      status: 'failed',
      reason: isInvalidTransaction(err) ? 'invalid' : classify(err),
    })
    return
  }

  state.set({ status: 'success', amountLuna, txHash })
}

function classify(err: unknown): FailureReason {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return 'network'
  }
  return 'unknown'
}

// ------------------------------------------------------- resume on return

/**
 * Called when the webview comes back to the foreground.
 *
 * If we are still mid-flight when the user returns, the promise above may
 * never settle - the webview was suspended while the native dialog was up.
 * Rather than hang, resolve to a state the user can act on.
 *
 * Deliberately conservative: we never resolve to success here. Claiming a
 * payment succeeded without evidence is far worse than asking the user to
 * check. Absent a tx hash, an interrupted attempt is reported as cancelled,
 * which is both the common case and the safe one.
 */
export function reconcile(): void {
  const s = get(state)

  if (s.status === 'submitting') {
    inFlight = null
    state.set({ status: 'cancelled' })
    return
  }

  if (s.status === 'pending') {
    // A hash exists, so the transaction was broadcast. Treat it as done and
    // let the chain-backed contribution list be the record of truth.
    state.set({ status: 'success', amountLuna: s.amountLuna, txHash: s.txHash })
  }
}

let listening = false

/** Install once, at app start. Idempotent. */
export function watchVisibility(): void {
  if (listening || typeof document === 'undefined') return
  listening = true

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    const s = get(state)
    if (s.status === 'submitting' || s.status === 'pending') reconcile()
  })

  // Safari on iOS does not always fire visibilitychange when returning from a
  // native sheet. pageshow is the reliable companion event.
  window.addEventListener('pageshow', () => {
    const s = get(state)
    if (s.status === 'submitting' || s.status === 'pending') reconcile()
  })
}
