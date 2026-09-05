<script lang="ts">
  import Float from './routes/Float.svelte'
  import Activity from './routes/Activity.svelte'
  import Validators from './routes/Validators.svelte'
  import TabBar from './components/TabBar.svelte'
  import Pot from './routes/Pot.svelte'
  import Contribute from './routes/Contribute.svelte'
  import NewPot from './routes/NewPot.svelte'
  import MyPots from './routes/MyPots.svelte'
  import { route, PUBLIC_POT } from './lib/router'
  import { getAddress } from './lib/nimiq'
  import { recordOpen, hasBackend } from './lib/db'

  // Unique-wallet counting for the Real Usage category. Deliberately fired
  // after first paint and fully non-blocking: the cold open must never wait
  // on a wallet permission dialog.
  $effect(() => {
    if (!hasBackend) return
    const id = setTimeout(async () => {
      try {
        const address = await getAddress()
        if (address) await recordOpen(address)
      } catch {
        // Counting is best-effort and never surfaces to the user.
      }
    }, 2500)
    return () => clearTimeout(id)
  })

  const r = $derived($route)
</script>

<main class="app">
  {#key r.name}
    <div class="page">
      {#if r.name === 'float' || r.name === 'home'}
        <Float />
      {:else if r.name === 'activity'}
        <Activity />
      {:else if r.name === 'validators'}
        <Validators />
      {:else if r.name === 'contribute'}
  <Contribute potId={r.potId} />
{:else if r.name === 'pot'}
  <Pot potId={r.potId} />
{:else if r.name === 'new'}
  <NewPot />
{:else if r.name === 'mine'}
  <MyPots />
      {:else}
        <Float />
      {/if}
    </div>
  {/key}
</main>

<TabBar />

<style>
  .app {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-bottom: 96px; /* clears the tab dock */
  }

  .page {
    flex: 1;
    display: flex;
    flex-direction: column;
    animation: enter 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  /* Entry animates position only. Content is fully opaque from frame one, so
     a stalled animation can never leave the screen blank. */
  @keyframes enter {
    from { transform: translateY(6px); }
    to   { transform: none; }
  }


  @media (prefers-reduced-motion: reduce) {
    .page { animation: none; }
  }
</style>
