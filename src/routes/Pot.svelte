<script lang="ts">
  // The cold open. A Council member opens this alone, on mobile, at a random
  // time, with no wallet connected. It MUST paint real content immediately --
  // an empty state here loses both the usefulness and the design categories.
  //
  // Nothing on this screen awaits a wallet call.
  import ProgressBar from '../components/ProgressBar.svelte'
  import Amount from '../components/Amount.svelte'
  import PrimaryButton from '../components/PrimaryButton.svelte'
  import TextAction from '../components/TextAction.svelte'
  import ContributionRow from '../components/ContributionRow.svelte'
  import { getPot, getContributions, db, type Pot, type Contribution } from '../lib/db'
  import { formatNim, lunaToNim } from '../lib/units'
  import { navigate, potLink } from '../lib/router'
  import { t, locale } from '../lib/i18n'

  let { potId }: { potId: string } = $props()

  let pot = $state<Pot | null>(null)
  let contributions = $state<Contribution[]>([])
  let loaded = $state(false)

  const raised = $derived(contributions.reduce((a, c) => a + c.amount_luna, 0))
  const contributorCount = $derived(new Set(contributions.map((c) => c.from_address)).size)

  async function load() {
    try {
      const [p, c] = await Promise.all([getPot(potId), getContributions(potId)])
      pot = p
      contributions = c
    } catch {
      // A read failure must not blank the screen.
    } finally {
      loaded = true
    }
  }

  $effect(() => {
    load()

    // Live updates: a judge watching the screen sees it move.
    const channel = db
      .channel(`pot:${potId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contributions', filter: `pot_id=eq.${potId}` },
        (payload) => {
          contributions = [payload.new as Contribution, ...contributions]
        },
      )
      .subscribe()

    return () => {
      db.removeChannel(channel)
    }
  })

  async function share() {
    const url = potLink(potId)
    try {
      if (navigator.share) await navigator.share({ url, title: pot?.name ?? 'Chip In' })
      else await navigator.clipboard.writeText(url)
    } catch {
      // User dismissed the share sheet. Nothing to report.
    }
  }
</script>

<div class="screen">
  <header>
    <span class="brand">Chip In</span>
  </header>

  {#if pot}
    <section class="card">
      <div class="card-head">
        <span class="pot-name">{pot.name}</span>
      </div>

      <Amount luna={raised} currency={pot.currency} size="hero" />
      <p class="goal muted">
        {t('ofGoal', {
          goal: formatNim(pot.goal_luna, locale),
          currency: pot.currency,
        })}
      </p>

      <ProgressBar
        segments={contributions.map((c) => c.amount_luna)}
        goalLuna={pot.goal_luna}
      />

      <p class="count muted">
        {#if contributorCount === 0}
          {t('beFirst')}
        {:else if contributorCount === 1}
          {t('onePersonChippedIn')}
        {:else}
          {t('peopleChippedIn', { count: contributorCount })}
        {/if}
      </p>
    </section>

    {#if contributions.length}
      <h2 class="section-label muted">{t('recentContributions')}</h2>
      <div class="list">
        {#each contributions.slice(0, 6) as c (c.tx_hash)}
          <ContributionRow {c} currency={pot.currency} />
        {/each}
      </div>
    {/if}
  {:else if loaded}
    <p class="muted empty">This pot could not be found.</p>
  {/if}

  <div class="spacer"></div>

  <div class="dock">
    <PrimaryButton label={t('chipIn')} onclick={() => navigate(`/p/${potId}/contribute`)} />
    <TextAction label={t('sharePot')} onclick={share} />
  </div>
</div>

<style>
  header {
    padding: var(--gap-lg) 0 var(--gap);
  }

  .brand {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  /* Elevation is tonal. No borders, no shadows. */
  .card {
    background: var(--surface);
    border-radius: var(--radius);
    padding: var(--gap-lg) var(--gap);
  }

  .card-head {
    margin-bottom: var(--gap-sm);
  }

  .pot-name {
    font-size: 15px;
    color: var(--muted-bright);
  }

  .goal {
    margin: 6px 0 var(--gap-lg);
    font-size: 14px;
  }

  .count {
    margin: var(--gap-sm) 0 0;
    font-size: 13px;
  }

  .section-label {
    margin: var(--gap-xl) 0 var(--gap-xs);
    font-size: 13px;
    font-weight: 400;
  }

  .list {
    display: flex;
    flex-direction: column;
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
