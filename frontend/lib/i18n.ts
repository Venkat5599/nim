import { hostLanguage } from './nimiq'

/** Locale chosen by the user in Nimiq Pay, for number formatting. */
export function useLocale(): string {
  return (hostLanguage() ?? 'en').slice(0, 2).toLowerCase()
}

export const locale = typeof window === 'undefined' ? 'en' : (hostLanguage() ?? 'en').slice(0, 2)
