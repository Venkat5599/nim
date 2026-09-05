'use client'

// Five slots with a raised centre action. The centre button performs the
// active screen's real action rather than opening a menu, so the most
// prominent control does the most useful thing.
import { usePathname, useRouter } from 'next/navigation'
import {
  House,
  ClockCounterClockwise,
  ShieldCheck,
  ChartDonut,
  Plus,
} from '@phosphor-icons/react'
import { useAction } from '@/lib/action'

export default function TabBar() {
  const path = usePathname()
  const router = useRouter()
  const fn = useAction((s) => s.fn)

  const on = (p: string) => (p === '/' ? path === '/' : path.startsWith(p))

  return (
    <nav className="bar">
      <button className={`slot ${on('/') ? 'on' : ''}`} onClick={() => router.push('/')}>
        <House size={22} weight={on('/') ? 'fill' : 'regular'} />
        <span>Home</span>
      </button>

      <button
        className={`slot ${on('/activity') ? 'on' : ''}`}
        onClick={() => router.push('/activity')}
      >
        <ClockCounterClockwise size={22} weight={on('/activity') ? 'fill' : 'regular'} />
        <span>History</span>
      </button>

      <button className="fab" disabled={!fn} onClick={() => fn?.()} aria-label="Rebalance">
        <Plus size={24} weight="bold" />
      </button>

      <button
        className={`slot ${on('/validators') ? 'on' : ''}`}
        onClick={() => router.push('/validators')}
      >
        <ShieldCheck size={22} weight={on('/validators') ? 'fill' : 'regular'} />
        <span>Validator</span>
      </button>

      <button className="slot" onClick={() => router.push('/')}>
        <ChartDonut size={22} />
        <span>Insight</span>
      </button>
    </nav>
  )
}
