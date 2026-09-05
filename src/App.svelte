<script lang="ts">
  import Pot from './routes/Pot.svelte'
  import Contribute from './routes/Contribute.svelte'
  import { route, PUBLIC_POT } from './lib/router'
  import { getAddress } from './lib/nimiq'
  import { recordOpen } from './lib/db'

  // Unique-wallet counting for the Real Usage category. Deliberately fired
  // after first paint and fully non-blocking: the cold open must never wait
  // on a wallet permission dialog.
  $effect(() => {
    const id = setTimeout(async () => {
      try {
        const address = await getAddress()
        if (address) await recordOpen(address)
      } catch {
        // Counting is best-effort and never surfaces to the user.
      }
    }, 2000)
    return () => clearTimeout(id)
  })

  const r = $derived($route)
</script>

{#if r.name === 'pot'}
  {#if location.pathname.endsWith('/contribute')}
    <Contribute potId={r.potId} />
  {:else}
    <Pot potId={r.potId} />
  {/if}
{:else}
  <Pot potId={PUBLIC_POT} />
{/if}
