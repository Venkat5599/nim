<script lang="ts">
  import Float from './routes/Float.svelte'
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

{#if r.name === 'float' || r.name === 'home'}
  <Float />
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
