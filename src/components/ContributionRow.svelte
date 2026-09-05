<script lang="ts">
  import Amount from './Amount.svelte'
  import { shortAddress } from '../lib/units'
  import { t } from '../lib/i18n'
  import type { Contribution } from '../lib/db'

  let { c, currency = 'NIM' }: { c: Contribution; currency?: string } = $props()

  const who = $derived(c.display_name || shortAddress(c.from_address))

  function ago(iso: string): string {
    const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
    if (secs < 60) return 'just now'
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }
</script>

<div class="row">
  <div class="who">
    <span class="name">{who}</span>
    <span class="meta">
      {ago(c.created_at)}
      {#if !c.confirmed}<span class="dot">/</span>{t('pending')}{/if}
    </span>
  </div>
  <Amount luna={c.amount_luna} {currency} size="row" />
</div>

<style>
  /* Separated by spacing, never by hairline dividers. */
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
    padding: var(--gap-sm) 0;
  }

  .who {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .name {
    font-size: 16px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    font-size: 13px;
    color: var(--muted);
  }

  .dot {
    margin: 0 6px;
    opacity: 0.5;
  }
</style>
