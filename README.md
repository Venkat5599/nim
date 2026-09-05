# Float

**Keep some NIM ready to spend. Put the rest to work.**

A Nimiq Pay mini app for rule-based NIM staking. You set one number, how much
you want to keep spendable, and Float works out the single next move: stake the
surplus, free up a shortfall, or collect stake whose waiting window has passed.

Built for the Nimiq Mini Apps Competition, Cycle II.

## Why this exists

Nimiq's protocol does not let you simply unstake. You **retire** stake, wait out
a reporting window, then **remove** it. People get stranded in the middle of
that sequence constantly. Handling it so the user never has to learn the word
"retire" is the product.

## Stack

- Next.js 15 (App Router, static export) with React 19 and TypeScript
- Zustand for the transaction state machine
- Phosphor for icons
- `@nimiq/mini-app-sdk` for wallet and chain access
- Bun as runtime and package manager

There is no server. The app talks only to providers Nimiq Pay injects into the
WebView, so it exports to static files and the cold open is a plain CDN fetch.

## Layout

```
frontend/          Next.js app
  app/             routes: balance, activity, validator
  components/      shell, tab bar, transaction status, chain status
  lib/             nimiq, staking, payment, units, activity
docs/              PRD and architecture
scripts/           tooling
```

## Running it

```bash
bun install
bun run dev
```

Open the dev URL on a phone that has Nimiq Pay installed, then load it as a mini
app. Browser-only testing will not exercise the native confirmation dialog,
which is where the important behaviour lives.

## Design notes

**The transaction state machine is the critical code.** Nimiq Pay's native
dialog backgrounds the WebView, so a promise-only implementation loses the
result and hangs. `lib/payment.ts` models idle, submitting, pending, success,
cancelled and failed explicitly, and reconciles on `visibilitychange` and
`pageshow`. It never resolves to success without a transaction hash.

**Reads never drive writes.** The SDK exposes no typed getter for balance or
staker state, so both go through the generic RPC passthrough. A failed read
returns `null` and blocks any rebalance rather than defaulting to zero, because
a zero from a failed read could retire stake the user never asked to touch.

**No custody, ever.** Float holds nothing. Every transaction is signed by the
user in Nimiq Pay and delegates to a validator of their choosing.

## Licence

MIT
