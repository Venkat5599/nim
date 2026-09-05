import { writable } from 'svelte/store'

export type Route =
  | { name: 'home' }
  | { name: 'float' }
  | { name: 'activity' }
  | { name: 'validators' }
  | { name: 'pot'; potId: string }
  | { name: 'contribute'; potId: string }
  | { name: 'new' }
  | { name: 'mine' }

const PUBLIC_POT = import.meta.env.VITE_PUBLIC_POT_ID || 'community'

function parse(pathname: string): Route {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  if (parts[0] === 'p' && parts[1]) {
    return parts[2] === 'contribute'
      ? { name: 'contribute', potId: parts[1] }
      : { name: 'pot', potId: parts[1] }
  }
  if (parts[0] === 'float') return { name: 'float' }
  if (parts[0] === 'activity') return { name: 'activity' }
  if (parts[0] === 'validators') return { name: 'validators' }
  if (parts[0] === 'new') return { name: 'new' }
  if (parts[0] === 'mine') return { name: 'mine' }
  return { name: 'home' }
}

export const route = writable<Route>(parse(location.pathname))

export function navigate(path: string): void {
  history.pushState({}, '', path)
  route.set(parse(path))
  window.scrollTo(0, 0)
}

window.addEventListener('popstate', () => route.set(parse(location.pathname)))

/** https deep link for a pot. Opens directly in Nimiq Pay from any chat app. */
export function potLink(potId: string): string {
  return `${location.origin}/p/${potId}`
}

export { PUBLIC_POT }
