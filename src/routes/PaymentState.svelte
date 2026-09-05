<script lang="ts">
  // Four states, one structure. Calm, sparse, identical rhythm so nothing
  // reads as an alarm. No toasts, no coloured banners, no illustrations.
  //
  // "Cancelled" is the state most apps get wrong. It says, unambiguously,
  // that the user still has their money.
  import Amount from '../components/Amount.svelte'
  import PrimaryButton from '../components/PrimaryButton.svelte'
  import TextAction from '../components/TextAction.svelte'
  import { payment, resetPayment, type PaymentState } from '../lib/payment'
  import { shortHash } from '../lib/nimiq'
  import { t } from '../lib/i18n'

  let {
    currency = 'NIM',
    onRetry = () => {},
    onDone = () => {},
  }: { currency?: string; onRetry?: () => void; onDone?: () => void } = $props()

  const s = $derived($payment)

  function title(p: PaymentState): string {
    switch (p.status) {
      case 'submitting': return t('confirmInPay')
      case 'pending':    return t('confirming')
      case 'success':    return t('sent')
      case 'cancelled':  return t('cancelled')
      case 'failed':     return t('didntGoThrough')
      default:           return ''
    }
  }

  function detail(p: PaymentState): string {
    switch (p.status) {
      case 'submitting': return t('approveToContinue')
      case 'pending':    return t('waitingNetwork')
      case 'success':    return t('contributionIn')
      case 'cancelled':  return t('noMoneyLeft')
      case 'failed':
        return p.reason === 'invalid'
          ? t('reasonInvalid')
          : p.reason === 'network'
            ? t('reasonNetwork')
            : t('reasonUnknown')
      default: return ''
    }
  }
</script>

<div class="screen state">
  <div class="middle">
    <!-- Bare marks. Never an icon inside a tile, circle or badge. -->
    {#if s.status === 'submitting' || s.status === 'pending'}
      <svg class="mark spin" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--recessed)" stroke-width="3" />
        <path d="M24 4 a20 20 0 0 1 20 20" fill="none" stroke="var(--amber)"
              stroke-width="3" stroke-linecap="round" />
      </svg>
    {:else if s.status === 'success'}
      <svg class="mark" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M12 25 l9 9 l16 -18" fill="none" stroke="var(--amber)"
              stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    {:else if s.status === 'cancelled'}
      <svg class="mark" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M15 15 l18 18 M33 15 l-18 18" fill="none" stroke="var(--muted)"
              stroke-width="3" stroke-linecap="round" />
      </svg>
    {:else if s.status === 'failed'}
      <svg class="mark" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 12 v16" fill="none" stroke="var(--danger)"
              stroke-width="3" stroke-linecap="round" />
        <circle cx="24" cy="35" r="2" fill="var(--danger)" />
      </svg>
    {/if}

    <h1>{title(s)}</h1>

    {#if s.status === 'success'}
      <div class="hero-amount">
        <Amount luna={s.amountLuna} {currency} size="hero" />
      </div>
    {/if}

    <p class="muted detail">{detail(s)}</p>

    {#if s.status === 'success'}
      <!-- Proof the contribution exists on chain, not just in our index. -->
      <p class="txhash muted tabular">{shortHash(s.txHash)}</p>
    {/if}
  </div>

  <div class="dock">
    {#if s.status === 'success'}
      <PrimaryButton label={t('backToPot')} onclick={onDone} />
    {:else if s.status === 'cancelled' || s.status === 'failed'}
      <PrimaryButton label={t('tryAgain')} onclick={() => { resetPayment(); onRetry() }} />
      <TextAction label={t('backToPot')} onclick={onDone} />
    {/if}
  </div>
</div>

<style>
  .state {
    text-align: center;
  }

  .middle {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--gap);
  }

  .mark {
    width: 48px;
    height: 48px;
    display: block;
  }

  .spin {
    animation: rot 900ms linear infinite;
    transform-origin: 50% 50%;
  }

  @keyframes rot {
    to { transform: rotate(360deg); }
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.015em;
  }

  .hero-amount {
    margin: var(--gap-xs) 0;
  }

  .txhash {
    margin: 0;
    font-size: 12px;
    opacity: 0.7;
  }

  .detail {
    margin: 0;
    font-size: 16px;
    max-width: 24ch;
  }
</style>
