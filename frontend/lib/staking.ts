'use client'

// Nimiq staking lifecycle.
//
// This is the product. Nimiq's protocol does not let you simply "unstake":
// you RETIRE stake, wait out a reporting window, then REMOVE it. Users get
// stuck in the middle of that constantly, which is exactly the problem Float
// exists to handle.
//
// Write methods are first-class on the provider. Reading staker state is NOT
// exposed as a typed method, so we go through the generic RPC passthrough
// (`provider.request`). That path is unverified against a live device -- treat
// a null read as "unknown", never as "no stake".

import { getProvider, unwrap } from './nimiq'

export type StakerState = {
  /** Total delegated, in Luna. */
  totalLuna: number
  /** Portion currently earning, in Luna. */
  activeLuna: number
  /** Portion retired and waiting for the window to elapse, in Luna. */
  retiredLuna: number
  /** Validator this staker delegates to, if any. */
  delegation: string | null
}

/** Nothing staked yet. Distinct from "we could not read the chain". */
export const EMPTY_STAKER: StakerState = {
  totalLuna: 0,
  activeLuna: 0,
  retiredLuna: 0,
  delegation: null,
}

/**
 * Reads staker state from the node behind Nimiq Pay.
 *
 * Returns null when the read fails for any reason. Callers MUST treat null as
 * unknown and refuse to act on it -- acting on a failed read could retire
 * stake the user never asked to touch.
 */
export async function readStaker(address: string): Promise<StakerState | null> {
  try {
    const nimiq = await getProvider()
    const raw = await nimiq.request<unknown>({
      method: 'getStakerByAddress',
      params: [address],
    })
    return parseStaker(raw)
  } catch {
    return null
  }
}

/**
 * Normalises whatever the RPC returns. Field names differ between Albatross
 * RPC versions, so every value is probed across its known aliases rather than
 * assumed. An unreadable shape returns null, not zeroes.
 */
function parseStaker(raw: unknown): StakerState | null {
  if (raw === null || raw === undefined) return EMPTY_STAKER
  if (typeof raw !== 'object') return null

  const o = raw as Record<string, unknown>
  const data = (o.data ?? o.result ?? o) as Record<string, unknown>

  const total = num(data, ['balance', 'totalBalance', 'stake'])
  const active = num(data, ['activeBalance', 'activeStake', 'balance'])
  const retired = num(data, ['retiredBalance', 'inactiveBalance', 'retiredStake'])

  if (total === null && active === null) return null

  const delegation = str(data, ['delegation', 'validator', 'validatorAddress'])

  return {
    totalLuna: total ?? active ?? 0,
    activeLuna: active ?? 0,
    retiredLuna: retired ?? 0,
    delegation,
  }
}

function num(o: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
      return Number(v)
    }
  }
  return null
}

function str(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

// --------------------------------------------------------------- writes
//
// Each of these opens a native confirmation dialog. They throw NimiqCallError
// on rejection, so lib/payment.ts maps them onto the same state machine the
// contribution flow uses -- including the cancel path.

/** First-time delegation. Creates the staker and stakes in one transaction. */
export async function startStaking(validator: string, amountLuna: number): Promise<string> {
  const nimiq = await getProvider()
  return unwrap(
    await nimiq.sendNewStakerTransaction({ delegation: validator, value: amountLuna }),
  )
}

/** Adds to an existing stake. */
export async function addStake(amountLuna: number): Promise<string> {
  const nimiq = await getProvider()
  return unwrap(await nimiq.sendStakeTransaction({ value: amountLuna }))
}

/**
 * Step 1 of 2 for withdrawing. Retires stake so it stops earning and begins
 * the reporting window. The NIM is NOT spendable yet -- that is `removeStake`.
 */
export async function retireStake(amountLuna: number): Promise<string> {
  const nimiq = await getProvider()
  return unwrap(await nimiq.sendRetireStakeTransaction({ retireStake: amountLuna }))
}

/**
 * Step 2 of 2. Moves retired stake back into the spendable balance. Fails if
 * the reporting window has not elapsed, which surfaces as InvalidTransaction.
 */
export async function removeStake(amountLuna: number): Promise<string> {
  const nimiq = await getProvider()
  return unwrap(await nimiq.sendRemoveStakeTransaction({ value: amountLuna }))
}

/** Moves delegation to a different validator. */
export async function switchValidator(
  newValidator: string,
  reactivateAllStake = true,
): Promise<string> {
  const nimiq = await getProvider()
  return unwrap(
    await nimiq.sendUpdateStakerTransaction({
      newDelegation: newValidator,
      reactivateAllStake,
    }),
  )
}

/** Sets how much of the stake is actively earning. */
export async function setActiveStake(newActiveLuna: number): Promise<string> {
  const nimiq = await getProvider()
  return unwrap(
    await nimiq.sendSetActiveStakeTransaction({ newActiveBalance: newActiveLuna }),
  )
}

// ----------------------------------------------------------- the rule
//
// Float's whole idea: one number the user chooses, and everything follows.

export type FloatRule = {
  /** NIM to keep spendable at all times, in Luna. */
  floorLuna: number
  /** Validator to delegate to. */
  validator: string
}

export type Plan =
  | { action: 'none'; reason: string }
  | { action: 'stake'; amountLuna: number; isFirstTime: boolean }
  | { action: 'retire'; amountLuna: number }
  | { action: 'remove'; amountLuna: number }

/**
 * Decides the single next move.
 *
 * Deliberately returns ONE action, never a queue. Every staking transaction
 * needs its own native confirmation, so a plan the user cannot approve in one
 * tap is a plan that strands them halfway.
 *
 * Order matters: retired stake that is ready to collect is always claimed
 * before anything new is staked, otherwise NIM sits in limbo earning nothing.
 */
export function planNextMove(args: {
  liquidLuna: number
  staker: StakerState
  rule: FloatRule
  /** Whether the reporting window on retired stake has elapsed. */
  retiredReady: boolean
  /** Ignore drift smaller than this, so the app is not always nagging. */
  minMoveLuna: number
}): Plan {
  const { liquidLuna, staker, rule, retiredReady, minMoveLuna } = args

  if (staker.retiredLuna > 0 && retiredReady) {
    return { action: 'remove', amountLuna: staker.retiredLuna }
  }

  if (staker.retiredLuna > 0) {
    return { action: 'none', reason: 'Retired stake is still in its waiting window' }
  }

  const surplus = liquidLuna - rule.floorLuna

  if (surplus >= minMoveLuna) {
    return {
      action: 'stake',
      amountLuna: surplus,
      isFirstTime: staker.totalLuna === 0,
    }
  }

  const shortfall = rule.floorLuna - liquidLuna
  if (shortfall >= minMoveLuna && staker.activeLuna > 0) {
    return { action: 'retire', amountLuna: Math.min(shortfall, staker.activeLuna) }
  }

  return { action: 'none', reason: 'Balanced' }
}
