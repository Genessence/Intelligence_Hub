import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Search } from 'lucide-react'
import { useDb, useTenantUsers, useVisibleSignals } from '@/store/useNexus'
import { buildIndex, search } from '@/engine/search'
import { cx } from './ui/primitives'

export function CommandPalette() {
  const db = useDb()
  const users = useTenantUsers()
  const signals = useVisibleSignals()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const index = useMemo(() => buildIndex(db, users, signals), [db, users, signals])
  const results = useMemo(() => search(index, q), [index, q])

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o) } }
    const ev = () => setOpen(true)
    window.addEventListener('keydown', key)
    window.addEventListener('nexus:palette', ev)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('nexus:palette', ev) }
  }, [])
  useEffect(() => setSel(0), [q])

  const go = (href: string) => { setOpen(false); setQ(''); nav(href) }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40" style={{ background: 'var(--overlay)' }} />
        <Dialog.Content className="page-enter fixed top-[12vh] left-1/2 z-50 w-[min(600px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          <Dialog.Title className="sr-only">Search Nexus</Dialog.Title>
          <Dialog.Description className="sr-only">Search parts, vendors, projects, shipments, POs, people, signals and pages</Dialog.Description>
          <div className="flex items-center gap-2 border-b border-line px-4">
            <Search size={16} className="text-ink-3" aria-hidden />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parts, vendors, POs, shipments, people, pages"
              aria-label="Search" role="combobox" aria-expanded aria-controls="palette-results" aria-activedescendant={results[sel] ? `pr-${sel}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)) }
                if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
                if (e.key === 'Enter' && results[sel]) go(results[sel].href)
              }}
              className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            />
            <kbd className="rounded border border-line px-1.5 font-mono text-[12px] text-ink-3">Esc</kbd>
          </div>
          <ul id="palette-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
            {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-2">Nothing matches "{q}".</li>}
            {results.map((r, i) => (
              <li key={r.kind + r.href + r.label} id={`pr-${i}`} role="option" aria-selected={i === sel}>
                <button onMouseEnter={() => setSel(i)} onClick={() => go(r.href)} className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', i === sel && 'bg-surface-2')}>
                  <span className="w-16 shrink-0 text-xs text-ink-3">{r.kind}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm text-ink">{r.label}</span><span className="block truncate text-xs text-ink-3">{r.sub}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
