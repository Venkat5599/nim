'use client'

// Home: greeting, a hero figure paired with a real allocation ring, a two-up
// stat row, the rule, the next move, then recent activity.
//
// The ring is driven by actual balances rather than decorative art, so the
// largest graphic on screen is carrying data.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Lightning } from '@phosphor-icons/react'
import StatusScreen from '@/components/StatusScreen'
import ChainStatus from '@/components/ChainStatus'
import { getAddress, readBalance, isInsideNimiqPay } from '@/lib/nimiq'
import {
  readStaker,
  planNextMove,
  startStaking,
  addStake,
  retireStake,
  removeStake,
  type StakerState,
  type Plan,
} from '@/lib/staking'
import { usePayment } from '@/lib/payment'
import { useAction } from '@/lib/action'
import { formatNim, nimToLuna } from '@/lib/units'
import { addActivity, rememberValidator, readActivity, describe, type Entry } from '@/lib/activity'
import { locale } from '@/lib/i18n'

const MIN_MOVE_LUNA = nimToLuna(10)
const FLOOR_KEY = 'float:floor'
const R = 52
const C = 2 * Math.PI * R

// Example figures so the first screen is legible before a wallet connects.
const DEMO_LIQUID = nimToLuna(1840)
const DEMO_STAKER: StakerState = {
  totalLuna: nimToLuna(6250),
  activeLuna: nimToLuna(6250),
  retiredLuna: 0,
  delegation: null,
}

