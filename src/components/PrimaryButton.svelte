<script lang="ts">
  // iOS filled button: full width, 10px radius, tint fill, dark label.
  // Presses dim rather than lift.
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
    background: var(--tint);
    color: #ffffff;
    font-size: 17px;
    font-weight: 600;
    border-radius: var(--r-control);
    transition: opacity 120ms ease;
  }

  .cta:active:not(:disabled) {
    opacity: 0.75;
  }

  .cta:disabled {
    opacity: 0.35;
  }
</style>
