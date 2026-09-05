<script lang="ts">
  // Surfaces real chain state: consensus plus current block height.
  // This is the "beyond accepting a payment" signal -- the app reads the
  // Nimiq network, it does not just push a transfer at it.
  import { chainStatus } from '../lib/nimiq'

  let status = $state<{ consensus: boolean; height: number } | null>(null)

  $effect(() => {
    let alive = true
    const tick = async () => {
      const s = await chainStatus()
      if (alive) status = s
    }
    tick()
    // Nimiq blocks are fast; a slow poll is enough to show liveness.
    const id = setInterval(tick, 15000)
    return () => {
      alive = false
      clearInterval(id)
    }
  })
</script>

{#if status}
  <p class="chain muted tabular">
    {status.consensus ? 'Nimiq consensus established' : 'Syncing with Nimiq'}
    <span class="sep">/</span>
    block {status.height.toLocaleString()}
  </p>
{/if}

<style>
  .chain {
    margin: var(--gap) 0 0;
    font-size: 12px;
    text-align: center;
  }

  .sep {
    margin: 0 6px;
    opacity: 0.5;
  }
</style>
