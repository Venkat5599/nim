<script lang="ts">
  // iOS tab bar: translucent material, hairline top edge, icon above a small
  // label, tint colour marking the selected tab. No sliding pill, no dot.
  import { ChartPieSlice, ClockCounterClockwise, ShieldCheck } from 'phosphor-svelte'
  import { route, navigate } from '../lib/router'

  const TABS = [
    { name: 'float', path: '/', label: 'Balance', icon: ChartPieSlice },
    { name: 'activity', path: '/activity', label: 'Activity', icon: ClockCounterClockwise },
    { name: 'validators', path: '/validators', label: 'Validator', icon: ShieldCheck },
  ] as const

  const r = $derived($route)
  const isActive = (n: string) => n === r.name || (n === 'float' && r.name === 'home')
</script>

<nav class="tabbar">
  {#each TABS as tab}
    {@const active = isActive(tab.name)}
    <button class="tab" class:active onclick={() => navigate(tab.path)}>
      <tab.icon
        size={25}
        weight={active ? 'fill' : 'regular'}
        color={active ? 'var(--tint)' : 'var(--label-3)'}
      />
      <span>{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--chrome);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    box-shadow: inset 0 1px 0 var(--separator);
  }

  /* Where blur is unavailable the bar must still be opaque, never a
     see-through smear over scrolling content. */
  @supports not (backdrop-filter: blur(20px)) {
    .tabbar {
      background: var(--bg);
    }
  }

  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-height: 49px;
    padding: 7px 0 6px;
    color: var(--label-3);
    font-size: 10px;
    letter-spacing: 0.06px;
  }

  .tab.active {
    color: var(--tint);
    font-weight: 500;
  }

  .tab:active {
    opacity: 0.55;
  }
</style>
