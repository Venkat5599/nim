<script lang="ts">
  import PrimaryButton from '../components/PrimaryButton.svelte'
  import { createPot } from '../lib/db'
  import { nimToLuna } from '../lib/units'
  import { getAddress } from '../lib/nimiq'
  import { navigate } from '../lib/router'
  import { t } from '../lib/i18n'

  let name = $state('')
  let goal = $state('')
  let beneficiary = $state('')
  let repeat = $state<'once' | 'weekly' | 'monthly'>('once')
  let busy = $state(false)
  let error = $state('')

  const goalNum = $derived(Number.parseFloat(goal))
  const valid = $derived(
    name.trim().length > 0 &&
      Number.isFinite(goalNum) &&
      goalNum > 0 &&
      beneficiary.trim().length > 10,
  )

  function newId(): string {
    return Math.random().toString(36).slice(2, 10)
  }

  async function paste() {
    try {
      beneficiary = await navigator.clipboard.readText()
    } catch {
      // Clipboard permission denied. The user can still type it.
    }
  }

  async function submit() {
    if (!valid || busy) return
    busy = true
    error = ''
    try {
      const creator = (await getAddress()) ?? 'unknown'
      const id = newId()
      await createPot({
        id,
        name: name.trim(),
        goal_luna: nimToLuna(goalNum),
        currency: 'NIM',
        beneficiary: beneficiary.trim(),
        creator_address: creator,
        is_public: false,
        repeat_interval: repeat === 'once' ? null : repeat,
      })
      navigate(`/p/${id}`)
    } catch (e) {
      error = e instanceof RangeError ? e.message : t('reasonUnknown')
    } finally {
      busy = false
    }
  }
</script>

<div class="screen">
  <h1>{t('newPot')}</h1>

  <label class="field">
    <span class="label muted">{t('whatFor')}</span>
    <input class="input" bind:value={name} placeholder="Team lunch" maxlength="80" />
  </label>

  <label class="field">
    <span class="label muted">{t('goalAmount')}</span>
    <div class="input row">
      <input
        class="bare tabular amount"
        type="text"
        inputmode="decimal"
        bind:value={goal}
        placeholder="0"
      />
      <span class="unit">NIM</span>
    </div>
  </label>

  <label class="field">
    <span class="label muted">{t('whoGetsPaid')}</span>
    <div class="input row">
      <input class="bare" bind:value={beneficiary} placeholder="NQ..." spellcheck="false" />
      <button class="paste" onclick={paste} type="button">{t('paste')}</button>
    </div>
    <span class="hint muted">{t('lockedNote')}</span>
  </label>

  <div class="field">
    <span class="label muted">{t('repeats')}</span>
    <div class="options">
      {#each [['once', t('once')], ['weekly', t('weekly')], ['monthly', t('monthly')]] as [value, text]}
        <button
          class="option"
          class:active={repeat === value}
          onclick={() => (repeat = value as typeof repeat)}
          type="button"
        >
          {text}
        </button>
      {/each}
    </div>
    {#if repeat !== 'once'}
      <span class="hint muted">{t('repeatNote')}</span>
    {/if}
  </div>

  {#if error}<p class="error">{error}</p>{/if}

  <div class="spacer"></div>

  <div class="dock">
    <PrimaryButton label={t('createPot')} disabled={!valid || busy} onclick={submit} />
  </div>
</div>

<style>
  h1 {
    margin: var(--gap-lg) 0 var(--gap-lg);
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.015em;
  }

  .field {
    display: block;
    margin-bottom: var(--gap-lg);
  }

  .label {
    display: block;
    margin-bottom: var(--gap-xs);
    font-size: 13px;
  }

  /* Solid surface, no outlined box. */
  .input {
    display: flex;
    align-items: center;
    gap: var(--gap-sm);
    width: 100%;
    min-height: 56px;
    padding: 0 var(--gap);
    background: var(--surface);
    border-radius: var(--radius);
    outline: none;
  }

  .input:focus-within {
    background: var(--surface-pressed);
  }

  .bare {
    flex: 1;
    min-width: 0;
    outline: none;
  }

  .amount {
    color: var(--amber);
    font-size: 20px;
    font-weight: 600;
  }

  .unit {
    color: var(--amber);
    font-weight: 600;
  }

  .paste {
    min-height: var(--tap);
    color: var(--muted-bright);
    font-size: 15px;
  }

  .hint {
    display: block;
    margin-top: var(--gap-xs);
    font-size: 13px;
  }

  /* Plain text options, not pills and not a dropdown. */
  .options {
    display: flex;
    gap: var(--gap-lg);
  }

  .option {
    min-height: var(--tap);
    color: var(--muted);
    font-size: 16px;
  }

  .option.active {
    color: var(--ink);
    font-weight: 600;
  }

  .error {
    color: var(--danger);
    font-size: 14px;
  }

  .spacer {
    flex: 1;
    min-height: var(--gap-xl);
  }
</style>
