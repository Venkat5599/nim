<script lang="ts">
  // Delegation control. Uses sendUpdateStakerTransaction, which moves an
  // existing stake to a different validator without unstaking first.
  import PrimaryButton from '../components/PrimaryButton.svelte'
  import PaymentState from './PaymentState.svelte'
  import { readValidators, rememberValidator, addActivity } from '../lib/activity'
  import { switchValidator, readStaker } from '../lib/staking'
  import { getAddress, shortAddressSafe } from '../lib/nimiq'
  import { runTx, payment, resetPayment } from '../lib/payment'

  let recent = $state<string[]>([])
  let current = $state<string | null>(null)
  let input = $state('')
  let busy = $state(false)

  const showState = $derived($payment.status !== 'idle')
  const valid = $derived(input.trim().length >= 10)

  $effect(() => {
    recent = readValidators()
    ;(async () => {
      const a = await getAddress()
      if (!a) return
      const s = await readStaker(a)
      current = s?.delegation ?? null
    })()
  })

  async function apply() {
    if (!valid || busy) return
    busy = true
    try {
      const target = input.trim()
      await runTx(0, async () => {
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
      busy = false
    }
  }
</script>

{#if showState}
  <PaymentState onRetry={() => {}} onDone={() => resetPayment()} />
{:else}
  <div class="screen">
    <header><h1>Validator</h1></header>

    <section class="current">
      <p class="label">Currently delegating to</p>
      <p class="value">{current ? shortAddressSafe(current) : 'Not delegating yet'}</p>
    </section>

    <label class="field">
      <span class="label">Move delegation to</span>
      <input class="addr" bind:value={input} placeholder="NQ..." spellcheck="false" />
      <span class="fine">
        Your stake keeps earning through the switch. Nothing is unstaked and
        nothing leaves your account.
      </span>
    </label>

    {#if recent.length}
      <section class="recent">
        <p class="label">Used before</p>
        {#each recent as v}
          <button class="recent-row" onclick={() => (input = v)}>
            {shortAddressSafe(v)}
          </button>
        {/each}
      </section>
    {/if}

    <div class="spacer"></div>

    <div class="dock">
      <PrimaryButton
        label="Move delegation"
        disabled={!valid || busy}
        onclick={apply}
      />
    </div>
  </div>
{/if}

<style>
  header {
    padding: var(--gap-lg) 0 var(--gap-lg);
  }

  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.015em;
  }

  .label {
    display: block;
    margin: 0 0 var(--gap-xs);
    color: var(--muted);
    font-size: 13px;
  }

  .current .value {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .field {
    display: block;
    margin-top: var(--gap-xl);
  }

  .addr {
    width: 100%;
    min-height: 52px;
    padding: 0 var(--gap);
    background: var(--surface);
    border-radius: var(--radius);
    outline: none;
  }

  .addr:focus {
    background: var(--surface-pressed);
  }

  .fine {
    display: block;
    margin-top: var(--gap-xs);
    color: var(--muted);
    font-size: 13px;
    max-width: 40ch;
  }

  .recent {
    margin-top: var(--gap-xl);
  }

  .recent-row {
    display: block;
    width: 100%;
    min-height: var(--tap);
    padding: 0 var(--gap);
    margin-bottom: var(--gap-xs);
    background: var(--surface);
    border-radius: var(--radius);
    text-align: left;
    font-size: 15px;
  }

  .recent-row:active {
    background: var(--surface-pressed);
  }

  .spacer {
    flex: 1;
    min-height: var(--gap-xl);
  }
</style>
