<script lang="ts">
  import { readActivity, describe, type Entry } from '../lib/activity'
  import { formatNim } from '../lib/units'
  import { shortHash } from '../lib/nimiq'
  import { locale } from '../lib/i18n'
  import { navigate } from '../lib/router'
  import PrimaryButton from '../components/PrimaryButton.svelte'

  let entries = $state<Entry[]>([])
  let loaded = $state(false)

  $effect(() => {
    entries = readActivity()
    loaded = true
  })

  function when(ts: number): string {
    const secs = Math.max(0, (Date.now() - ts) / 1000)
    if (secs < 60) return 'just now'
    const m = Math.floor(secs / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }
</script>

<div class="screen">
  <h1 class="large-title">Activity</h1>

  {#if entries.length}
    <div class="group">
      {#each entries as e, i (e.txHash)}
        <div class="row" class:last={i === entries.length - 1}>
          <div class="left">
            <span class="what">{describe(e.kind)}</span>
            <span class="meta tabular">{when(e.at)} / {shortHash(e.txHash)}</span>
          </div>
          {#if e.amountLuna > 0}
            <span class="amt tabular">{formatNim(e.amountLuna, locale)}</span>
          {/if}
        </div>
      {/each}
    </div>
    <p class="footnote">
      Built from transactions submitted through Float on this device. Each one
      is a real transaction hash you can verify on chain.
    </p>
  {:else if loaded}
    <div class="empty">
      <p class="empty-title">Nothing yet</p>
      <p class="footnote center">
        When you put NIM to work or free some up, it shows here with its
        transaction hash.
      </p>
    </div>
  {/if}

  <div class="spacer"></div>

  <div class="dock">
    <PrimaryButton label="Go to balance" onclick={() => navigate('/')} />
  </div>
</div>

<style>
  .row {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
    min-height: var(--tap);
    padding: 11px var(--gap);
  }

  .row:not(.last)::after {
    content: "";
    position: absolute;
    left: var(--gap);
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--hairline);
  }

  .left {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .what {
    font-size: 17px;
  }

  .meta {
    color: var(--ink-3);
    font-size: 13px;
  }

  .amt {
    color: var(--ink-2);
    font-size: 17px;
  }

  .empty {
    margin-top: var(--gap-2xl);
    text-align: center;
  }

  .empty-title {
    margin: 0 0 var(--gap-xs);
    font-size: 20px;
    font-weight: 600;
  }

  .center {
    text-align: center;
    max-width: 34ch;
    margin-left: auto;
    margin-right: auto;
  }

  .spacer {
    flex: 1;
    min-height: var(--gap-xl);
  }
</style>
