// The only file that imports the Nimiq Mini App SDK.
//
// IMPORTANT: the provider's wallet methods do NOT throw on failure. They
// resolve to `{ error: { type, message } }` (ErrorResponse). Every call site
// must narrow the union. That is what `unwrap` below exists for — getting this
// wrong means a cancelled payment silently reads as success.
//
// Verified against the installed @nimiq/mini-app-sdk@0.1.0 type definitions
// and https://nimiq.dev/mini-apps/api-reference/nimiq-provider

import {
  init,
  getHostLanguage,
  requestDeviceIdentifier,
  type NimiqProvider,
  type ErrorResponse,
} from '@nimiq/mini-app-sdk'

export type { NimiqProvider }

/** Error types the provider reports back, per the API reference. */
export const ERR_PERMISSION_DENIED = 'PermissionDeniedError'
export const ERR_INVALID_TRANSACTION = 'InvalidTransactionError'

export class NimiqCallError extends Error {
  constructor(readonly type: string, message: string) {
    super(message)
    this.name = 'NimiqCallError'
  }
}

/** True when a provider result is the error branch of the union. */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ErrorResponse).error?.type === 'string'
  )
}

/**
 * Narrows `T | ErrorResponse` to `T`, converting the error branch into a
 * throw so callers can use ordinary try/catch. Every provider call goes
 * through here.
 */
export function unwrap<T>(value: T | ErrorResponse): T {
  if (isErrorResponse(value)) {
    throw new NimiqCallError(value.error.type, value.error.message)
  }
  return value
}

export function isUserRejection(err: unknown): boolean {
  return err instanceof NimiqCallError && err.type === ERR_PERMISSION_DENIED
}

export function isInvalidTransaction(err: unknown): boolean {
  return err instanceof NimiqCallError && err.type === ERR_INVALID_TRANSACTION
}

// ------------------------------------------------------------- provider

let provider: NimiqProvider | null = null
let pending: Promise<NimiqProvider> | null = null

/**
 * Resolves once Nimiq Pay has injected the provider.
 *
 * Never call this on a render path. The cold open must paint without a wallet
 * (ARCHITECTURE.md section 3), so this only runs when the user reaches for
 * something that genuinely needs the wallet.
 */
export function getProvider(): Promise<NimiqProvider> {
  if (provider) return Promise.resolve(provider)
  if (!pending) {
    pending = init({ timeout: 10_000 })
      .then((p) => {
        provider = p
        return p
      })
      .catch((err) => {
        pending = null // allow a retry rather than caching the failure
        throw err
      })
  }
  return pending
}

/** True when running inside Nimiq Pay. Used to show an out-of-app hint. */
export function isInsideNimiqPay(): boolean {
  return typeof window !== 'undefined' && window.nimiqPay !== undefined
}

/** ISO 639-1 code chosen by the user in Nimiq Pay. Safe to read synchronously. */
export function hostLanguage(): string | undefined {
  try {
    return getHostLanguage()
  } catch {
    return undefined
  }
}

/**
 * Pseudonymous, per-origin device identifier. Prompts on first call.
 * Used only to attribute a contribution when no wallet address is available.
 * Identifies the device, not the person.
 */
export async function deviceId(reason: string): Promise<string | null> {
  try {
    return await requestDeviceIdentifier({ reason })
  } catch {
    return null
  }
}

/** First account, or null if the user declined the confirmation dialog. */
export async function getAddress(): Promise<string | null> {
  try {
    const nimiq = await getProvider()
    const accounts = unwrap(await nimiq.listAccounts())
    return accounts[0] ?? null
  } catch (err) {
    if (isUserRejection(err)) return null
    throw err
  }
}

/** Signs a challenge to prove address ownership. Null if the user declines. */
export async function signMessage(message: string) {
  try {
    const nimiq = await getProvider()
    return unwrap(await nimiq.sign(message))
  } catch (err) {
    if (isUserRejection(err)) return null
    throw err
  }
}

/**
 * True for the all-zero placeholder addresses shipped in schema.sql and the
 * demo pot. Sending to one of these burns real NIM into an unspendable
 * address, so the UI must warn loudly before the native dialog opens.
 */
export function isPlaceholderAddress(address: string): boolean {
  const digits = address.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
  return /^NQ\d{2}0+$/.test(digits)
}

/** Short form of a transaction hash for display. */
export function shortHash(hash: string): string {
  return hash.length <= 16 ? hash : `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

// ------------------------------------------------------------ contributions

/** Prefix that marks a transaction as a Chip In contribution on chain. */
export const TX_DATA_PREFIX = 'chipin:v1:'

export function encodePotTag(potId: string): string {
  return TX_DATA_PREFIX + potId
}

/** Parses a pot id back out of transaction data. Null if not ours. */
export function decodePotTag(data: string | null | undefined): string | null {
  if (!data || !data.startsWith(TX_DATA_PREFIX)) return null
  const id = data.slice(TX_DATA_PREFIX.length).trim()
  return id.length ? id : null
}

/**
 * Sends a contribution, tagged on chain with the pot it belongs to.
 *
 * The tag is what makes a pot's history reconstructible from Nimiq alone —
 * our database is a cache, not the source of truth.
 *
 * Throws NimiqCallError. Callers go through lib/payment.ts, which maps
 * failures onto user-facing states.
 */
export async function sendContribution(args: {
  beneficiary: string
  amountLuna: number
  potId: string
}): Promise<string> {
  const nimiq = await getProvider()
  return unwrap(
    await nimiq.sendBasicTransactionWithData({
      recipient: args.beneficiary,
      value: args.amountLuna,
      data: encodePotTag(args.potId),
      // fee and validityStartHeight omitted on purpose: Nimiq Pay picks a fee
      // automatically, using zero where possible.
    }),
  )
}

/**
 * Stakes NIM with a validator.
 *
 * Not on the contribution path. Offered to a pot creator once their pot is
 * funded, so idle NIM earns while it waits to be spent. Uses the staking side
 * of the Nimiq protocol rather than plain transfers.
 */
export async function stake(args: {
  validator: string
  amountLuna: number
  isNewStaker: boolean
}): Promise<string> {
  const nimiq = await getProvider()
  const result = args.isNewStaker
    ? await nimiq.sendNewStakerTransaction({
        delegation: args.validator,
        value: args.amountLuna,
      })
    : await nimiq.sendStakeTransaction({ value: args.amountLuna })
  return unwrap(result)
}

/** Consensus and height, for the verification strip. Never blocks the UI. */
export async function chainStatus(): Promise<{ consensus: boolean; height: number } | null> {
  try {
    const nimiq = await getProvider()
    const [consensus, height] = await Promise.all([
      nimiq.isConsensusEstablished(),
      nimiq.getBlockNumber(),
    ])
    return { consensus, height }
  } catch {
    return null
  }
}
