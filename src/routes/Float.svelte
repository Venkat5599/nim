<script lang="ts">
  // Balance screen, built on iOS conventions: large title, a hero figure,
  // then inset grouped lists. Every interactive value is tinted; every
  // static value is secondary grey.
  import PrimaryButton from '../components/PrimaryButton.svelte'
  import Row from '../components/Row.svelte'
  import ChainStatus from '../components/ChainStatus.svelte'
  import PaymentState from './PaymentState.svelte'
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
  import { addActivity, rememberValidator } from '../lib/activity'
  import { locale } from '../lib/i18n'

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

  function pct(n: number): number {
    return totalLuna > 0 ? (n / totalLuna) * 100 : 0
  }

  // The figure counts to its target after a transaction, because the number
  // moving is the confirmation that something happened.
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
      const t = Math.min(1, (now - start) / 520)
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

  async function execute() {
    if (plan.action === 'none' || busy || !isLive) return
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
    } finally {
      busy = false
    }
  }

  const needsValidator = $derived(
    plan.action === 'stake' && plan.isFirstTime && validator.trim().length < 10,
  )
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
    <h1 class="large-title">Balance</h1>

    <section class="hero">
      <p class="hero-cap">Earning</p>
      <p class="figure tabular">
        {formatNim(shown, locale)}<span class="unit">NIM</span>
      </p>

      <div class="bar" aria-hidden="true">
        <span class="seg working" style="flex-basis: {pct(stk.activeLuna)}%"></span>
        {#if stk.retiredLuna > 0}
          <span class="seg waiting" style="flex-basis: {pct(stk.retiredLuna)}%"></span>
        {/if}
        <span class="seg liquid" style="flex-basis: {pct(liquid)}%"></span>
      </div>
    </section>

    <div class="group">
      <Row label="Working" value="{formatNim(stk.activeLuna, locale)} NIM" />
      {#if stk.retiredLuna > 0}
        <Row label="Waiting" value="{formatNim(stk.retiredLuna, locale)} NIM" />
      {/if}
      <Row label="Spendable" value="{formatNim(liquid, locale)} NIM" last />
    </div>

    <p class="group-header">Your rule</p>
    <div class="group">
      <Row label="Keep spendable" last>
        {#snippet children()}
          <span class="field-wrap">
            <input
              class="field tabular"
              type="text"
              inputmode="decimal"
              aria-label="NIM to keep spendable"
              bind:value={floorNim}
              onchange={() => saveFloor(Number(floorNim))}
            />
            <span class="field-unit">NIM</span>
          </span>
        {/snippet}
      </Row>
    </div>
    <p class="footnote">Anything above this works. Everything below stays ready to spend.</p>

    {#if plan.action === 'stake' && plan.isFirstTime}
      <p class="group-header">Validator</p>
      <div class="group">
        <Row label="Delegate to" last>
          {#snippet children()}
            <input class="addr" bind:value={validator} placeholder="NQ..." spellcheck="false" />
          {/snippet}
        </Row>
      </div>
      <p class="footnote">Your NIM stays in your own account.</p>
    {/if}

    <p class="group-header">Next</p>
    <div class="group">
      <Row label={planLabel(plan)} tint={plan.action !== 'none'} last />
    </div>
    <p class="footnote">{planExplain(plan)}</p>

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

    <ChainStatus />

    <div class="spacer"></div>

    <div class="dock">
      <PrimaryButton
        label={planLabel(plan)}
        disabled={plan.action === 'none' || busy || !isLive || needsValidator}
        onclick={execute}
      />
    </div>
  </div>
{/if}

<style>
  .hero {
    padding: 0 var(--gap) var(--gap-lg);
  }

  .hero-cap {
    margin: 0 0 var(--gap-xs);
    color: var(--label-3);
    font-size: 15px;
  }

  .figure {
    margin: 0;
    font-size: 44px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.5px;
  }

  .unit {
    margin-left: 0.28em;
    color: var(--tint);
    font-size: 0.4em;
    font-weight: 600;
    letter-spacing: 0;
  }

  .bar {
    display: flex;
    gap: 3px;
    height: 8px;
    margin-top: var(--gap-lg);
  }

  .seg {
    flex-grow: 0;
    flex-shrink: 1;
    min-width: 3px;
    border-radius: 999px;
    transition: flex-basis 480ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .seg.working { background: var(--tint); }
  .seg.waiting { background: var(--label-3); }
  .seg.liquid  { background: var(--well); }

  .field-wrap {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }

  .field {
    width: 5ch;
    color: var(--tint);
    font-size: 17px;
    font-weight: 600;
    text-align: right;
    outline: none;
  }

  .field-unit {
    color: var(--label-3);
    font-size: 15px;
  }

  .addr {
    width: 100%;
    min-width: 0;
    color: var(--tint);
    font-size: 17px;
    text-align: right;
    outline: none;
  }

  .footnote.danger {
    color: var(--danger);
  }

  .spacer {
    flex: 1;
    min-height: var(--gap-xl);
  }
</style>
