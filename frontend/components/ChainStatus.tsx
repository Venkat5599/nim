'use client'

// Real network state: consensus plus current block height. This is the app
// reading the chain, not just pushing transactions at it.
import { useEffect, useState } from 'react'
import { chainStatus } from '@/lib/nimiq'

export default function ChainStatus() {
  const [s, setS] = useState<{ consensus: boolean; height: number } | null>(null)

  useEffect(() => {
    let alive = true
    const tick = async () => {
      const next = await chainStatus()
      if (alive) setS(next)
    }
    tick()
    const id = setInterval(tick, 15000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  if (!s) return null

  return (
    <p className="chain tabular">
      {s.consensus ? 'Nimiq consensus established' : 'Syncing with Nimiq'} / block{' '}
      {s.height.toLocaleString()}
    </p>
  )
}
