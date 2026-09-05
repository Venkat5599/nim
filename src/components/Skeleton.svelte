<script lang="ts">
  // Shape-matched placeholder. Never a spinner: the layout should not jump
  // when the real numbers arrive.
  let { w = '100%', h = 16, r = 6 }: { w?: string; h?: number; r?: number } = $props()
</script>

<span class="sk" style="width: {w}; height: {h}px; border-radius: {r}px"></span>

<style>
  .sk {
    display: block;
    background: linear-gradient(
      90deg,
      var(--surface) 0%,
      var(--surface-pressed) 50%,
      var(--surface) 100%
    );
    background-size: 200% 100%;
    animation: sweep 1400ms ease-in-out infinite;
  }

  @keyframes sweep {
    to {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sk {
      animation: none;
    }
  }
</style>
