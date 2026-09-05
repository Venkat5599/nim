'use client'

// Delegation control. Uses sendUpdateStakerTransaction, which moves an
// existing stake to a different validator without unstaking first.
import { useCallback, useEffect, useState } from 'react'
import StatusScreen from '@/components/StatusScreen'
import { readValidators, rememberValidator, addActivity } from '@/lib/activity'
import { switchValidator, readStaker } from '@/lib/staking'
import { getAddress, shortAddressSafe } from '@/lib/nimiq'
import { usePayment } from '@/lib/payment'

export default function ValidatorsPage() {
  const [recent, setRecent] = useState<string[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const state = usePayment((s) => s.state)
  const run = usePayment((s) => s.run)

  const load = useCallback(async () => {
    setRecent(readValidators())
    const a = await getAddress()
    if (!a) return
    const s = await readStaker(a)
    setCurrent(s?.delegation ?? null)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const valid = input.trim().length >= 10

  async function apply() {
    if (!valid || busy) return
    setBusy(true)
    try {
      const target = input.trim()
      await run(0, async () => {
        const hash = await switchValidator(target, true)
        rememberValidator(target)
        addActivity({
          txHash: hash,
          kind: 'switch',
          amountLuna: 0,
          at: Date.now(),
          validator: target,
        })
        return hash
      })
    } finally {
      setBusy(false)
    }
  }

  if (state.status !== 'idle') return <StatusScreen onDone={load} />

  return (
    <div className="screen">
      <header className="greeting">
        <div>
          <p className="hello">Validator</p>
          <p className="sub">Who your stake is delegated to</p>
        </div>
      </header>

      <section className="card rule">
        <div className="rule-text">
          <p className="rule-label">Delegating to</p>
          <p className="rule-sub">{current ? shortAddressSafe(current) : 'Not delegating yet'}</p>
        </div>
      </section>

      <section className="card rule">
        <div className="rule-text">
          <p className="rule-label">Move to</p>
          <p className="rule-sub">Your stake keeps earning through the switch</p>
        </div>
        <div className="rule-field wide">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="NQ..."
            spellCheck={false}
          />
        </div>
      </section>

      {recent.length > 0 && (
        <>
          <p className="section-label">Used before</p>
          <div className="list">
            {recent.map((v) => (
              <button className="card item" key={v} onClick={() => setInput(v)}>
                <p className="item-title">{shortAddressSafe(v)}</p>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="page-dock">
        <button className="cta" disabled={!valid || busy} onClick={apply}>
          Move delegation
        </button>
      </div>
    </div>
  )
}
