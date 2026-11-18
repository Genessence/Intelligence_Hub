import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDb, useNexus, useVisibleSignals } from '@/store/useNexus'
import { PageHeader } from '@/components/Shell'
import { cx, ModuleBadge } from '@/components/ui/primitives'
import { catalogue, syncedAt, type AppGroup } from './apps'

const GROUPS: AppGroup[] = ['Genessence modules', 'SAP Fiori', 'Other tools']

export function AppLauncher() {
  const db = useDb()
  const signals = useVisibleSignals()
  const drops = useNexus((s) => s.dataDrops)
  const apps = useMemo(() => catalogue(db), [db])
  const [group, setGroup] = useState<AppGroup | 'All'>('All')
  return (
    <>
      <PageHeader title="App Launcher" sub={`Every system ${db.tenant.name} runs, in one place: Genessence modules, SAP and the other tools. Roadmap modules can run on your data today.`} />
      <div className="mb-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter apps">
        {(['All', ...GROUPS] as const).map((g) => (
          <button key={g} role="tab" aria-selected={group === g} onClick={() => setGroup(g)} className={cx('h-8 rounded-full border px-3 text-xs font-medium', group === g ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink-2 hover:text-ink')}>{g}</button>
        ))}
      </div>
      {GROUPS.filter((g) => group === 'All' || g === group).map((g) => (
        <section key={g} className="mb-8">
          <h2 className="mb-3 text-xs font-medium tracking-wide text-ink-3 uppercase">{g}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {apps.filter((a) => a.group === g).map((a) => {
              const kpis = a.kpis(db, signals).slice(0, 3)
              const powered = a.status === 'Roadmap' && a.dataDrop && drops.includes(a.dataDrop)
              return (
                <Link key={a.id} to={`/apps/${a.id}`} className={cx('flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-line-strong', a.status === 'Roadmap' && !powered && 'bg-surface-2')}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{a.name}</span>
                    <ModuleBadge s={a.status} />
                  </div>
                  <p className="mt-1 flex-1 text-xs text-ink-2">{a.desc}</p>
                  {kpis.length > 0 && (
                    <dl className="mt-3 space-y-1">
                      {kpis.map((k) => <div key={k.label} className="flex justify-between gap-2 text-xs"><dt className="text-ink-3">{k.label}</dt><dd className="num font-medium text-ink">{k.value}</dd></div>)}
                    </dl>
                  )}
                  <div className="mt-3 text-xs text-ink-3">
                    {a.status === 'Roadmap' ? (powered ? <span className="text-accent-ink">Powered by your data today, native module coming</span> : a.dataDrop ? 'Can run on your data today' : 'Concept') : `Synced ${syncedAt(a.syncMinsAgo)}`}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}
