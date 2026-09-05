<script lang="ts">
  // Delegation control. Uses sendUpdateStakerTransaction, which moves an
  // existing stake to a different validator without unstaking first.
  import PrimaryButton from '../components/PrimaryButton.svelte'
  import PaymentState from './PaymentState.svelte'
  import Row from '../components/Row.svelte'
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
    <h1 class="large-title">Validator</h1>

    <div class="group">
      <Row
        label="Delegating to"
        value={current ? shortAddressSafe(current) : 'Not yet'}
        last
      />
    </div>

    <p class="group-header">Move delegation</p>
    <div class="group">
      <Row label="New validator" last>
        {#snippet children()}
          <input class="addr" bind:value={input} placeholder="NQ..." spellcheck="false" />
        {/snippet}
      </Row>
    </div>
    <p class="footnote">
      Your stake keeps earning through the switch. Nothing is unstaked and
      nothing leaves your account.
    </p>

    {#if recent.length}
      <p class="group-header">Used before</p>
      <div class="group">
        {#each recent as v, i}
          <Row
            label={shortAddressSafe(v)}
            chevron
            last={i === recent.length - 1}
            onclick={() => (input = v)}
          />
        {/each}
      </div>
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
  .addr {
    width: 100%;
    min-width: 0;
    color: var(--tint);
    font-size: 17px;
    text-align: right;
    outline: none;
  }

  .spacer {
    flex: 1;
    min-height: var(--gap-xl);
  }
</style>
