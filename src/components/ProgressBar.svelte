<script lang="ts">
  // The signature element. The filled portion is divided into one segment per
  // contributor, so the bar IS the contributor list -- social proof and
  // progress in a single object. Not a generic progress bar.
  import { fillRatio } from '../lib/units'

  let {
    segments = [] as number[], // contribution amounts in Luna, newest first
    goalLuna = 0,
    height = 12,
  }: { segments?: number[]; goalLuna?: number; height?: number } = $props()

  const raised = $derived(segments.reduce((a, b) => a + b, 0))
  const ratio = $derived(fillRatio(raised, goalLuna))

  // Each segment's width as a percentage of the whole track. Tiny
  // contributions still get a visible sliver so nobody disappears.
  const widths = $derived(
    goalLuna > 0
      ? segments.map((s) => Math.max(0.8, (s / goalLuna) * 100))
      : [],
  )
</script>

<div
  class="track"
  style="--h: {height}px"
  role="progressbar"
  aria-valuenow={Math.round(ratio * 100)}
  aria-valuemin="0"
  aria-valuemax="100"
>
  {#each widths as w}
    <span class="seg" style="width: {w}%"></span>
  {/each}
</div>

<style>
  .track {
    display: flex;
    gap: 2px;
    width: 100%;
    height: var(--h);
    background: var(--recessed);
    border-radius: 999px;
    overflow: hidden;
  }

  .seg {
    display: block;
    height: 100%;
    background: var(--amber);
    border-radius: 999px;
    /* Grows when a new contribution lands. Width, not scaleX, so the rounded
       caps stay round throughout the transition. */
    transition: width 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
</style>
