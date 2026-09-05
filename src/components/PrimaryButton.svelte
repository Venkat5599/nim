<script lang="ts">
  // Solid amber, dark navy text, 12px radius. Never a pill, never a gradient,
  // never a glow, and it does not lift on press -- the fill deepens instead.
  let {
    label = '',
    disabled = false,
    onclick = () => {},
  }: { label?: string; disabled?: boolean; onclick?: () => void } = $props()
</script>

<button class="cta" {disabled} {onclick}>{label}</button>

<style>
  .cta {
    width: 100%;
    min-height: var(--cta-height);
    padding: 0 var(--gap);
    background: var(--amber);
    color: var(--canvas);
    font-size: 16px;
    font-weight: 600;
    border-radius: var(--radius);
    transition: background 120ms ease;
  }

  .cta:active:not(:disabled) {
    background: var(--amber-pressed);
  }

  .cta:disabled {
    opacity: 0.4;
  }
</style>
