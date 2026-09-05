<script lang="ts">
  // Float's one screen.
  //
  // Composition notes:
  //   - The rule is an editable sentence, not a labelled form field. One
  //     number, read in place, so the whole product fits in a line of English.
  //   - The split bar carries its own labels under each segment. No legend,
  //     no colour-key dots.
  //   - Motion is limited to two things that report a real change: the hero
  //     figure counting when the balance moves, and the segments resizing.
  import PrimaryButton from '../components/PrimaryButton.svelte'
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

  // Example figures so the first screen is legible before a wallet connects.
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

  // Counts the hero figure toward its target. Motivated: after a transaction
  // the number moves, and seeing it move is the confirmation.
  let shown = $state(0)
  $effect(() => {
    const target = stk.activeLuna
    const from = shown
    if (from === target) return
    const start = performance.now()
    const dur = 520
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      shown = from + (target - from) * eased
      if (t < 1) raf = requestAnimationFrame(step)
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown = target
    } else {
      raf = requestAnimationFrame(step)
    }
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
        // Logged only after a hash comes back, so the list never contains a
        // transaction that was cancelled or never broadcast.
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
    <header><span class="brand">Float</span></header>

    <section class="hero">
      <p class="label">Earning</p>
      <p class="figure tabular">
        {formatNim(shown, locale)}<span class="unit">NIM</span>
      </p>
    </section>

    <section class="allocation">
      <div class="bar">
        <span class="seg working" style="flex-basis: {pct(stk.activeLuna)}%"></span>
        {#if stk.retiredLuna > 0}
          <span class="seg waiting" style="flex-basis: {pct(stk.retiredLuna)}%"></span>
        {/if}
        <span class="seg liquid" style="flex-basis: {pct(liquid)}%"></span>
      </div>

      <div class="marks">
        <span class="mark" style="flex-basis: {pct(stk.activeLuna)}%">
          <b class="tabular">{formatNim(stk.activeLuna, locale)}</b>
          working
        </span>
        {#if stk.retiredLuna > 0}
          <span class="mark" style="flex-basis: {pct(stk.retiredLuna)}%">
            <b class="tabular">{formatNim(stk.retiredLuna, locale)}</b>
            waiting
          </span>
        {/if}
        <span class="mark" style="flex-basis: {pct(liquid)}%">
          <b class="tabular">{formatNim(liquid, locale)}</b>
          spendable
        </span>
      </div>
    </section>

    <!-- The entire rule, as one sentence you can edit in place. -->
    <p class="rule">
      Keep
      <input
        class="inline-field tabular"
        type="text"
        inputmode="decimal"
        aria-label="NIM to keep spendable"
        bind:value={floorNim}
        onchange={() => saveFloor(Number(floorNim))}
      />
      NIM spendable. The rest works.
    </p>

    {#if plan.action === 'stake' && plan.isFirstTime}
      <label class="validator">
        <span class="label">Validator to delegate to</span>
        <input class="addr" bind:value={validator} placeholder="NQ..." spellcheck="false" />
        <span class="fine">Your NIM stays in your own account.</span>
      </label>
    {/if}

    <section class="next">
      <p class="next-title">{planLabel(plan)}</p>
      <p class="next-detail">{planExplain(plan)}</p>
    </section>

    {#if readFailed}
      <p class="notice danger">
        Could not read your balance from the network, so no move is suggested.
        Nothing has been changed.
      </p>
    {:else if !isLive}
      <p class="notice">
        Example figures. Open inside Nimiq Pay to see your own balance.
      </p>
    {/if}

    {#if !isInsideNimiqPay()}
      <p class="fine center">This runs as a Nimiq Pay mini app.</p>
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
  header {
    padding: var(--gap-lg) 0 var(--gap-2xl);
  }

  .brand {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .label {
    margin: 0 0 var(--gap-xs);
    color: var(--muted);
    font-size: 13px;
    font-weight: 400;
  }

  /* The figure is the display typography of this app. No display typeface,
     just scale, weight and tight tracking on the system stack. */
  .hero .figure {
    margin: 0;
    color: var(--ink);
    font-size: 56px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.035em;
  }

  .hero .unit {
    margin-left: 0.3em;
    color: var(--amber);
    font-size: 0.34em;
    font-weight: 600;
    letter-spacing: 0;
  }

  .allocation {
    margin-top: var(--gap-2xl);
  }

  .bar {
    display: flex;
    gap: 3px;
    height: 10px;
  }

  .seg {
    flex-grow: 0;
    flex-shrink: 1;
    min-width: 3px;
    border-radius: 999px;
    transition: flex-basis 480ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .seg.working {
    background: var(--amber);
  }

  .seg.waiting {
    background: var(--muted);
  }

  .seg.liquid {
    background: var(--surface);
  }

  /* Labels sit under the segment they describe, sharing its width, so the
     bar explains itself without a colour key. */
  .marks {
    display: flex;
    gap: 3px;
    margin-top: var(--gap-sm);
  }

  .mark {
    flex-grow: 0;
    flex-shrink: 1;
    min-width: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.35;
    overflow: hidden;
  }

  .mark b {
    display: block;
    color: var(--ink);
    font-size: 14px;
    font-weight: 600;
  }

  .rule {
    margin: var(--gap-2xl) 0 0;
    color: var(--muted-bright);
    font-size: 17px;
    line-height: 1.7;
  }

  /* Editable in place. Sized to its content, underlined only enough to read
     as a field. */
  .inline-field {
    width: 4.5ch;
    padding: 0 2px;
    color: var(--amber);
    font-size: 17px;
    font-weight: 600;
    text-align: center;
    border-bottom: 1px solid var(--amber);
    outline: none;
  }

  .inline-field:focus {
    background: var(--surface);
  }

  .validator {
    display: block;
    margin-top: var(--gap-xl);
  }

  .validator .addr {
    width: 100%;
    min-height: 52px;
    padding: 0 var(--gap);
    background: var(--surface);
    border-radius: var(--radius);
    outline: none;
  }

  .validator .addr:focus {
    background: var(--surface-pressed);
  }

  .fine {
    display: block;
    margin-top: var(--gap-xs);
    color: var(--muted);
    font-size: 13px;
  }

  .center {
    text-align: center;
  }

  .next {
    margin-top: var(--gap-2xl);
  }

  .next-title {
    margin: 0 0 4px;
    font-size: 19px;
    font-weight: 600;
    letter-spacing: -0.012em;
  }

  .next-detail {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    max-width: 34ch;
  }

  .notice {
    margin: var(--gap-lg) 0 0;
    padding: var(--gap-sm) var(--gap);
    background: var(--recessed);
    border-radius: var(--radius);
    color: var(--muted-bright);
    font-size: 13px;
  }

  .notice.danger {
    color: var(--danger);
  }

  .spacer {
    flex: 1;
    min-height: var(--gap-xl);
  }
</style>
