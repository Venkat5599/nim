<script lang="ts">
  // One row of an inset grouped list. Label leading, value trailing in
  // secondary colour, optional chevron. The separator is inset from the
  // leading edge and omitted on the last row, as on iOS.
  import { CaretRight } from 'phosphor-svelte'

  let {
    label = '',
    value = '',
    tint = false,
    chevron = false,
    last = false,
    onclick,
    children,
  }: {
    label?: string
    value?: string
    tint?: boolean
    chevron?: boolean
    last?: boolean
    onclick?: () => void
    children?: any
  } = $props()

  const tag = $derived(onclick ? 'button' : 'div')
</script>

<svelte:element
  this={tag}
  class="row"
  class:last
  class:interactive={!!onclick}
  {onclick}
  role={onclick ? 'button' : undefined}
>
  <span class="label">{label}</span>
  <span class="trailing">
    {#if children}
      {@render children()}
    {:else}
      <span class="value" class:tint>{value}</span>
    {/if}
    {#if chevron}
      <CaretRight size={15} weight="bold" color="var(--label-3)" />
    {/if}
  </span>
</svelte:element>

<style>
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
    width: 100%;
    min-height: var(--tap);
    padding: 11px var(--gap);
    text-align: left;
    position: relative;
  }

  .row:not(.last)::after {
    content: "";
    position: absolute;
    left: var(--gap);
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--separator);
  }

  .interactive:active {
    background: var(--card-pressed);
  }

  .label {
    font-size: 17px;
    color: var(--label);
  }

  .trailing {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .value {
    color: var(--label-2);
    font-size: 17px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value.tint {
    color: var(--tint);
  }
</style>
