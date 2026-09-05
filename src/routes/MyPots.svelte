<script lang="ts">
  import ProgressBar from '../components/ProgressBar.svelte'
  import Amount from '../components/Amount.svelte'
  import PrimaryButton from '../components/PrimaryButton.svelte'
  import { listPots, getContributions, type Pot } from '../lib/db'
  import { navigate } from '../lib/router'
  import { getAddress } from '../lib/nimiq'
  import { t } from '../lib/i18n'

  type Row = { pot: Pot; segments: number[]; raised: number; backers: number }

  let rows = $state<Row[]>([])
  let loaded = $state(false)

  $effect(() => {
    ;(async () => {
      try {
        const address = await getAddress()
        const pots = await listPots(address ? [address] : [])
        rows = await Promise.all(
          pots.map(async (pot) => {
            const cs = await getContributions(pot.id)
            return {
              pot,
              segments: cs.map((c) => c.amount_luna),
              raised: cs.reduce((a, c) => a + c.amount_luna, 0),
              backers: new Set(cs.map((c) => c.from_address)).size,
            }
          }),
        )
      } catch {
        // Leave the list empty rather than showing an error wall.
      } finally {
        loaded = true
      }
    })()
  })
</script>

<div class="screen">
  <h1>{t('yourPots')}</h1>

  {#if rows.length}
    <div class="list">
      {#each rows as r (r.pot.id)}
        <button class="pot" onclick={() => navigate(`/p/${r.pot.id}`)}>
          <div class="top">
            <span class="name">{r.pot.name}</span>
            <Amount luna={r.raised} currency={r.pot.currency} size="row" />
          </div>
          <ProgressBar segments={r.segments} goalLuna={r.pot.goal_luna} height={8} />
          <div class="bottom muted">
            <span>{t('peopleChippedIn', { count: r.backers })}</span>
            {#if r.pot.repeat_interval}
              <span>{r.pot.repeat_interval === 'weekly' ? t('weekly') : t('monthly')}</span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {:else if loaded}
    <p class="empty muted">{t('noPots')}</p>
  {/if}

  <div class="spacer"></div>

  <div class="dock">
    <PrimaryButton label={t('newPot')} onclick={() => navigate('/new')} />
  </div>
</div>

<style>
  h1 {
    margin: var(--gap-lg) 0 var(--gap-lg);
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.015em;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);
  }

  .pot {
    display: block;
    width: 100%;
    padding: var(--gap);
    background: var(--surface);
    border-radius: var(--radius);
    text-align: left;
  }

  .pot:active {
    background: var(--surface-pressed);
  }

  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--gap);
    margin-bottom: var(--gap-sm);
  }

  .name {
    font-size: 16px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bottom {
    display: flex;
    justify-content: space-between;
    margin-top: var(--gap-xs);
    font-size: 13px;
  }

  .empty {
    margin-top: var(--gap-2xl);
    text-align: center;
  }

  .spacer {
    flex: 1;
    min-height: var(--gap-xl);
  }
</style>
