import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
export type Palette = 'teal' | 'indigo' | 'violet' | 'ember' | 'graphite'
export const PALETTES: { id: Palette; name: string; hint: string }[] = [
  { id: 'teal', name: 'Nexus Teal', hint: 'Calm and clinical, the default' },
  { id: 'indigo', name: 'Royal Indigo', hint: 'Boardroom, finance-friendly' },
  { id: 'violet', name: 'Ultra Violet', hint: 'Bold and modern' },
  { id: 'ember', name: 'Amber Ember', hint: 'Warm, close to the client brand' },
  { id: 'graphite', name: 'Graphite', hint: 'Monochrome, maximum restraint' },
]
export type UiMode = 'classic' | 'apple'
interface Ctx { pref: ThemePref; resolved: 'light' | 'dark'; setPref: (p: ThemePref) => void; palette: Palette; setPalette: (p: Palette) => void; ui: UiMode; setUi: (u: UiMode) => void }
const ThemeCtx = createContext<Ctx | null>(null)
const KEY = 'nexus-theme' // read by the no-flash script in index.html

const read = (): ThemePref => {
  try { return (localStorage.getItem(KEY) as ThemePref) || 'system' } catch { return 'system' }
}
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(read)
  const [sysDark, setSysDark] = useState(systemDark)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSysDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const [palette, setPaletteState] = useState<Palette>(() => { try { return (localStorage.getItem('nexus-palette') as Palette) || 'teal' } catch { return 'teal' } })
  useEffect(() => { document.documentElement.setAttribute('data-palette', palette) }, [palette])
  const setPalette = (p: Palette) => { setPaletteState(p); try { localStorage.setItem('nexus-palette', p) } catch { /* memory only */ } }
  const [ui, setUiState] = useState<UiMode>(() => { try { return localStorage.getItem('nexus-ui') === 'classic' ? 'classic' : 'apple' } catch { return 'apple' } })
  useEffect(() => { document.documentElement.setAttribute('data-ui', ui) }, [ui])
  const setUi = (u: UiMode) => { setUiState(u); try { localStorage.setItem('nexus-ui', u) } catch { /* memory only */ } }
  const resolved = pref === 'system' ? (sysDark ? 'dark' : 'light') : pref
  useEffect(() => { document.documentElement.setAttribute('data-theme', resolved) }, [resolved])
  const setPref = (p: ThemePref) => {
    setPrefState(p)
    try { localStorage.setItem(KEY, p) } catch { /* private mode: keep in memory */ }
  }
  return <ThemeCtx.Provider value={{ pref, resolved, setPref, palette, setPalette, ui, setUi }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => {
  const c = useContext(ThemeCtx)
  if (!c) throw new Error('useTheme outside ThemeProvider')
  return c
}

/** Read a token for SVG / chart code that cannot use CSS classes. */
export const cssVar = (name: string) => `var(--${name})`
