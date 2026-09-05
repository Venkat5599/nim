# Chip In — Architecture

Companion to `PRD.md`. Target: Nimiq Pay mini app, mobile webview, shipped by 2026-09-18.

---

## 1. Principles

1. **Never hold funds.** No custody, no escrow, no smart contracts. Contributions go wallet-to-beneficiary. Chip In is an index and a UI.
2. **The chain is the ledger.** Every contribution carries the pot ID on-chain via `sendBasicTransactionWithData`. The database is a cache that can be rebuilt from Nimiq.
3. **Render before wallet.** No screen waits on a wallet call to show content. The cold open is a public read.
4. **Every payment can be cancelled.** The cancel path is a first-class state, not an error branch.

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Vite + Svelte | Smallest runtime, fastest first paint on mobile data |
| Styling | Plain CSS with custom properties | No Tailwind runtime, tokens map 1:1 to DESIGN.md |
| State | Svelte stores | No external state library needed at this size |
| Backend | Supabase (Postgres + REST + Realtime) | Managed, free tier, realtime for the live pot |
| Chain access | `@nimiq/mini-app-sdk` + `window.ethereum` | Official providers injected by Nimiq Pay |
| Hosting | Vercel or Netlify static | HTTPS, instant deploys, required for deep links |
| Licence | MIT | Competition requirement |

## 3. Nimiq SDK surface (verified against nimiq.dev)

### Nimiq provider — `import { init } from '@nimiq/mini-app-sdk'`

| Method | Returns | Native confirm | Errors |
|---|---|---|---|
| `listAccounts()` | `string[]` | yes | `PermissionDeniedError` |
| `sign(message)` | `{ publicKey, signature }` | yes | `PermissionDeniedError` |
| `isConsensusEstablished()` | `boolean` | no | — |
| `getBlockNumber()` | `number` | no | — |
| `sendBasicTransaction({ recipient, value, fee?, validityStartHeight? })` | `string` txHash | yes | `PermissionDeniedError`, `InvalidTransactionError` |
| `sendBasicTransactionWithData({ recipient, value, data, fee?, validityStartHeight? })` | `string` txHash | yes | same |

**Units: 1 NIM = 100,000 Luna.** `value` is always Luna, integer. All conversion happens in one module (`lib/units.ts`) and nowhere else.

### Ethereum provider — `window.ethereum` (EIP-1193, EIP-6963)

`eth_requestAccounts`, `personal_sign`, `eth_sendTransaction`, `eth_signTypedData_v4`, `wallet_switchEthereumChain`.

USDT contributions are an ERC-20 `transfer` call built as `eth_sendTransaction` with encoded `data`. Chains: Ethereum, Base, Arbitrum, Optimism, BNB.

**USDT is P1.** NIM ships first. If the timeline compresses, USDT is the first cut.

## 4. On-chain contribution tagging

The mechanism that makes the pot verifiable without trusting our backend.

Every contribution is sent with:

```
data = "chipin:v1:" + potId
```

`potId` is a short base36 id (8 chars). Total payload stays well inside the basic transaction data limit.

**Consequences:**

- A pot's full contribution history is reconstructible by scanning the beneficiary address for transactions whose data matches the prefix. Our DB is not the source of truth.
- Each contribution row in the UI links to its transaction.
- The 25-pt category gets a real answer to "uses the Nimiq ecosystem beyond simply accepting a payment": on-chain provenance, consensus check, block height.

## 5. Data model

```
pots
  id              text primary key      -- 8-char base36, used in deep link and tx data
  name            text not null
  goal_luna       bigint not null
  currency        text not null         -- 'NIM' | 'USDT'
  beneficiary     text not null         -- IMMUTABLE after insert, enforced by trigger
  creator_address text not null
  is_public       boolean default false -- community pot is the only true one at launch
  repeat_interval text                  -- null | 'weekly' | 'monthly'
  parent_pot_id   text references pots(id)
  created_at      timestamptz default now()

contributions
  tx_hash         text primary key      -- chain is the ledger; hash is the natural key
  pot_id          text references pots(id)
  from_address    text not null
  amount_luna     bigint not null
  display_name    text
  confirmed       boolean default false
  created_at      timestamptz default now()

app_opens
  address         text
  day             date
  primary key (address, day)            -- unique-wallet counting for the 15-pt category
```

**`beneficiary` immutability is enforced in the database**, not the client. A `BEFORE UPDATE` trigger raises if the column changes. This is a scored trust property (PRD F4) and must not be defendable only in UI code.

**Row Level Security:** anon key may `select` all pots and contributions, `insert` pots and contributions, and `update` nothing. No client can mutate an existing row.

## 6. Payment state machine

The highest-leverage code in the project. Nimiq Pay's native dialog **backgrounds the webview**; a promise-only implementation loses results and hangs.

```
   idle
     |  user taps send
     v
 submitting  ---->  cancelled        (PermissionDeniedError)
     |              "No money left your wallet"
     |  txHash returned
     v
  pending    ---->  failed           (InvalidTransactionError, timeout)
     |
     |  confirmed on chain
     v
  success
```

