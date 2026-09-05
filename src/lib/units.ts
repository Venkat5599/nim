// The only file in the project that converts between NIM and Luna.
// Every amount that crosses the SDK boundary is an integer number of Luna.
// Centralised deliberately: unit confusion is the classic way a payments app
// sends 100,000x too much money.

export const LUNA_PER_NIM = 100_000

/** NIM (human) -> Luna (integer, what the SDK wants). Throws on bad input. */
export function nimToLuna(nim: number): number {
  if (!Number.isFinite(nim) || nim <= 0) {
    throw new RangeError(`amount must be a positive number, got ${nim}`)
  }
  const luna = Math.round(nim * LUNA_PER_NIM)
  if (!Number.isSafeInteger(luna)) {
    throw new RangeError(`amount too large: ${nim} NIM`)
  }
  return luna
}

/** Luna -> NIM as a number, for maths and progress ratios. */
export function lunaToNim(luna: number): number {
  return luna / LUNA_PER_NIM
}

/**
 * Luna -> display string. Grouped thousands, no trailing noise.
 * Rendered with font-variant-numeric: tabular-nums so updating amounts
 * never shift the layout.
 */
export function formatNim(luna: number, locale = 'en'): string {
  const nim = lunaToNim(luna)
  const decimals = Number.isInteger(nim) ? 0 : nim < 1 ? 5 : 2
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(nim)
}

/** Fill ratio clamped to 0..1, safe when goal is missing or zero. */
export function fillRatio(raisedLuna: number, goalLuna: number): number {
  if (!goalLuna || goalLuna <= 0) return 0
  return Math.min(1, Math.max(0, raisedLuna / goalLuna))
}

/** Short, human address form: NQ07 0000 ... 0000 */
export function shortAddress(address: string): string {
  const clean = address.replace(/\s+/g, '')
  if (clean.length <= 12) return address
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`
}
