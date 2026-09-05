'use client'

// Lets the active screen lend its primary action to the tab bar's centre
// button, so the most prominent control always does the most useful thing
// for wherever the user currently is.
import { create } from 'zustand'

type Store = {
  fn: (() => void) | null
  setAction: (fn: (() => void) | null) => void
}

export const useAction = create<Store>((set) => ({
  fn: null,
  setAction: (fn) => set({ fn }),
}))
