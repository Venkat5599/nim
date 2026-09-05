'use client'

// Four transaction states, one structure. Calm and sparse, so nothing reads
// as an alarm. "Cancelled" is the one most apps get wrong: it must say
// plainly that the user still has their money.
import { CheckCircle, XCircle, WarningCircle, CircleNotch } from '@phosphor-icons/react'
import { usePayment } from '@/lib/payment'
import { shortHash } from '@/lib/nimiq'
import { formatNim } from '@/lib/units'
import { locale } from '@/lib/i18n'

export default function StatusScreen({ onDone }: { onDone: () => void }) {
  const state = usePayment((s) => s.state)
  const reset = usePayment((s) => s.reset)

  if (state.status === 'idle') return null

  const busy = state.status === 'submitting' || state.status === 'pending'

  const title =
    state.status === 'submitting'
      ? 'Confirm in Nimiq Pay'
      : state.status === 'pending'
        ? 'Confirming'
        : state.status === 'success'
          ? 'Done'
          : state.status === 'cancelled'
            ? 'Cancelled'
            : 'Did not go through'

  const detail =
    state.status === 'submitting'
      ? 'Approve the transaction to continue'
      : state.status === 'pending'
        ? 'Waiting for the network'
        : state.status === 'success'
          ? 'Your balance has been updated'
          : state.status === 'cancelled'
            ? 'No NIM left your wallet'
            : state.status === 'failed' && state.reason === 'invalid'
              ? 'Something was wrong with the transaction'
              : state.status === 'failed' && state.reason === 'network'
                ? 'Could not reach the network'
                : 'Please try again'

  return (
    <div className="screen status">
      <div className="status-mid">
        {busy && <CircleNotch size={44} weight="bold" color="var(--tint)" className="spin" />}
        {state.status === 'success' && (
          <CheckCircle size={44} weight="fill" color="var(--tint)" />
        )}
        {state.status === 'cancelled' && (
          <XCircle size={44} weight="regular" color="var(--ink-3)" />
        )}
        {state.status === 'failed' && (
          <WarningCircle size={44} weight="fill" color="var(--danger)" />
        )}

        <h1 className="status-title">{title}</h1>

        {state.status === 'success' && (
          <p className="status-amount tabular">{formatNim(state.amountLuna, locale)} NIM</p>
        )}

        <p className="status-detail">{detail}</p>

        {state.status === 'success' && (
          <p className="status-hash tabular">{shortHash(state.txHash)}</p>
        )}
      </div>

      {!busy && (
        <div className="status-dock">
          <button
            className="cta"
            onClick={() => {
              reset()
              onDone()
            }}
          >
            {state.status === 'success' ? 'Back to balance' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  )
}
