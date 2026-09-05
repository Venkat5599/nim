<script lang="ts">
  import PrimaryButton from '../components/PrimaryButton.svelte'
  import PaymentState from './PaymentState.svelte'
  import { getPot, type Pot } from '../lib/db'
  import { nimToLuna, formatNim } from '../lib/units'
  import { getAddress, isInsideNimiqPay, isPlaceholderAddress } from '../lib/nimiq'
  import { contribute, payment, resetPayment } from '../lib/payment'
  import { navigate } from '../lib/router'
  import { t, locale } from '../lib/i18n'

  let { potId }: { potId: string } = $props()

  let pot = $state<Pot | null>(null)
  let raw = $state('')
  let busy = $state(false)
  let error = $state('')

  const amount = $derived(Number.parseFloat(raw))
  const valid = $derived(Number.isFinite(amount) && amount > 0)
  const showState = $derived($payment.status !== 'idle')

  // The seeded demo pot points at an all-zero address. Approving a payment to
  // it destroys real NIM, so say so before the native dialog can open.
  const isDemoTarget = $derived(!!pot && isPlaceholderAddress(pot.beneficiary))

  $effect(() => {
    getPot(potId).then((p) => (pot = p)).catch(() => {})
  })

  const QUICK = [10, 50, 100, 500]

  async function send() {
    if (!pot || !valid || busy) return
    busy = true
    error = ''

    try {
      const address = await getAddress()
      if (!address) {
        // Declined the account dialog. Not an error, just nothing to do.
        busy = false
        return
      }

      await contribute({
        potId,
        beneficiary: pot.beneficiary,
        amountLuna: nimToLuna(amount),
        fromAddress: address,
      })
    } catch (e) {
      error = e instanceof RangeError ? e.message : t('reasonUnknown')
    } finally {
      busy = false
    }
  }
</script>

{#if showState}
  <PaymentState
    currency={pot?.currency ?? 'NIM'}
    onRetry={() => { raw = '' }}
    onDone={() => { resetPayment(); navigate(`/p/${potId}`) }}
  />
{:else}
  <div class="screen sheet">
    <div class="handle" aria-hidden="true"></div>

    {#if pot}
      <p class="pot-name muted">{pot.name}</p>
    {/if}

    <div class="entry">
      <!-- inputmode decimal gives the numeric keypad without a spinner -->
      <input
        class="amount-input tabular"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        placeholder="0"
        aria-label={t('amount')}
        bind:value={raw}
      />
      <span class="currency">{pot?.currency ?? 'NIM'}</span>
    </div>

    <div class="quick">
      {#each QUICK as q}
        <button class="quick-btn tabular" onclick={() => (raw = String(q))}>
          {formatNim(q * 100_000, locale)}
        </button>
      {/each}
    </div>

    {#if isDemoTarget}
      <p class="warn">
        Demo pot. This address cannot receive funds and anything you approve is
        destroyed. Tap send, then dismiss the Nimiq Pay dialog to test the
        cancel flow. Do not approve.
      </p>
    {:else}
      <p class="note muted">{t('directNote')}</p>
    {/if}

    {#if error}
      <p class="error">{error}</p>
    {/if}

    {#if !isInsideNimiqPay()}
      <p class="note muted">{t('openInNimiqPay')}</p>
    {/if}

    <div class="spacer"></div>

    <div class="dock">
      <PrimaryButton
        label={t('send', {
          amount: valid ? formatNim(nimToLuna(amount), locale) : '0',
          currency: pot?.currency ?? 'NIM',
        })}
        disabled={!valid || busy}
        onclick={send}
      />
    </div>
  </div>
{/if}

<style>
  .sheet {
    background: var(--surface);
    border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
    padding-top: var(--gap-sm);
  }

  .handle {
    width: 36px;
    height: 4px;
    margin: 0 auto var(--gap-lg);
    background: var(--muted);
    opacity: 0.4;
    border-radius: 999px;
  }

  .pot-name {
    margin: 0;
    text-align: center;
    font-size: 15px;
  }

  .entry {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 8px;
    margin: var(--gap-2xl) 0 var(--gap-xl);
  }

  .amount-input {
    width: 100%;
    max-width: 6ch;
    padding: 0;
    color: var(--amber);
    font-size: 48px;
    font-weight: 700;
    letter-spacing: -0.02em;
    text-align: right;
    caret-color: var(--amber);
    outline: none;
  }

  .amount-input::placeholder {
    color: var(--muted);
    opacity: 0.5;
  }

  .currency {
    color: var(--amber);
    font-size: 22px;
    font-weight: 600;
  }

  /* Plain tappable text, not pills, not a segmented control. */
  .quick {
    display: flex;
    justify-content: center;
    gap: var(--gap-lg);
  }

  .quick-btn {
    min-height: var(--tap);
    padding: 0 4px;
    color: var(--amber);
    font-size: 16px;
    font-weight: 600;
  }

  .quick-btn:active {
    color: var(--amber-pressed);
  }

  .note {
    margin: var(--gap-lg) 0 0;
    font-size: 13px;
    text-align: center;
  }

  .warn {
    margin: var(--gap-lg) 0 0;
    padding: var(--gap-sm) var(--gap);
    background: var(--recessed);
    border-radius: var(--radius);
    color: var(--danger);
    font-size: 13px;
    text-align: center;
  }

  .error {
    margin: var(--gap) 0 0;
    color: var(--danger);
    font-size: 14px;
    text-align: center;
  }

  .spacer {
    flex: 1;
    min-height: var(--gap-xl);
  }
</style>
