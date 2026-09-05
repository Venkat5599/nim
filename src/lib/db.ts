// Supabase over plain fetch.
//
// The official client is ~65 kB gzipped and the cold open is on the critical
// path, so we talk to PostgREST directly. Safety is unchanged: it is the same
// anon key and the same RLS policies (supabase/schema.sql), which grant select
// and insert but never update or delete.
//
// When no backend is configured the app falls back to a seeded demo pot so the
// UI is fully explorable. Demo mode never pretends a payment succeeded.

const URL_BASE = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? ''
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const hasBackend = Boolean(URL_BASE && ANON)

export type Pot = {
  id: string
  name: string
  goal_luna: number
  currency: 'NIM' | 'USDT'
  beneficiary: string
  creator_address: string
  is_public: boolean
  repeat_interval: 'weekly' | 'monthly' | null
  created_at: string
}

export type Contribution = {
  tx_hash: string
  pot_id: string
  from_address: string
  amount_luna: number
  display_name: string | null
  confirmed: boolean
  created_at: string
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

// ------------------------------------------------------------- demo data

const DEMO_POT: Pot = {
  id: 'community',
  name: 'Nimiq community pot',
  goal_luna: 500_000_00000,
  currency: 'NIM',
  beneficiary: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
  creator_address: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
  is_public: true,
  repeat_interval: null,
  created_at: new Date().toISOString(),
}

function minsAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString()
}

const DEMO_CONTRIBUTIONS: Contribution[] = [
  { tx_hash: 'demo1', pot_id: 'community', from_address: 'NQ07 1111 1111 1111 1111 1111 1111 1111 1111', amount_luna: 45_000_00000, display_name: 'Elena Vance',   confirmed: true, created_at: minsAgo(2) },
  { tx_hash: 'demo2', pot_id: 'community', from_address: 'NQ07 2222 2222 2222 2222 2222 2222 2222 2222', amount_luna: 12_000_00000, display_name: 'Marcus Bell',   confirmed: true, created_at: minsAgo(14) },
  { tx_hash: 'demo3', pot_id: 'community', from_address: 'NQ07 3333 3333 3333 3333 3333 3333 3333 3333', amount_luna: 85_000_00000, display_name: 'Sora Takahashi', confirmed: true, created_at: minsAgo(63) },
  { tx_hash: 'demo4', pot_id: 'community', from_address: 'NQ07 4444 4444 4444 4444 4444 4444 4444 4444', amount_luna: 20_000_00000, display_name: 'David Chen',    confirmed: true, created_at: minsAgo(190) },
  { tx_hash: 'demo5', pot_id: 'community', from_address: 'NQ07 5555 5555 5555 5555 5555 5555 5555 5555', amount_luna: 60_000_00000, display_name: 'Amara Diallo',  confirmed: true, created_at: minsAgo(320) },
  { tx_hash: 'demo6', pot_id: 'community', from_address: 'NQ07 6666 6666 6666 6666 6666 6666 6666 6666', amount_luna: 15_000_00000, display_name: 'Luis Ortega',   confirmed: true, created_at: minsAgo(500) },
]

// Pots created locally while there is no backend, so the create flow is
// explorable end to end. Cleared when the browser storage is cleared.
function localPots(): Pot[] {
  try {
    return JSON.parse(localStorage.getItem('chipin:pots') ?? '[]')
  } catch {
    return []
  }
}

function saveLocalPot(p: Pot): void {
  try {
    localStorage.setItem('chipin:pots', JSON.stringify([p, ...localPots()]))
  } catch {
    // Private mode. The pot still exists for this session's navigation.
  }
}

// --------------------------------------------------------------- queries

export async function getPot(id: string): Promise<Pot | null> {
  if (!hasBackend) {
    if (id === DEMO_POT.id) return DEMO_POT
    return localPots().find((p) => p.id === id) ?? null
  }
  const rows = await rest<Pot[]>(`pots?id=eq.${encodeURIComponent(id)}&select=*&limit=1`)
  return rows[0] ?? null
}

export async function getContributions(potId: string, limit = 50): Promise<Contribution[]> {
  if (!hasBackend) {
    return potId === DEMO_POT.id ? DEMO_CONTRIBUTIONS : []
  }
  return rest<Contribution[]>(
    `contributions?pot_id=eq.${encodeURIComponent(potId)}&select=*&order=created_at.desc&limit=${limit}`,
  )
}

export async function listPots(addresses: string[]): Promise<Pot[]> {
  if (!hasBackend) return localPots()
  if (!addresses.length) return []
  const inList = addresses.map((a) => `"${a}"`).join(',')
  return rest<Pot[]>(`pots?creator_address=in.(${encodeURIComponent(inList)})&select=*&order=created_at.desc`)
}

export async function createPot(pot: Omit<Pot, 'created_at'>): Promise<void> {
  if (!hasBackend) {
    saveLocalPot({ ...pot, created_at: new Date().toISOString() })
    return
  }
  await rest<void>('pots', { method: 'POST', body: JSON.stringify(pot) })
}

/**
 * Written the moment a tx hash comes back. confirmed stays false until a
 * trusted reconciler has seen the transaction on chain -- the anon key cannot
 * flip it, because it has no UPDATE policy at all.
 */
export async function recordContribution(
  c: Omit<Contribution, 'created_at' | 'confirmed'>,
): Promise<void> {
  if (!hasBackend) return
  try {
    await rest<void>('contributions', {
      method: 'POST',
      body: JSON.stringify({ ...c, confirmed: false }),
    })
  } catch (err) {
    // A duplicate tx_hash is not a problem worth surfacing.
    if (!String(err).includes('23505')) throw err
  }
}

/** One row per wallet per day. Feeds Real Usage. Never blocks the UI. */
export async function recordOpen(address: string): Promise<void> {
  if (!hasBackend) return
  try {
    await rest<void>('app_opens', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ address }),
    })
  } catch {
    // Counting is best-effort. It must never break the cold open.
  }
}