**Resume handling.** On `visibilitychange` to visible, if state is `submitting` or `pending`, re-poll before rendering anything terminal. Never resolve to `success` from a stale promise alone.

```ts
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return
  if (state === 'submitting' || state === 'pending') void reconcile()
})
```

**Error mapping — no raw errors ever reach the user:**

| Thrown | State | Message |
|---|---|---|
| `PermissionDeniedError` | `cancelled` | "Cancelled — no money left your wallet" |
| `InvalidTransactionError` | `failed` | "Something was wrong with the transaction" |
| network / timeout | `failed` | "Couldn't reach the network" |
| unknown | `failed` | "Didn't go through" |

**Verification requirement:** the `cancelled` state must be reproduced by dismissing the real native dialog on a physical device. Desktop emulation does not exercise the backgrounding behaviour and therefore does not count as tested.

## 7. Screens and routes

| Route | Screen | Wallet required to render |
|---|---|---|
| `/` | Public community pot (cold open) | **no** |
| `/p/:potId` | Pot detail, deep link target | **no** |
| `/p/:potId/contribute` | Contribute sheet | on send only |
| `/new` | Create pot | on submit only |
| `/mine` | My pots | yes |

Deep links use the `https://` form so they open directly in Nimiq Pay from any chat app.

## 8. Mobile webview requirements

- `100dvh` / `100svh`, never `100vh`
- Primary action padded by `env(safe-area-inset-bottom)`
- Touch targets at least 44px; primary button at least 52px
- Inputs at least 16px font to prevent iOS auto-zoom
- `overscroll-behavior: contain`
- No hover-dependent affordances
- `font-variant-numeric: tabular-nums` on every amount
- Locale from `window.nimiqPay.language` mapped to en / es / pt

## 9. Performance budget

Cold open on mobile data, no wallet connected:

| Metric | Budget |
|---|---|
| JS bundle, gzipped | under 60 kB |
| First contentful paint | under 1.0 s |
| Public pot fully rendered | under 1.5 s |

The public pot's last-known state is inlined into the HTML at build time so the screen paints before any network request resolves. Realtime updates hydrate on top.

## 10. Structure

```
src/
  lib/
    nimiq.ts        SDK init, accounts, sign, send. Only file importing the SDK.
    evm.ts          window.ethereum, ERC-20 transfer encoding. P1.
    units.ts        NIM <-> Luna. Only file doing unit maths.
    payment.ts      State machine, visibilitychange resume, error mapping.
    db.ts           Supabase client and queries.
    i18n.ts         window.nimiqPay.language, en/es/pt strings.
  components/
    ProgressBar.svelte      Segmented contributor bar (signature element)
    Amount.svelte           Tabular-figure display amount
    PrimaryButton.svelte    Full-width amber, safe-area anchored
    ContributionRow.svelte
    Sheet.svelte
  routes/
    Home.svelte  Pot.svelte  Contribute.svelte  NewPot.svelte  MyPots.svelte
    PaymentState.svelte      pending / success / cancelled / failed
  styles/tokens.css          DESIGN.md tokens as custom properties
```

## 11. Design tokens (reconciled)

`stitch_nimiq_chip_in_ui/nimiq_chip_in/DESIGN.md` ships two conflicting palettes: the YAML frontmatter (`#0b0f34`, `#ffd062`) and the prose (`#1F2348`, `#E9B213`). **The prose palette is canonical** — it matches Nimiq's brand navy and gold. `styles/tokens.css` is the single source of truth.

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#1F2348` | Page background |
| `--surface` | `#282C55` | Cards, sheets, inputs |
| `--recessed` | `#171A37` | Empty progress track, pressed inputs |
| `--amber` | `#E9B213` | Amounts, progress segments, primary button |
| `--ink` | `#FFFFFF` | Primary text |
| `--muted` | `#8E92B2` | Secondary text, timestamps, hints |
| `--danger` | `#E05252` | Failed state only |
| `--radius` | `12px` | Buttons, cards, inputs |

Corrections applied to the Stitch output:

- Remove the amber circle behind the account icon (banned: icon in a coloured container)
- Force the system font stack; the Stitch render fell back to a serif
- Drop the Members and History tabs; out of scope, and they dilute the one-screen focus

## 12. Security

- No private keys, no seed material, ever. The wallet does all cryptography.
- Supabase anon key is public by design; safety comes from RLS, not from hiding it.
- No secrets in the repo. `.env` is gitignored; `.env.example` is committed.
- Beneficiary immutability enforced by database trigger.
- Contribution rows are written from the client but reconciled against the chain by `tx_hash`; unverifiable rows are never shown as confirmed.
- No analytics SDKs, no third-party scripts, no user data collection beyond the pseudonymous address needed to count unique opens.

## 13. Known constraints

- **No auto-debit.** Every payment requires native confirmation. "Recurring" means a recurring prompt. The UI must say so in plain language.
- **No push notifications.** The framework exposes none. Reminders are in-app only.
- **Contribution rows are optimistic** until chain-confirmed; the UI distinguishes the two.
