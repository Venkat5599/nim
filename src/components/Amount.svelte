<script lang="ts">
  // The display typography of this app is the number itself, not a typeface.
  import { formatNim } from '../lib/units'
  import { locale } from '../lib/i18n'

  let {
    luna = 0,
    currency = 'NIM',
    size = 'hero',
  }: { luna?: number; currency?: string; size?: 'hero' | 'row' | 'inline' } = $props()
</script>

<span class="amount tabular {size}">
  {formatNim(luna, locale)}<span class="unit">{currency}</span>
</span>

<style>
  .amount {
    color: var(--tint);
    font-weight: 700;
    letter-spacing: -0.02em;
    white-space: nowrap;
  }

  .unit {
    margin-left: 0.28em;
    font-size: 0.52em;
    font-weight: 600;
    letter-spacing: 0;
  }

  .hero {
    font-size: 44px;
    line-height: 1.05;
  }

  .row {
    font-size: 18px;
    font-weight: 600;
  }

  .inline {
    font-size: inherit;
    font-weight: 600;
  }
</style>
