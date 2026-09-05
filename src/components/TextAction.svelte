<script lang="ts">
  // Secondary actions are plain text. No outlined "ghost" button next to the
  // filled one -- that pairing is the stock template.
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
    color: var(--muted-bright);
    font-size: 16px;
    text-align: center;
  }

  .text-action:active {
    color: var(--ink);
  }
</style>
