'use client'

import { useEffect } from 'react'
import TabBar from './TabBar'
import { watchVisibility } from '@/lib/payment'

export default function Shell({ children }: { children: React.ReactNode }) {
  // Installed before anything else so a transaction interrupted by the native
  // dialog is reconciled the moment the WebView returns to the foreground.
  useEffect(() => {
    watchVisibility()
  }, [])

  return (
    <>
      <main className="app">{children}</main>
      <TabBar />
    </>
  )
}
