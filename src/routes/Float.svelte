<script lang="ts">
  // Float's one screen.
  //
  // The user sets a single number: how much NIM to keep spendable. Everything
  // above it works. Everything the protocol makes awkward -- the two-phase
  // retire-then-remove withdrawal -- is handled here so the user never has to
  // know the word "retire".
  import Amount from '../components/Amount.svelte'
  import PrimaryButton from '../components/PrimaryButton.svelte'
  import TextAction from '../components/TextAction.svelte'
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
    EMPTY_STAKER,
    type StakerState,
    type Plan,
  } from '../lib/staking'
  import { runTx, payment, resetPayment } from '../lib/payment'
  import { formatNim, nimToLuna, lunaToNim } from '../lib/units'
  import { locale } from '../lib/i18n'

  const MIN_MOVE_LUNA = nimToLuna(10)
  const FLOOR_KEY = 'float:floor'

  // Demo figures so the screen is legible before a wallet is connected. The
  // cold open must never be an empty shell.
  const DEMO_LIQUID = nimToLuna(1840)
  const DEMO_STAKER: StakerState = {
    totalLuna: nimToLuna(6250),
    activeLuna: nimToLuna(6250),
    retiredLuna: 0,
    delegation: null,
  }

  let address = $state<string | null>(null)
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

  // Live figures when a wallet is connected, demo figures otherwise.
  const liquid = $derived(liquidLuna ?? DEMO_LIQUID)
  const stk = $derived(staker ?? DEMO_STAKER)
  const isLive = $derived(liquidLuna !== null && staker !== null)

  const totalLuna = $derived(liquid + stk.totalLuna)
  const floorLuna = $derived(nimToLuna(floorNim || 0))

  const plan = $derived<Plan>(
    planNextMove({
      liquidLuna: liquid,
      staker: stk,
      rule: { floorLuna, validator },
      // Conservative: without a verified read of the window, retired stake is
      // never assumed collectable. The user is told to come back instead.
      retiredReady: false,
      minMoveLuna: MIN_MOVE_LUNA,
    }),
  )

  const showState = $derived($payment.status !== 'idle')

  const pct = $derived((n: number) => (totalLuna > 0 ? (n / totalLuna) * 100 : 0))

  async function load() {
    const a = await getAddress()
    if (!a) return
    address = a
    const [b, s] = await Promise.all([readBalance(a), readStaker(a)])
    if (b === null || s === null) {
      // A failed read must never drive a rebalance. Say so and stop.
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
        return `You are holding more than your ${formatNim(floorLuna, locale)} NIM floor.`
      case 'retire':
        return 'This starts a waiting period before the NIM is spendable again.'
      case 'remove':
        return 'The waiting period is over. This returns it to your balance.'
      default:
        return p.reason
    }
  }

  async function execute() {
    if (plan.action === 'none' || busy) return
    if (!isLive) return
    busy = true
    try {
      const amount = plan.amountLuna
      await runTx(amount, () => {
        switch (plan.action) {
          case 'stake':
            return plan.isFirstTime
              ? startStaking(validator.trim(), amount)
              : addStake(amount)
          case 'retire':
            return retireStake(amount)
          case 'remove':
            return removeStake(amount)
          default:
            throw new Error('no action')
        }
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

    <section class="card">
      <p class="cap muted">Working for you</p>
      <Amount luna={stk.activeLuna} currency="NIM" size="hero" />

      <!-- Signature element: one bar, the whole balance, split by what each
           part is doing. Not a progress bar toward a goal. -->
      <div class="split" aria-hidden="true">
        <span class="seg working" style="width: {pct(stk.activeLuna)}%"></span>
        {#if stk.retiredLuna > 0}
          <span class="seg waiting" style="width: {pct(stk.retiredLuna)}%"></span>
        {/if}
        <span class="seg liquid" style="width: {pct(liquid)}%"></span>
      </div>

      <div class="legend">
        <span><i class="dot working"></i>Working {formatNim(stk.activeLuna, locale)}</span>
        {#if stk.retiredLuna > 0}
          <span><i class="dot waiting"></i>Waiting {formatNim(stk.retiredLuna, locale)}</span>
        {/if}
        <span><i class="dot liquid"></i>Spendable {formatNim(liquid, locale)}</span>
      </div>
    </section>

    <label class="rule">
      <span class="cap muted">Keep spendable</span>
      <div class="rule-input">
        <input
          class="tabular"
          type="text"
          inputmode="decimal"
          bind:value={floorNim}
          onchange={() => saveFloor(Number(floorNim))}
        />
        <span class="unit">NIM</span>
      </div>
    </label>

    {#if plan.action === 'stake' && plan.isFirstTime}
      <label class="rule">
        <span class="cap muted">Validator</span>
        <div class="rule-input">
          <input class="addr" bind:value={validator} placeholder="NQ..." spellcheck="false" />
        </div>
        <span class="hint muted">
          The validator you delegate to. Your NIM never leaves your account.
        </span>
      </label>
    {/if}

    <section class="next">
      <p class="plan-title">{planLabel(plan)}</p>
      <p class="plan-detail muted">{planExplain(plan)}</p>
    </section>

    {#if readFailed}
      <p class="warn">
        Could not read your balance from the network, so no move is suggested.
        Nothing has been changed.
      </p>
    {:else if !isLive}
      <p class="warn demo">
        Example figures. Connect inside Nimiq Pay to see your own balance.
      </p>
    {/if}

    {#if !isInsideNimiqPay()}
      <p class="hint muted center">Open this in Nimiq Pay to use your wallet</p>
    {/if}

    <ChainStatus />

    <div class="spacer"></div>

    <div class="dock">
      <PrimaryButton
        label={planLabel(plan)}
        disabled={plan.action === 'none' || busy || !isLive || needsValidator}
        onclick={execute}
      />
      {#if stk.retiredLuna > 0}
        <TextAction label="Why is some NIM waiting?" onclick={() => {}} />
      {/if}
    </div>
  </div>
{/if}

<style>
  header {
    padding: var(--gap-lg) 0 var(--gap);
  }

  .brand {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .card {
    background: var(--surface);
    border-radius: var(--radius);
    padding: var(--gap-lg) var(--gap);
  }

  .cap {
    display: block;
    margin: 0 0 6px;
    font-size: 13px;
  }

  .split {
    display: flex;
    gap: 2px;
    height: 12px;
    margin: var(--gap-lg) 0 var(--gap-sm);
    background: var(--recessed);
    border-radius: 999px;
    overflow: hidden;
  }

  .seg {
    height: 100%;
    border-radius: 999px;
    transition: width 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .seg.working,
  .dot.working {
    background: var(--amber);
  }

  .seg.waiting,
  .dot.waiting {
    background: var(--muted);
  }

  .seg.liquid,
  .dot.liquid {
    background: var(--muted-bright);
    opacity: 0.45;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--gap);
    font-size: 12px;
    color: var(--muted);
  }

  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 6px;
    border-radius: 2px;
  }

  .rule {
    display: block;
    margin-top: var(--gap-lg);
  }

  .rule-input {
    display: flex;
    align-items: center;
    gap: var(--gap-sm);
    min-height: 56px;
    padding: 0 var(--gap);
    background: var(--surface);
    border-radius: var(--radius);
  }

  .rule-input input {
    flex: 1;
    min-width: 0;
    color: var(--amber);
    font-size: 20px;
    font-weight: 600;
    outline: none;
  }

  .rule-input .addr {
    color: var(--ink);
    font-size: 16px;
    font-weight: 400;
  }

  .unit {
    color: var(--amber);
    font-weight: 600;
  }

  .next {
    margin-top: var(--gap-xl);
  }

  .plan-title {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .plan-detail {
    margin: 0;
    font-size: 14px;
  }

  .warn {
    margin: var(--gap-lg) 0 0;
    padding: var(--gap-sm) var(--gap);
    background: var(--recessed);
    border-radius: var(--radius);
    color: var(--danger);
    font-size: 13px;
  }

  .warn.demo {
    color: var(--muted-bright);
  }

  .hint {
    display: block;
    margin-top: var(--gap-xs);
    font-size: 13px;
  }

  .center {
    text-align: center;
  }

  .spacer {
    flex: 1;
    min-height: var(--gap-xl);
  }
</style>
