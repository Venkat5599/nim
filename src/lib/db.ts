import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// The anon key is public by design. Safety comes from RLS (see supabase/schema.sql),
// which grants select and insert but never update or delete.
export const db = createClient(url, key, {
  auth: { persistSession: false },
})

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

export async function getPot(id: string): Promise<Pot | null> {
  const { data, error } = await db.from('pots').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getContributions(potId: string, limit = 50): Promise<Contribution[]> {
  const { data, error } = await db
    .from('contributions')
    .select('*')
    .eq('pot_id', potId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function createPot(pot: Omit<Pot, 'created_at'>): Promise<void> {
  const { error } = await db.from('pots').insert(pot)
  if (error) throw error
}

/**
 * Written the moment a tx hash comes back. confirmed stays false until a
 * trusted reconciler sees the transaction on chain — the anon key cannot
 * flip it, because it has no UPDATE policy at all.
 */
export async function recordContribution(c: Omit<Contribution, 'created_at' | 'confirmed'>) {
  const { error } = await db.from('contributions').insert({ ...c, confirmed: false })
  if (error && error.code !== '23505') throw error // ignore duplicate tx_hash
}

/** One row per wallet per day. Feeds the Real Usage count. Never blocks the UI. */
export async function recordOpen(address: string): Promise<void> {
  try {
    await db.from('app_opens').insert({ address })
  } catch {
    // Counting is best-effort. It must never break the cold open.
  }
}
