<script lang="ts">
  // Real navigation with a sliding indicator tied to the active tab.
  // The indicator is the active state: no dot tacked under the label.
  import { route, navigate } from '../lib/router'

  const TABS = [
    { name: 'float', path: '/', label: 'Balance' },
    { name: 'activity', path: '/activity', label: 'Activity' },
    { name: 'validators', path: '/validators', label: 'Validator' },
  ] as const

  const r = $derived($route)
  const index = $derived(
    Math.max(
      0,
      TABS.findIndex((t) => t.name === r.name || (t.name === 'float' && r.name === 'home')),
    ),
  )
</script>

<nav class="tabs" style="--i: {index}; --n: {TABS.length}">
  <span class="indicator" aria-hidden="true"></span>
  {#each TABS as tab}
    <button
      class="tab"
      class:active={tab.name === r.name || (tab.name === 'float' && r.name === 'home')}
      onclick={() => navigate(tab.path)}
    >
      {tab.label}
    </button>
  {/each}
</nav>

<style>
  .tabs {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    max-width: 480px;
    width: 100%;
    margin: 0 auto;
    padding: 6px;
    background: var(--surface);
    border-radius: var(--radius);
  }

  .indicator {
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: 6px;
    width: calc((100% - 12px) / var(--n));
    background: var(--recessed);
    border-radius: 8px;
    transform: translateX(calc(var(--i) * 100%));
    transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .tab {
    position: relative;
    z-index: 1;
    min-height: 40px;
    color: var(--muted);
    font-size: 14px;
    transition: color 200ms ease;
  }

  .tab.active {
    color: var(--ink);
    font-weight: 600;
  }

  @media (prefers-reduced-motion: reduce) {
    .indicator {
      transition: none;
    }
  }
</style>
