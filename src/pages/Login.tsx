import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { DBS } from '@/data'
import { useNexus, useDb, useTenantUsers, useVisibleSignals } from '@/store/useNexus'
import { getRole } from '@/engine/lookup'
import { computeAudience } from '@/engine/audience'
import { landingFor } from '@/config/routes'
import { BRAND } from '@/config/brand'
import { Logo } from '@/components/Shell'
import { PalettePicker } from '@/components/PalettePicker'
import { UiToggle } from '@/components/UiToggle'
import { Avatar, cx, SimulatedTag } from '@/components/ui/primitives'
import type { RoleFunction, UserProfile } from '@/data/types'

function scopeLine(u: UserProfile) {
  const s = u.scope
  if (s.all) return 'All plants'
  if (s.shipmentsAll) return 'All import shipments'
  const parts = [
    s.plants.length && `Plant ${s.plants.join(', ')}`,
    s.purchasingGroups.length && `Purchasing group ${s.purchasingGroups.join(', ')}`,
    s.commodities.length && s.commodities.join(', '),
    s.customers.length && `${s.customers.join(', ')} programme`,
  ].filter(Boolean)
  return parts.join(' · ') || 'No scope set'
}

export function Login() {
  const { login, setTenant, tenantId } = useNexus()
  const db = useDb()
  const users = useTenantUsers()
  const signals = useVisibleSignals()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [fn, setFn] = useState<RoleFunction | 'All'>('All')
  const functions = useMemo(() => ['All', ...new Set(users.map((u) => getRole(db, u.roleId).function))] as (RoleFunction | 'All')[], [users])
  const counts = useMemo(() => Object.fromEntries(users.map((u) => [u.id, signals.filter((s) => s.status !== 'resolved' && computeAudience(db, users, s).some((r) => r.userId === u.id)).length])), [users])

  const go = (u: UserProfile) => { login(u.id); navigate(u.onboarded === false ? '/onboarding' : landingFor(u.roleId)) }
  const match = (u: UserProfile) => (fn === 'All' || getRole(db, u.roleId).function === fn) && `${u.name} ${u.title} ${getRole(db, u.roleId).name}`.toLowerCase().includes(q.toLowerCase())
  const featured = users.filter((u) => u.featured && match(u))
  const rest = users.filter((u) => !u.featured && match(u))

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
        <div className="hero-panel relative mb-10 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-3xl px-6 py-8 shadow-pop md:px-10 md:py-10">
          <div className="flex items-center gap-4">
            <Logo size={52} />
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-on-brand-2 uppercase">Manufacturing intelligence hub</div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-on-brand md:text-4xl">{BRAND.full}</h1>
              <p className="mt-1 max-w-xl text-sm text-on-brand-2">{BRAND.tagline}</p>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 shadow-card">
            <span className="text-xs font-medium text-ink-3">Tenant</span>
            <select className="bg-transparent text-sm font-medium text-ink outline-none" value={tenantId} onChange={(e) => setTenant(e.target.value)} aria-label="Tenant">
              {Object.values(DBS).map((d) => <option key={d.tenant.id} value={d.tenant.id}>{d.tenant.name}</option>)}
            </select>
          </label>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium tracking-wide text-ink-3 uppercase">Interface</span>
          <UiToggle large />
          <span className="ml-2 text-xs font-medium tracking-wide text-ink-3 uppercase">Colour scheme</span>
          <PalettePicker inline />
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-sm font-semibold text-ink">Sign in as <SimulatedTag what="single sign-on" /></h2>
          <div className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3">
            <Search size={15} className="text-ink-3" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people or roles" className="w-52 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3" aria-label="Search people" />
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by function">
          {functions.map((f) => (
            <button key={f} role="tab" aria-selected={fn === f} onClick={() => setFn(f)} className={cx('h-8 rounded-full border px-3 text-xs font-medium transition-colors', fn === f ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink-2 hover:text-ink')}>{f}</button>
          ))}
        </div>

        {featured.length > 0 && (
          <>
            <div className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">Featured for the demo</div>
            <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((u) => (
                <button key={u.id} onClick={() => go(u)} className="group flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-line-strong">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size={38} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{u.name}</div>
                      <div className="truncate text-xs text-ink-2">{getRole(db, u.roleId).name}</div>
                    </div>
                  </div>
                  <p className="mt-3 flex-1 text-sm text-ink-2">{u.pitch}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-ink-3">
                    <span className="truncate">{scopeLine(u)}</span>
                    {counts[u.id] > 0 && <span className="num shrink-0 rounded-full bg-surface-2 px-2 py-0.5 font-medium text-ink-2">{counts[u.id]} open</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">Directory</div>
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card">
          {rest.map((u, i) => (
            <button key={u.id} onClick={() => go(u)} className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2', i > 0 && 'border-t border-line')}>
              <Avatar name={u.name} size={30} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{u.name}</div>
                <div className="truncate text-xs text-ink-2">{u.title}</div>
              </div>
              <div className="hidden w-56 truncate text-xs text-ink-3 md:block">{scopeLine(u)}</div>
              <div className="num w-16 text-right text-xs text-ink-3">{counts[u.id] ? `${counts[u.id]} open` : ''}</div>
            </button>
          ))}
          {rest.length === 0 && <div className="px-4 py-8 text-center text-sm text-ink-2">No one matches that search.</div>}
        </div>
      </div>
    </div>
  )
}
