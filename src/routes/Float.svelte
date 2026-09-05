<script lang="ts">
  // Home, in the reference's shape: greeting header, a hero figure paired
  // with a visual, a two-up stat row on soft fills, then a labelled list.
  //
  // The visual is a real allocation ring driven by actual balances rather
  // than a decorative illustration, so the largest graphic on screen is
  // carrying data.
  import PaymentState from './PaymentState.svelte'
  import { Bell, Lightning } from 'phosphor-svelte'
  import { getAddress, readBalance, isInsideNimiqPay } from '../lib/nimiq'
  import {
    readStaker,
    planNextMove,
    startStaking,
    addStake,
    retireStake,
    removeStake,
    type StakerState,
    type Plan,
  } from '../lib/staking'
  import { runTx, payment, resetPayment } from '../lib/payment'
  import { formatNim, nimToLuna } from '../lib/units'
  import { addActivity, rememberValidator, readActivity, describe } from '../lib/activity'
  import { locale } from '../lib/i18n'
  import { registerAction } from '../lib/action'

  const MIN_MOVE_LUNA = nimToLuna(10)
  const FLOOR_KEY = 'float:floor'

  const DEMO_LIQUID = nimToLuna(1840)
  const DEMO_STAKER: StakerState = {
    totalLuna: nimToLuna(6250),
    activeLuna: nimToLuna(6250),
    retiredLuna: 0,
    delegation: null,
  }

  let liquidLuna = $state<number | null>(null)
  let staker = $state<StakerState | null>(null)
  let readFailed = $state(false)
  let validator = $state('')
  let busy = $state(false)
  let floorNim = $state(loadFloor())
  let recent = $state(readActivity().slice(0, 3))

  function loadFloor(): number {
    try {
      const v = Number(localStorage.getItem(FLOOR_KEY))
      return Number.isFinite(v) && v > 0 ? v : 500
    } catch {
      return 500
    }
  }

  function saveFloor(v: number) {
    try {
      localStorage.setItem(FLOOR_KEY, String(v))
    } catch {
      // Private mode. The rule still applies for this session.
    }
  }

  const liquid = $derived(liquidLuna ?? DEMO_LIQUID)
  const stk = $derived(staker ?? DEMO_STAKER)
  const isLive = $derived(liquidLuna !== null && staker !== null)
  const totalLuna = $derived(liquid + stk.totalLuna)
  const floorLuna = $derived(nimToLuna(Number(floorNim) || 0))

  const plan = $derived<Plan>(
    planNextMove({
      liquidLuna: liquid,
      staker: stk,
      rule: { floorLuna, validator },
      retiredReady: false,
      minMoveLuna: MIN_MOVE_LUNA,
    }),
  )

  const showState = $derived($payment.status !== 'idle')
  const ratio = $derived(totalLuna > 0 ? stk.activeLuna / totalLuna : 0)

  // Ring geometry
  const R = 52
  const C = 2 * Math.PI * R

  let shown = $state(0)
  $effect(() => {
    const target = stk.activeLuna
    const from = shown
    if (from === target) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown = target
      return
    }
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 560)
      shown = from + (target - from) * (1 - Math.pow(1 - t, 3))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  })

  async function load() {
    const a = await getAddress()
    if (!a) return
    const [b, s] = await Promise.all([readBalance(a), readStaker(a)])
    if (b === null || s === null) {
      readFailed = true
      return
    }
    readFailed = false
    liquidLuna = b
    staker = s
  }

  $effect(() => {
    load()
  })

  function planLabel(p: Plan): string {
    switch (p.action) {
      case 'stake':
        return `Put ${formatNim(p.amountLuna, locale)} NIM to work`
      case 'retire':
        return `Free up ${formatNim(p.amountLuna, locale)} NIM`
      case 'remove':
        return `Collect ${formatNim(p.amountLuna, locale)} NIM`
      default:
        return 'Nothing to do'
    }
  }

  function planExplain(p: Plan): string {
    switch (p.action) {
      case 'stake':
        return 'Anything above your floor earns instead of sitting still.'
      case 'retire':
        return 'Starts a waiting period before this NIM is spendable again.'
      case 'remove':
        return 'The waiting period is over. This returns it to your balance.'
      default:
        return p.reason
    }
  }

  const needsValidator = $derived(
    plan.action === 'stake' && plan.isFirstTime && validator.trim().length < 10,
  )
  const canAct = $derived(plan.action !== 'none' && isLive && !busy && !needsValidator)

  async function execute() {
    if (!canAct) return
    busy = true
    try {
      const amount = plan.amountLuna
      const kind = plan.action
      await runTx(amount, async () => {
        let hash: string
        switch (kind) {
          case 'stake':
            hash = plan.isFirstTime
              ? await startStaking(validator.trim(), amount)
              : await addStake(amount)
            if (plan.isFirstTime) rememberValidator(validator.trim())
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
        addActivity({ txHash: hash, kind, amountLuna: amount, at: Date.now() })
        return hash
      })
      recent = readActivity().slice(0, 3)
    } finally {
      busy = false
    }
  }

  // The centre button in the tab bar drives this screen's action.
  $effect(() => registerAction(canAct ? execute : null))

  function when(ts: number): string {
    const s = Math.max(0, (Date.now() - ts) / 1000)
    if (s < 60) return 'just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
  }
</script>

{#if showState}
  <PaymentState
    onRetry={() => {}}
    onDone={() => {
      resetPayment()
      load()
    }}
  />
{:else}
  <div class="screen">
    <header class="greeting">
      <div>
        <p class="hello">Your NIM</p>
        <p class="sub">Keep some ready, put the rest to work</p>
      </div>
      <button class="chip" aria-label="Status">
        <Bell size={19} weight="regular" color="var(--ink-2)" />
      </button>
    </header>

    <section class="card hero">
      <div class="ring-wrap">
        <svg viewBox="0 0 128 128" class="ring" aria-hidden="true">
          <circle cx="64" cy="64" r={R} fill="none" stroke="var(--ground-2)" stroke-width="14" />
          <circle
            cx="64"
            cy="64"
            r={R}
            fill="none"
            stroke="var(--tint)"
            stroke-width="14"
            stroke-linecap="round"
            stroke-dasharray={C}
            stroke-dashoffset={C * (1 - ratio)}
            transform="rotate(-90 64 64)"
          />
        </svg>
        <span class="ring-pct tabular">{Math.round(ratio * 100)}%</span>
      </div>

      <div class="hero-figures">
        <p class="goal tabular">Total {formatNim(totalLuna, locale)}</p>
        <p class="figure tabular">{formatNim(shown, locale)}</p>
        <p class="cap">NIM earning</p>
      </div>
    </section>

    <div class="pair">
      <div class="stat warm">
        <p class="stat-label">Spendable</p>
        <p class="stat-value tabular">{formatNim(liquid, locale)}</p>
        <p class="stat-sub tabular">floor {formatNim(floorLuna, locale)}</p>
      </div>
      <div class="stat cool">
        <p class="stat-label">{stk.retiredLuna > 0 ? 'Waiting' : 'Working'}</p>
        <p class="stat-value tabular">
          {formatNim(stk.retiredLuna > 0 ? stk.retiredLuna : stk.activeLuna, locale)}
        </p>
        <p class="stat-sub">{stk.retiredLuna > 0 ? 'in its window' : 'delegated'}</p>
      </div>
    </div>

    <section class="card rule">
      <div class="rule-text">
        <p class="rule-label">Keep spendable</p>
        <p class="rule-sub">Everything above this works for you</p>
      </div>
      <div class="rule-field">
        <input
          class="tabular"
          type="text"
          inputmode="decimal"
          aria-label="NIM to keep spendable"
          bind:value={floorNim}
          onchange={() => saveFloor(Number(floorNim))}
        />
        <span>NIM</span>
      </div>
    </section>

    {#if plan.action === 'stake' && plan.isFirstTime}
      <section class="card rule">
        <div class="rule-text">
          <p class="rule-label">Validator</p>
          <p class="rule-sub">Your NIM stays in your own account</p>
        </div>
        <div class="rule-field wide">
          <input bind:value={validator} placeholder="NQ..." spellcheck="false" />
        </div>
      </section>
    {/if}

    <section class="card next" class:idle={plan.action === 'none'}>
      <span class="next-icon"><Lightning size={20} weight="fill" color="var(--tint-deep)" /></span>
      <div>
        <p class="next-title">{planLabel(plan)}</p>
        <p class="next-detail">{planExplain(plan)}</p>
      </div>
    </section>

    {#if readFailed}
      <p class="footnote danger">
        Could not read your balance from the network, so no move is suggested.
        Nothing has been changed.
      </p>
    {:else if !isLive}
      <p class="footnote">Example figures. Open inside Nimiq Pay to see your own balance.</p>
    {/if}
    {#if !isInsideNimiqPay()}
      <p class="footnote">This runs as a Nimiq Pay mini app.</p>
    {/if}

    <p class="section-label">Recent</p>
    {#if recent.length}
      <div class="list">
        {#each recent as e (e.txHash)}
          <div class="card item">
            <div>
              <p class="item-title">{describe(e.kind)}</p>
              <p class="item-time">{when(e.at)}</p>
            </div>
            {#if e.amountLuna > 0}
              <span class="item-amt tabular">+{formatNim(e.amountLuna, locale)}</span>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="card empty">
        <p>Your moves will appear here with their transaction hash.</p>
      </div>
    {/if}
  </div>
{/if}

<style>
  .greeting {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--gap);
    padding: var(--gap-lg) 0 var(--gap-lg);
  }

  .hello {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.2px;
  }

  .sub {
    margin: 2px 0 0;
    color: var(--ink-3);
    font-size: 14px;
  }

  .chip {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    background: var(--card);
    border-radius: 50%;
    box-shadow: var(--shadow-card);
    flex: none;
  }

  .hero {
    display: flex;
    align-items: center;
    gap: var(--gap-lg);
    padding: var(--gap-lg) var(--gap-lg);
  }

  .ring-wrap {
    position: relative;
    width: 108px;
    height: 108px;
    flex: none;
  }

  .ring {
    width: 100%;
    height: 100%;
  }

  .ring circle:last-child {
    transition: stroke-dashoffset 620ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .ring-pct {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 19px;
    font-weight: 700;
  }

  .hero-figures {
    min-width: 0;
  }

  .goal {
    margin: 0;
    color: var(--ink-3);
    font-size: 13px;
  }

  .figure {
    margin: 2px 0 0;
    font-size: 40px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -1px;
  }

  .cap {
    margin: 4px 0 0;
    color: var(--ink-2);
    font-size: 14px;
  }

  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--gap-sm);
    margin-top: var(--gap-sm);
  }

  .stat {
    padding: var(--gap) var(--gap);
    border-radius: var(--r-card);
    box-shadow: var(--shadow-card);
  }

  .stat.warm {
    background: var(--fill-warm);
  }

  .stat.cool {
    background: var(--fill-cool);
  }

  .stat-label {
    margin: 0;
    color: var(--ink-2);
    font-size: 13px;
    font-weight: 500;
  }

  .stat-value {
    margin: 6px 0 0;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.4px;
  }

  .stat-sub {
    margin: 2px 0 0;
    color: var(--ink-3);
    font-size: 12px;
  }

  .rule {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
    margin-top: var(--gap-sm);
    padding: var(--gap) var(--gap-lg);
  }

  .rule-label {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .rule-sub {
    margin: 2px 0 0;
    color: var(--ink-3);
    font-size: 13px;
  }

  .rule-field {
    display: flex;
    align-items: baseline;
    gap: 5px;
    flex: none;
    color: var(--tint-deep);
    font-weight: 700;
  }

  .rule-field input {
    width: 5ch;
    color: var(--tint-deep);
    font-size: 20px;
    font-weight: 700;
    text-align: right;
    outline: none;
  }

  .rule-field span {
    font-size: 13px;
  }

  .rule-field.wide {
    flex: 1;
    min-width: 0;
  }

  .rule-field.wide input {
    width: 100%;
    font-size: 15px;
  }

  .next {
    display: flex;
    align-items: flex-start;
    gap: var(--gap-sm);
    margin-top: var(--gap-sm);
    padding: var(--gap) var(--gap-lg);
  }

  .next.idle {
    opacity: 0.6;
  }

  .next-icon {
    display: block;
    padding-top: 2px;
    flex: none;
  }

  .next-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .next-detail {
    margin: 2px 0 0;
    color: var(--ink-3);
    font-size: 13px;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
    padding: var(--gap-sm) var(--gap-lg);
  }

  .item-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }

  .item-time {
    margin: 2px 0 0;
    color: var(--ink-3);
    font-size: 12px;
  }

  .item-amt {
    color: var(--tint-deep);
    font-size: 15px;
    font-weight: 600;
  }

  .empty {
    padding: var(--gap-lg);
    color: var(--ink-3);
    font-size: 14px;
  }

  .empty p {
    margin: 0;
  }

  .footnote.danger {
    color: var(--danger);
  }
</style>
