// Presenter panel (Shift+D): fire scenarios live, hide badges, reset, jump to demo-script steps.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Presentation, RotateCcw, X, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { DBS } from '@/data'
import { useNexus, useDb } from '@/store/useNexus'
import { Button, cx, SeverityBadge, SourceChip } from './ui/primitives'

// Section 13 demo script (Amber tenant). user = persona to sign in as, then path.
const STEPS: { n: number; label: string; user: string; path: string; fire?: string; tenant?: string }[] = [
  { n: 1, label: 'Log in as the MD, critical pop-up', user: 'u-vikram', path: '/command' },
  { n: 2, label: 'Command Center', user: 'u-vikram', path: '/command' },
  { n: 3, label: 'App Launcher', user: 'u-vikram', path: '/apps' },
  { n: 4, label: 'S2 import delay: ripple and who knows', user: 'u-vikram', path: '/signals/SIG-2026-1142' },
  { n: 5, label: 'NPD PM raises Alternate Supplier', user: 'u-kavita', path: '/signals/SIG-2026-1142' },
  { n: 6, label: 'Project 360: compound risk', user: 'u-kavita', path: '/projects/RND-CW-2027' },
  { n: 7, label: 'Fire S1 live, Head of Sourcing locks price', user: 'u-rohit', path: '/signals/SIG-2026-1139', fire: 'SIG-2026-1139' },
  { n: 8, label: 'Value Ledger, CFO validates, board pack', user: 'u-anjali', path: '/value' },
  { n: 9, label: 'Add a user live (SQE)', user: 'u-farah', path: '/admin/people' },
  { n: 10, label: 'Ask Nexus', user: 'u-vikram', path: '/assistant' },
  { n: 11, label: 'Bring Your Data: sales forecast', user: 'u-deepak', path: '/sources/new' },
  { n: 12, label: 'Source Hub, SAP Field Explorer, Data Fabric', user: 'u-farah', path: '/sources/sap/fields' },
  { n: 13, label: 'Mobile App Preview', user: 'u-vikram', path: '/mobile' },
  { n: 14, label: 'Switch tenant to Kestrel', user: 'k-meenal', path: '/command', tenant: 'kestrel' },
]

export function PresenterPanel() {
  const db = useDb()
  const { presenterOpen, setPresenterOpen, fireSignal, badgesHidden, setBadgesHidden, reset, login, setTenant, tenantId, dataDrops } = useNexus()
  const navigate = useNavigate()

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) { e.preventDefault(); setPresenterOpen(!useNexus.getState().presenterOpen) }
      if (e.key === 'Escape' && useNexus.getState().presenterOpen) setPresenterOpen(false)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [setPresenterOpen])

  const fireable = db.signals.filter((s) => s.recommendations.length > 0 && (!s.requiresDataDrop || dataDrops.includes(s.requiresDataDrop)))
  const jump = (s: (typeof STEPS)[number]) => {
    const t = s.tenant ?? 'amber'
    if (tenantId !== t) setTenant(t)
    login(s.user)
    if (s.fire) fireSignal(s.fire)
    navigate(s.path)
    toast(`Step ${s.n}: ${s.label}`)
  }

  return (
    <>
      {presenterOpen && (
        <aside className="page-enter fixed bottom-4 left-4 z-50 flex max-h-[80vh] w-[340px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop" aria-label="Presenter panel">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Presentation size={16} className="text-accent-ink" />
            <span className="text-sm font-semibold text-ink">Presenter</span>
            <kbd className="rounded border border-line px-1 font-mono text-[12px] text-ink-3">Shift D</kbd>
            <button onClick={() => setPresenterOpen(false)} className="ml-auto rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close"><X size={16} /></button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <section>
              <h3 className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">Fire a scenario live</h3>
              <div className="space-y-1.5">
                {fireable.map((s) => (
                  <button key={s.id} onClick={() => { fireSignal(s.id); toast(`Fired ${s.id} live`) }} className="flex w-full items-start gap-2 rounded-lg border border-line p-2 text-left hover:bg-surface-2">
                    <Zap size={14} className="mt-0.5 shrink-0 text-critical" />
                    <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><SeverityBadge s={s.severity} /><SourceChip id={s.sourceId} /></span><span className="mt-1 line-clamp-2 block text-xs text-ink">{s.title}</span></span>
                  </button>
                ))}
              </div>
            </section>
            {tenantId === 'amber' && (
              <section>
                <h3 className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">Demo script</h3>
                <ol className="space-y-0.5">
                  {STEPS.map((s) => (
                    <li key={s.n}><button onClick={() => jump(s)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-ink-2 hover:bg-surface-2 hover:text-ink"><span className="num w-5 text-ink-3">{s.n}</span>{s.label}</button></li>
                  ))}
                </ol>
              </section>
            )}
            {tenantId !== 'amber' && <Button size="sm" onClick={() => jump({ ...STEPS[0], tenant: 'amber' })}>Back to {DBS.amber.tenant.name}</Button>}
            <section className="space-y-2">
              <label className="flex items-center justify-between gap-3 text-sm text-ink">
                Hide Live / Roadmap / Simulated badges
                <button role="switch" aria-checked={badgesHidden} onClick={() => setBadgesHidden(!badgesHidden)} className={cx('relative h-6 w-10 rounded-full transition-colors', badgesHidden ? 'bg-accent-strong' : 'bg-line-strong')}>
                  <span className={cx('absolute top-0.5 size-5 rounded-full bg-surface shadow-card transition-transform', badgesHidden ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </label>
              <Button variant="danger" size="sm" className="w-full" onClick={() => { reset(); navigate('/login'); toast('Demo reset to the seeded state') }}><RotateCcw size={14} /> Reset demo</Button>
            </section>
          </div>
        </aside>
      )}
    </>
  )
}
