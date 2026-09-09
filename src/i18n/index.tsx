import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { ru, type Key } from './ru'
import { en } from './en'

export type Locale = 'ru' | 'en'
export type { Key }

const dicts = { ru, en }

/** A persisted locale can be anything; unknown values fall back to Russian. */
export function normalizeLocale(v: unknown): Locale {
  return v === 'en' || v === 'ru' ? v : 'ru'
}

export function format(s: string, vars?: Record<string, string | number>) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : s
}

const Ctx = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: 'ru',
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, set] = useState<Locale>(() => normalizeLocale(localStorage.getItem('lim.locale')))
  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem('lim.locale', l)
    set(l)
  }, [])
  return <Ctx.Provider value={{ locale, setLocale }}>{children}</Ctx.Provider>
}

export function useLocale() {
  const c = useContext(Ctx)
  return [c.locale, c.setLocale] as const
}

export function useT() {
  const [l] = useLocale()
  return (k: Key, vars?: Record<string, string | number>) => format(dicts[l][k] ?? ru[k], vars)
}
