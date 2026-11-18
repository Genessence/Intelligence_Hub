import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import { Bell, Blocks, Database, Inbox, LayoutDashboard, Laptop, LogOut, Moon, Network, RotateCcw, ScrollText, Smartphone, Sun, UserCog, Users, Wallet, Workflow, Search, Presentation, MessageSquareText } from 'lucide-react'
import { toast } from 'sonner'
import { useNexus, useCurrentUser, useDb, useTenantUsers, useVisibleSignals } from '@/store/useNexus'
import { useTheme, type ThemePref } from '@/theme/ThemeProvider'
import { computeAudience } from '@/engine/audience'
import { getRole } from '@/engine/lookup'
import { BRAND } from '@/config/brand'
import { landingFor } from '@/config/routes'
import { PalettePicker } from './PalettePicker'
import { UiToggle } from './UiToggle'
import { AssistantDrawer } from '@/assistant/AssistantDrawer'
import { CommandPalette } from './CommandPalette'
import { PresenterPanel } from './PresenterPanel'
import { CriticalPopup } from './CriticalPopup'
import { Avatar, Button, cx, SimulatedTag, Tip } from './ui/primitives'

const NAV: { group: string; items: { to: string; label: string; icon: typeof Inbox; tile: string; ink?: string; count?: boolean }[] }[] = [
  { group: 'Decide', items: [
    { to: '/command', label: 'Command Center', icon: LayoutDashboard, tile: 'var(--id-rnd)' },
    { to: '/signals', label: 'Signal Inbox', icon: Inbox, tile: 'var(--critical-fill, var(--critical))', count: true },
    { to: '/assistant', label: 'Ask Nexus', icon: MessageSquareText, tile: 'var(--id-exim)' },
    { to: '/value', label: 'Value Ledger', icon: Wallet, tile: 'var(--resolved-fill, var(--resolved))' },
  ] },
  { group: 'All software', items: [
    { to: '/apps', label: 'App Launcher', icon: Blocks, tile: 'var(--id-sap)' },
    { to: '/sources', label: 'Source Hub', icon: Database, tile: 'var(--id-cost)' },
    { to: '/fabric', label: 'Data Fabric', icon: Network, tile: 'var(--id-npd)' },
  ] },
  { group: 'Govern', items: [
    { to: '/rules', label: 'Rules', icon: Workflow, tile: 'var(--id-tooling)' },
    { to: '/audit', label: 'Audit Trail', icon: ScrollText, tile: 'var(--id-sap)' },
    { to: '/admin/people', label: 'People & Roles', icon: UserCog, tile: 'var(--id-vendor)', ink: 'var(--id-vendor-ink)' },
  ] },
  { group: 'Mobile', items: [
    { to: '/mobile', label: 'Mobile App Preview', icon: Smartphone, tile: 'var(--id-rnd)' },
  ] },
]


export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const collapsed = false // constant sidebar: always expanded and fixed in place
  const sideUser = useCurrentUser()
  const sideDb = useDb()
  const sideUsers = useTenantUsers()
  const sideSignals = useVisibleSignals()
  const sideRt = useNexus((x) => x.signals)
  const openCount = sideUser ? sideSignals.filter((x) => !['resolved', 'dismissed'].includes(sideRt[x.id].status) && computeAudience(sideDb, sideUsers, x).some((r) => r.userId === sideUser.id)).length : 0

  return (
    <div className="flex h-full">
      <aside className="brand-panel fixed inset-y-0 left-0 z-40 hidden w-60 flex-col md:flex">
        <div className={cx('flex h-14 items-center gap-2.5 border-b', collapsed ? 'justify-center' : 'px-4')} style={{ borderColor: 'color-mix(in oklab, var(--on-brand) 12%, transparent)' }}>
          <Logo />
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide text-on-brand">{BRAND.product}</div>
              <div className="text-xs text-on-brand-2"><span className="classic-only">{BRAND.company}</span><span className="apple-only">{sideDb.tenant.name}</span></div>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Main">
          {NAV.map((g) => (
            <div key={g.group}>
              {!collapsed && <div className="px-2 pb-1.5 text-xs font-medium tracking-wide text-on-brand-2 uppercase">{g.group}</div>}
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} className={({ isActive }) => cx('relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors', isActive ? 'nav-active font-medium text-on-brand' : 'text-on-brand-2 hover:text-on-brand nav-hover', collapsed && 'justify-center px-0')}>
                  <span className="nav-icon" style={{ ['--tile-color' as string]: it.tile, ['--tile-ink' as string]: it.ink ?? 'white' }}><it.icon size={17} aria-hidden /></span>
                  {collapsed ? <span className="sr-only">{it.label}</span> : <span className="flex-1">{it.label}</span>}
                  {it.count && openCount > 0 && <span className="num text-xs text-ink-2">{openCount}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        {sideUser && (
          <div className="apple-only border-t border-line p-3">
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
              <Avatar name={sideUser.name} size={30} />
              <div className="min-w-0 leading-tight"><div className="truncate text-sm font-medium text-ink">{sideUser.name}</div><div className="truncate text-xs text-ink-2">{getRole(sideDb, sideUser.roleId).name}</div></div>
            </div>
          </div>
        )}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        <TopBar />
        <main className="page-enter mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-8"><ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary></main>
      </div>
      <AssistantDrawer />
      <CommandPalette />
      <PresenterPanel />
      <CriticalPopup />
    </div>
  )
}

export const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-label={BRAND.full} role="img">
    <rect width="32" height="32" rx="8" fill="var(--accent)" />
    <circle cx="16" cy="16" r="3.2" fill="var(--on-accent)" />
    <g stroke="var(--on-accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.9">
      <path d="M16 6.5v4.5M16 21v4.5M6.5 16H11M21 16h4.5M9.3 9.3l3.2 3.2M19.5 19.5l3.2 3.2M22.7 9.3l-3.2 3.2M12.5 19.5l-3.2 3.2" />
    </g>
  </svg>
)

function TopBar() {
  const user = useCurrentUser()
  const db = useDb()
  const users = useTenantUsers()
  const signals = useVisibleSignals()
  const runtime = useNexus((s) => s.signals)
  const navigate = useNavigate()
  const unread = user
    ? signals.filter((s) => runtime[s.id].status === 'new' && !runtime[s.id].acks[user.id] && computeAudience(db, users, s).some((r) => r.userId === user.id)).length
    : 0
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line px-4 backdrop-blur-md md:px-8" style={{ background: 'var(--topbar)' }}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="md:hidden"><Logo size={24} /></span>
        <span className="truncate text-sm font-medium text-ink">{db.tenant.name}</span>
        <span className="hidden items-center gap-1.5 rounded-md border border-line px-1.5 text-xs text-ink-2 sm:inline-flex h-5">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden /> {db.tenant.erp.system} connected
        </span>
        <span className="hidden sm:inline"><SimulatedTag what="SAP connection" /></span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <button onClick={() => window.dispatchEvent(new CustomEvent('nexus:palette'))} className="hidden h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink-3 hover:text-ink md:inline-flex" aria-label="Search">
          <Search size={14} /> Search <kbd className="rounded border border-line px-1 font-mono text-[12px]">⌘K</kbd>
        </button>
        <UiToggle />
        <span className="classic-only"><PalettePicker /></span>
        <ThemeSwitch />
        <Tip text={`${unread} new signal${unread === 1 ? '' : 's'} for you`}>
          <button onClick={() => navigate('/signals')} className="relative inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label={`Notifications, ${unread} new`}>
            <Bell size={18} />
            {unread > 0 && <span className="num absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[12px] leading-4 font-semibold text-surface">{unread}</span>}
          </button>
        </Tip>
        {user && <UserMenu />}
      </div>
    </header>
  )
}

