<script lang="ts">
  // Five slots with a raised centre action, the shape the reference uses.
  // The centre button performs the app's one real action rather than opening
  // a menu, so the most prominent control does the most useful thing.
  import { House, ClockCounterClockwise, ShieldCheck, ChartDonut, Plus } from 'phosphor-svelte'
  import { route, navigate } from '../lib/router'

  let { onAction, actionEnabled = false }: { onAction?: () => void; actionEnabled?: boolean } =
    $props()

  const r = $derived($route)
  const active = (n: string) => n === r.name || (n === 'float' && r.name === 'home')
</script>

<nav class="bar">
  <button class="slot" class:on={active('float')} onclick={() => navigate('/')}>
    <House size={22} weight={active('float') ? 'fill' : 'regular'} />
    <span>Home</span>
  </button>

  <button class="slot" class:on={active('activity')} onclick={() => navigate('/activity')}>
    <ClockCounterClockwise size={22} weight={active('activity') ? 'fill' : 'regular'} />
    <span>History</span>
  </button>

  <button class="fab" disabled={!actionEnabled} onclick={() => onAction?.()} aria-label="Rebalance">
    <Plus size={24} weight="bold" />
  </button>

  <button class="slot" class:on={active('validators')} onclick={() => navigate('/validators')}>
    <ShieldCheck size={22} weight={active('validators') ? 'fill' : 'regular'} />
    <span>Validator</span>
  </button>

  <button class="slot" onclick={() => navigate('/')}>
    <ChartDonut size={22} />
    <span>Insight</span>
  </button>
</nav>

<style>
  .bar {
    position: fixed;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    z-index: 10;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    align-items: center;
    width: 100%;
    max-width: 520px;
    padding: 10px var(--gap) calc(10px + env(safe-area-inset-bottom));
    background: var(--card);
    border-radius: var(--r-card) var(--r-card) 0 0;
    box-shadow: 0 -1px 0 var(--hairline), 0 -10px 30px rgba(31, 35, 72, 0.06);
  }

  .slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    min-height: var(--tap);
    color: var(--ink-3);
    font-size: 11px;
  }

  .slot.on {
    color: var(--ink);
    font-weight: 600;
  }

  .slot:active {
    opacity: 0.55;
  }

  .fab {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    margin: 0 auto;
    background: var(--tint);
    color: #fff;
    border-radius: 50%;
    /* Tight, colour-matched, single direction. Not a bloom. */
    box-shadow: var(--shadow-lift);
    transition: transform 140ms ease, opacity 140ms ease;
  }

  .fab:active:not(:disabled) {
    transform: scale(0.94);
  }

  .fab:disabled {
    background: var(--ink-3);
    box-shadow: none;
    opacity: 0.45;
  }
</style>
