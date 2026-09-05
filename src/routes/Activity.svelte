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
  <header><h1>Activity</h1></header>

  {#if entries.length}
    <ol class="list">
      {#each entries as e (e.txHash)}
        <li class="row">
          <div class="left">
            <span class="what">{describe(e.kind)}</span>
            <span class="meta tabular">{when(e.at)} / {shortHash(e.txHash)}</span>
          </div>
          {#if e.amountLuna > 0}
            <span class="amt tabular">{formatNim(e.amountLuna, locale)}</span>
          {/if}
        </li>
      {/each}
    </ol>
    <p class="fine">
      Built from transactions submitted through Float on this device. Each one
      is a real transaction hash you can verify on chain.
    </p>
  {:else if loaded}
    <div class="empty">
      <p class="empty-title">Nothing yet</p>
      <p class="fine">
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
  header {
    padding: var(--gap-lg) 0 var(--gap-lg);
  }

  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.015em;
  }

  .list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
    padding: var(--gap-sm) 0;
  }

  .left {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .what {
    font-size: 16px;
    font-weight: 500;
  }

  .meta {
    color: var(--muted);
    font-size: 12px;
  }

  .amt {
    color: var(--amber);
    font-size: 17px;
    font-weight: 600;
  }

  .empty {
    margin-top: var(--gap-2xl);
  }

  .empty-title {
    margin: 0 0 var(--gap-xs);
    font-size: 19px;
    font-weight: 600;
  }

  .fine {
    margin: var(--gap-lg) 0 0;
    color: var(--muted);
    font-size: 13px;
    max-width: 40ch;
  }

  .spacer {
    flex: 1;
    min-height: var(--gap-xl);
  }
</style>
