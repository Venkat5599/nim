<script lang="ts">
  // Plain tinted text action, the iOS secondary.
  let {
    label = '',
    onclick = () => {},
  }: { label?: string; onclick?: () => void } = $props()
</script>

<button class="text-action" {onclick}>{label}</button>

<style>
  .text-action {
    display: block;
    width: 100%;
    min-height: var(--tap);
    color: var(--tint-deep);
    font-size: 17px;
    text-align: center;
  }

  .text-action:active {
    opacity: 0.55;
  }
</style>
