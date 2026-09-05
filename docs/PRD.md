# Chip In — Product Requirements Document

**Nimiq Mini Apps Competition, Cycle II**
Submission deadline: 2026-09-18, 23:59 UTC. Evaluation is live, unannounced, after the deadline.

---

## 1. Summary

Chip In is a group money pot that lives inside Nimiq Pay. Someone creates a pot with a
goal and a fixed beneficiary address, shares a link, and everyone watches contributions
land in real time.

Contributions go **directly from contributor to beneficiary**. Chip In never holds,
routes, or escrows funds. It is a coordination and verification layer over peer-to-peer
payments that were always peer-to-peer.

## 2. Problem

Splitting and pooling money with other people is a universal, recurring problem.
Splitwise has over 10 million users and cannot settle a single payment — it hands you a
number and tells you to go find another app. Rotating savings groups (tandas, chit funds,
susus) serve hundreds of millions of people worldwide on spreadsheets, paper, and trust.

Cross-border makes it worse. Four friends in three countries splitting a trip cost pay
FX spreads, wait days for transfers, or give up and let one person eat the cost.

Nimiq Pay users already hold NIM and USDT and already have a wallet. The settlement
problem is solved for them the moment a coordination layer exists.

## 3. Target users

**Primary:** existing Nimiq Pay users in friend groups, households, and small teams who
already hold NIM or USDT.

**Secondary:** the Nimiq community itself — community funds, tipping pools, shared
sponsorships, meetup costs.

**Explicitly not:** DAOs, treasuries, charities at scale, or anything requiring custody,
KYC, or legal fund administration.

## 4. Scoring alignment

The competition scorecard is the product spec. Every feature below traces to points.

| Category | Pts | How Chip In earns it |
|---|---|---|
| Functionality, reliability, usefulness | 45 | Recurring real-world need, clear audience, recurring pots give a reason to return, no other Cycle II entry does group money |
| Nimiq Pay & Nimiq integration | 25 | Payment is the only action in the app; on-chain tagged contributions; explicit success / failure / cancellation handling; NIM and USDT |
| Real usage | 15 | Public community pot + Skool post; target 25+ unique wallets |
| Design & UX | 10 | One screen, one action, comprehensible in under 60 seconds |
| Builder promotion | 5 | Skool post + public social post |

**Target: 87–95.**

## 5. The cold open (highest-priority requirement)

A Community Council member will open this app **alone, on mobile, at a random unannounced
time after September 18**, with no context and no other users present.

Every group-money app fails here by rendering an empty list. Chip In must not.

**Requirement:** the app's landing screen is a **live public community pot** that is
always running, always funded, and always populated with real contributions. A first-time
visitor sees real names, real NIM, and a moving progress bar before they interact with
anything.

This screen must render meaningful content **before any wallet call resolves**. Wallet
connection is never a precondition for seeing the app work.

## 6. Features

### F1 — Public pot landing screen (P0)
Live community pot rendered on load. Amount raised as the display element, segmented
progress bar where each contributor is a distinct segment, four most recent contributions,
one primary action: "Chip in".

*Acceptance:* renders full content in under 1s on a cold load over mobile data, with no
wallet connected and no account permission granted.

### F2 — Contribute (P0)
Bottom sheet. Amount input, NIM/USDT toggle, quick amounts, the trust line
("Goes directly to the pot address. Chip In never holds your money."), one send button.

*Acceptance:* a contribution completes end to end inside Nimiq Pay on a real Android and
a real iOS device.

### F3 — Payment state handling (P0, highest scoring leverage)
Four explicit states: pending, success, **cancelled**, failed. The cancelled state is
reached when the user dismisses Nimiq Pay's native confirmation dialog.

*Acceptance:* dismissing the native dialog returns the user to a screen that says
"Cancelled — no money left your wallet", never a spinner, never a hang, never a false
success. Verified on a physical device, not a desktop emulator.

### F4 — Create pot (P0)
Name, goal amount, currency, beneficiary address, repeat interval. Beneficiary address is
**locked at creation and publicly displayed**.

*Acceptance:* beneficiary address cannot be edited after creation by any code path.

### F5 — Share via deep link (P0)
Every pot has an `https://` deep link that opens the pot directly inside Nimiq Pay from
any chat app.

### F6 — My pots (P1)
List of pots created or contributed to, with fill state and recurrence label.

### F7 — Recurring pots (P1)
Weekly and monthly pots. On period rollover a fresh pot is created from the template with
the same members and beneficiary. Turns a one-shot into a ritual and is the primary
answer to "gives users a reason to come back".

*Note:* Nimiq Pay requires native confirmation for every payment. Recurring means a
recurring **prompt**, never an auto-debit. This must be stated plainly in the UI.

### F8 — On-chain contribution verification (P1)
Every contribution is sent with `sendBasicTransactionWithData` carrying the pot ID, so
the pot's ledger is reconstructible from the Nimiq chain alone. Each contribution row
links to its transaction.

### F9 — Localization (P2)
English, Spanish, Portuguese, selected via `window.nimiqPay.language`.

## 10. Non-goals

- Custody, escrow, or holding user funds at any point
- Smart contracts of any kind
- Editable beneficiary addresses
- Automatic or unattended payments
- Refunds, disputes, or chargebacks
- Accounts, passwords, or email
- Desktop layout

## 11. Risks

| Risk | Mitigation |
|---|---|
| Public pot goes stale before the unannounced evaluation | Fund and monitor it through end of September; uptime alert |
| Judge dismisses native dialog and app hangs | F3 is P0 and tested on physical devices before anything else ships |
| Fewer than 25 unique wallets | Skool post by day 10, not day 13; the public pot is the call to action |
| Beneficiary trust concerns | Direct-to-beneficiary by design; address locked, public, and on-chain verifiable |
| Scope creep past the deadline | F1–F5 is the shippable product; F6–F9 are cut candidates in that order |

## 12. Timeline

| Day | Milestone |
|---|---|
| 1–2 | Scaffold, SDK init, wallet auth |
| 3–5 | Pot model, create, contribute, deep links |
| 6–7 | **Payment state machine incl. cancel + resume** |
| 8 | On-chain tagging and verification links |
| 9 | Design pass, safe areas, localization |
| 10 | **Public pot live, Skool post, recruit contributors** |
| 11–12 | Physical device testing, Sip & Show demo, fixes |
| 13 | Submit; continue promoting |

## 13. Definition of done

- [ ] Public pot renders in under 1s with no wallet connected
- [ ] Contribution completes on physical Android and iOS inside Nimiq Pay
- [ ] Cancelled state verified by dismissing the real native dialog
- [ ] Beneficiary address immutable after creation
- [ ] Deep link opens the pot from an external chat app
- [ ] 25+ unique Nimiq wallets have opened the app
- [ ] Public repo, MIT licensed, no secrets committed
- [ ] Skool post and public social post published, links saved
