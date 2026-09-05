'use client'

import { useEffect, useState } from 'react'
import { readActivity, describe, type Entry } from '@/lib/activity'
import { formatNim } from '@/lib/units'
import { shortHash } from '@/lib/nimiq'
import { locale } from '@/lib/i18n'

export default function ActivityPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setEntries(readActivity())
    setLoaded(true)
  }, [])

  return (
    <div className="screen">
      <header className="greeting">
        <div>
          <p className="hello">History</p>
          <p className="sub">Every move you have made</p>
        </div>
      </header>

      {entries.length ? (
        <>
          <div className="list">
            {entries.map((e) => (
              <div className="card item" key={e.txHash}>
                <div>
                  <p className="item-title">{describe(e.kind)}</p>
                  <p className="item-time tabular">
                    {when(e.at)} / {shortHash(e.txHash)}
                  </p>
                </div>
                {e.amountLuna > 0 && (
                  <span className="item-amt tabular">{formatNim(e.amountLuna, locale)}</span>
                )}
              </div>
            ))}
          </div>
          <p className="footnote">
            Recorded on this device when a transaction hash came back. Each one is real and
            verifiable on chain.
          </p>
        </>
      ) : loaded ? (
        <div className="card empty">
          <p>
            Nothing yet. When you put NIM to work or free some up, it appears here with its
            transaction hash.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function when(ts: number): string {
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}
