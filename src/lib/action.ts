// Lets the active screen lend its primary action to the tab bar's centre
// button, so the most prominent control always does the most useful thing
// for wherever the user currently is.
import { writable } from 'svelte/store'

export const action = writable<(() => void) | null>(null)

export function registerAction(fn: (() => void) | null) {
  action.set(fn)
  return () => action.set(null)
}
