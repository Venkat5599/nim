'use client'

// Local record of what this wallet did through Float.
//
// Chain history reads are not verified against a live node, so the activity
// list is built from transactions we ourselves submitted. Every entry is a
// real transaction hash, never a simulated one. If the chain read path is
// confirmed later, this becomes a cache rather than the record.

export type ActivityKind = 'stake' | 'retire' | 'remove' | 'switch'

export type Entry = {
  txHash: string
  kind: ActivityKind
  amountLuna: number
  at: number
  validator?: string
}

const KEY = 'float:activity'
const MAX = 60

export function readActivity(): Entry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function addActivity(e: Entry): void {
  try {
    const next = [e, ...readActivity().filter((x) => x.txHash !== e.txHash)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode. The transaction still happened on chain.
  }
}

export function describe(kind: ActivityKind): string {
  switch (kind) {
    case 'stake':
      return 'Put to work'
    case 'retire':
      return 'Started freeing up'
    case 'remove':
      return 'Collected'
    case 'switch':
      return 'Changed validator'
  }
}

/** Validators this wallet has used, most recent first. */
const VKEY = 'float:validators'

export function readValidators(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(VKEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function rememberValidator(address: string): void {
  const a = address.trim()
  if (a.length < 10) return
  try {
    const next = [a, ...readValidators().filter((x) => x !== a)].slice(0, 8)
    localStorage.setItem(VKEY, JSON.stringify(next))
  } catch {
    // Non-critical.
  }
}