function ThemeSwitch() {
  const { pref, setPref } = useTheme()
  const opts: { v: ThemePref; icon: typeof Sun; label: string }[] = [
    { v: 'system', icon: Laptop, label: 'System theme' },
    { v: 'light', icon: Sun, label: 'Light theme' },
    { v: 'dark', icon: Moon, label: 'Dark theme' },
  ]
  return (
    <div className="flex h-8 items-center rounded-lg border border-line bg-surface p-0.5" role="radiogroup" aria-label="Theme">
      {opts.map((o) => (
        <button key={o.v} role="radio" aria-checked={pref === o.v} aria-label={o.label} title={o.label} onClick={() => setPref(o.v)}
          className={cx('inline-flex size-7 items-center justify-center rounded-md transition-colors', pref === o.v ? 'bg-surface-2 text-ink' : 'text-ink-3 hover:text-ink')}>
          <o.icon size={15} />
        </button>
      ))}
    </div>
  )
}

function UserMenu() {
  const user = useCurrentUser()!
  const db = useDb()
  const users = useTenantUsers()
  const { login, logout, reset } = useNexus()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  useEffect(() => {
    const on = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', on); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', on); document.removeEventListener('keydown', esc) }
  }, [])
  const featured = users.filter((u) => u.featured && u.id !== user.id)
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex h-9 items-center gap-2 rounded-lg pr-2 pl-1 hover:bg-surface-2" aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={user.name} />
        <span className="hidden text-left leading-tight lg:block">
          <span className="block text-sm font-medium text-ink">{user.name}</span>
          <span className="block text-xs text-ink-3">{getRole(db, user.roleId).name}</span>
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="border-b border-line px-3 py-2 text-xs font-medium text-ink-3">Switch user</div>
          <div className="max-h-72 overflow-y-auto py-1">
            {featured.map((u) => (
              <button key={u.id} role="menuitem" onClick={() => { login(u.id); setOpen(false); navigate(landingFor(u.roleId)); toast(`Signed in as ${u.name}`) }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2">
                <Avatar name={u.name} size={26} />
                <span className="min-w-0 leading-tight"><span className="block truncate text-sm text-ink">{u.name}</span><span className="block truncate text-xs text-ink-3">{u.title}</span></span>
              </button>
            ))}
          </div>
          <div className="space-y-0.5 border-t border-line p-1">
            <button role="menuitem" onClick={() => { setOpen(false); navigate('/me') }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2"><UserCog size={15} /> My profile</button>
            <button role="menuitem" onClick={() => { setOpen(false); navigate('/login') }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2"><Users size={15} /> All users and tenants</button>
            <button role="menuitem" onClick={() => { setOpen(false); useNexus.getState().setPresenterOpen(true) }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2"><Presentation size={15} /> Presenter panel <kbd className="ml-auto font-mono text-[12px] text-ink-3">Shift+D</kbd></button>
            <button role="menuitem" onClick={() => { reset(); setOpen(false); navigate('/login'); toast('Demo reset to the seeded state') }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2"><RotateCcw size={15} /> Reset demo</button>
            <button role="menuitem" onClick={() => { logout(); navigate('/login') }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2"><LogOut size={15} /> Sign out</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-2">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export { Button }