export default function Home() {
  const [liquidLuna, setLiquid] = useState<number | null>(null)
  const [staker, setStaker] = useState<StakerState | null>(null)
  const [readFailed, setReadFailed] = useState(false)
  const [validator, setValidator] = useState('')
  const [busy, setBusy] = useState(false)
  const [floorNim, setFloorNim] = useState('500')
  const [recent, setRecent] = useState<Entry[]>([])

  const payState = usePayment((s) => s.state)
  const run = usePayment((s) => s.run)
  const setAction = useAction((s) => s.setAction)

  useEffect(() => {
    try {
      const v = localStorage.getItem(FLOOR_KEY)
      if (v && Number(v) > 0) setFloorNim(v)
    } catch {
      // Private mode. The default rule still applies.
    }
    setRecent(readActivity().slice(0, 3))
  }, [])

  const liquid = liquidLuna ?? DEMO_LIQUID
  const stk = staker ?? DEMO_STAKER
  const isLive = liquidLuna !== null && staker !== null
  const totalLuna = liquid + stk.totalLuna
  const floorLuna = nimToLuna(Number(floorNim) || 0)
  const ratio = totalLuna > 0 ? stk.activeLuna / totalLuna : 0

  const plan: Plan = useMemo(
    () =>
      planNextMove({
        liquidLuna: liquid,
        staker: stk,
        rule: { floorLuna, validator },
        retiredReady: false,
        minMoveLuna: MIN_MOVE_LUNA,
      }),
    [liquid, stk, floorLuna, validator],
  )

  const load = useCallback(async () => {
    const a = await getAddress()
    if (!a) return
    const [b, s] = await Promise.all([readBalance(a), readStaker(a)])
    if (b === null || s === null) {
      // A failed read must never drive a rebalance.
      setReadFailed(true)
      return
    }
    setReadFailed(false)
    setLiquid(b)
    setStaker(s)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Count the hero figure to its target: the number moving is the confirmation.
  const [shown, setShown] = useState(0)
  const shownRef = useRef(0)
  useEffect(() => {
    const target = stk.activeLuna
    const from = shownRef.current
    if (from === target) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shownRef.current = target
      setShown(target)
      return
    }
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 560)
      const v = from + (target - from) * (1 - Math.pow(1 - t, 3))
      shownRef.current = v
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [stk.activeLuna])

  const needsValidator =
    plan.action === 'stake' && plan.isFirstTime && validator.trim().length < 10
  const canAct = plan.action !== 'none' && isLive && !busy && !needsValidator

  const execute = useCallback(async () => {
    // canAct already encodes "plan.action !== 'none'", and the compiler
    // infers that predicate, so plan is narrowed to a move with an amount.
    if (!canAct) return
    const move = plan
    setBusy(true)
    try {
      const amount = move.amountLuna
      const kind = move.action
      await run(amount, async () => {
        let hash: string
        switch (move.action) {
          case 'stake':
            hash = move.isFirstTime
              ? await startStaking(validator.trim(), amount)
              : await addStake(amount)
            if (move.isFirstTime) rememberValidator(validator.trim())
            break
          case 'retire':
            hash = await retireStake(amount)
            break
          case 'remove':
            hash = await removeStake(amount)
            break
          default:
            throw new Error('no action')
        }
        // Recorded only after a hash returns, so a cancelled or unbroadcast
        // transaction never appears in history.
        addActivity({ txHash: hash, kind, amountLuna: amount, at: Date.now() })
        return hash
      })
      setRecent(readActivity().slice(0, 3))
    } finally {
      setBusy(false)
    }
  }, [canAct, plan, run, validator])

  // Lend this screen's action to the tab bar's centre button.
  useEffect(() => {
    setAction(canAct ? execute : null)
    return () => setAction(null)
  }, [canAct, execute, setAction])

  const planLabel =
    plan.action === 'stake'
      ? `Put ${formatNim(plan.amountLuna, locale)} NIM to work`
      : plan.action === 'retire'
        ? `Free up ${formatNim(plan.amountLuna, locale)} NIM`
        : plan.action === 'remove'
          ? `Collect ${formatNim(plan.amountLuna, locale)} NIM`
          : 'Nothing to do'

  const planExplain =
    plan.action === 'stake'
      ? 'Anything above your floor earns instead of sitting still.'
      : plan.action === 'retire'
        ? 'Starts a waiting period before this NIM is spendable again.'
        : plan.action === 'remove'
          ? 'The waiting period is over. This returns it to your balance.'
          : plan.reason

  if (payState.status !== 'idle') return <StatusScreen onDone={load} />

  return (
    <div className="screen">
      <header className="greeting">
        <div>
          <p className="hello">Your NIM</p>
          <p className="sub">Keep some ready, put the rest to work</p>
        </div>
        <button className="chip" aria-label="Status">
          <Bell size={19} color="var(--ink-2)" />
        </button>
      </header>

      <section className="card hero">
        <div className="ring-wrap">
          <svg viewBox="0 0 128 128" className="ring" aria-hidden="true">
            <circle cx="64" cy="64" r={R} fill="none" stroke="var(--ground-2)" strokeWidth="14" />
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="var(--tint)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - ratio)}
              transform="rotate(-90 64 64)"
            />
          </svg>
          <span className="ring-pct tabular">{Math.round(ratio * 100)}%</span>
        </div>

        <div className="hero-figures">
          <p className="goal tabular">Total {formatNim(totalLuna, locale)}</p>
          <p className="figure tabular">{formatNim(shown, locale)}</p>
          <p className="cap">NIM earning</p>
        </div>
      </section>

      <div className="pair">
        <div className="stat warm">
          <p className="stat-label">Spendable</p>
          <p className="stat-value tabular">{formatNim(liquid, locale)}</p>
          <p className="stat-sub tabular">floor {formatNim(floorLuna, locale)}</p>
        </div>
        <div className="stat cool">
          <p className="stat-label">{stk.retiredLuna > 0 ? 'Waiting' : 'Working'}</p>
          <p className="stat-value tabular">
            {formatNim(stk.retiredLuna > 0 ? stk.retiredLuna : stk.activeLuna, locale)}
          </p>
          <p className="stat-sub">{stk.retiredLuna > 0 ? 'in its window' : 'delegated'}</p>
        </div>
      </div>

      <section className="card rule">
        <div className="rule-text">
          <p className="rule-label">Keep spendable</p>
          <p className="rule-sub">Everything above this works for you</p>
        </div>
        <div className="rule-field">
          <input
            className="tabular"
            type="text"
            inputMode="decimal"
            aria-label="NIM to keep spendable"
            value={floorNim}
            onChange={(e) => setFloorNim(e.target.value)}
            onBlur={() => {
              try {
                localStorage.setItem(FLOOR_KEY, floorNim)
              } catch {
                // Private mode.
              }
            }}
          />
          <span>NIM</span>
        </div>
      </section>

      {plan.action === 'stake' && plan.isFirstTime && (
        <section className="card rule">
          <div className="rule-text">
            <p className="rule-label">Validator</p>
            <p className="rule-sub">Your NIM stays in your own account</p>
          </div>
          <div className="rule-field wide">
            <input
              value={validator}
              onChange={(e) => setValidator(e.target.value)}
              placeholder="NQ..."
              spellCheck={false}
            />
          </div>
        </section>
      )}

      <section className={`card next ${plan.action === 'none' ? 'idle' : ''}`}>
        <span className="next-icon">
          <Lightning size={20} weight="fill" color="var(--tint-deep)" />
        </span>
        <div>
          <p className="next-title">{planLabel}</p>
          <p className="next-detail">{planExplain}</p>
        </div>
      </section>

      {readFailed ? (
        <p className="footnote danger">
          Could not read your balance from the network, so no move is suggested. Nothing has
          been changed.
        </p>
      ) : !isLive ? (
        <p className="footnote">
          Example figures. Open inside Nimiq Pay to see your own balance.
        </p>
      ) : null}

      {!isInsideNimiqPay() && <p className="footnote">This runs as a Nimiq Pay mini app.</p>}

      <ChainStatus />

      <p className="section-label">Recent</p>
      {recent.length ? (
        <div className="list">
          {recent.map((e) => (
            <div className="card item" key={e.txHash}>
              <div>
                <p className="item-title">{describe(e.kind)}</p>
                <p className="item-time">{when(e.at)}</p>
              </div>
              {e.amountLuna > 0 && (
                <span className="item-amt tabular">+{formatNim(e.amountLuna, locale)}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty">
          <p>Your moves will appear here with their transaction hash.</p>
        </div>
      )}
    </div>
  )
}

function when(ts: number): string {
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}
