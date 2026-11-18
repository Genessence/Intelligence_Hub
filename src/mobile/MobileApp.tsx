// Nexus mobile app. Standalone at /m/* (no Shell) and embedded inside the /mobile phone frame.
import { useCallback, useState } from 'react'
import { Bell, CheckSquare, Home, MessageSquareText, User } from 'lucide-react'
import { useNexus, useCurrentUser, useDb, useTenantUsers } from '@/store/useNexus'
import { getRole } from '@/engine/lookup'
import { BRAND } from '@/config/brand'
import { Logo } from '@/components/Shell'
import { Avatar, cx, SimulatedTag } from '@/components/ui/primitives'
import type { ThemePref } from '@/theme/ThemeProvider'
import { StatusBar, tap } from './mobileUi'
import { Approvals, Ask, EntityQuick, LockScreen, NavCtx, Profile, type Screen, SignalDetail, SignalsFeed, Splash, Today, useApprovals, useMySignals } from './screens'

interface Props {
  embedded?: boolean
  screen?: Screen // controlled by the preview's Scenes rail
  onScreen?: (s: Screen) => void
  phoneTheme?: ThemePref
  setPhoneTheme?: (t: ThemePref) => void
}

export function MobileApp({ embedded, screen: controlled, onScreen, phoneTheme, setPhoneTheme }: Props) {
  const user = useCurrentUser()
  const [own, setOwn] = useState<Screen>({ name: 'splash' })
  const screen = controlled ?? own
  const go = useCallback((s: Screen) => { if (onScreen) onScreen(s); else setOwn(s) }, [onScreen])
  const full = screen.name === 'lock' || screen.name === 'splash'

  return (
    <NavCtx.Provider value={{ go, phoneTheme, setPhoneTheme }}>
      <div className={cx('relative flex flex-col overflow-hidden bg-bg text-ink', embedded ? 'h-full' : 'h-dvh pt-[env(safe-area-inset-top)]')}>
        {embedded && screen.name !== 'lock' && <StatusBar />}
        {!user ? <MobileLogin /> : (
          <>
            <main className="relative min-h-0 flex-1 overflow-y-auto">
              {screen.name === 'lock' && <LockScreen signalId={screen.signalId} />}
              {screen.name === 'splash' && <Splash next={screen.next} />}
              {screen.name === 'today' && <Today />}
              {screen.name === 'signals' && <SignalsFeed />}
              {screen.name === 'signal' && <SignalDetail id={screen.id} />}
              {screen.name === 'approvals' && <Approvals />}
              {screen.name === 'ask' && <Ask />}
              {screen.name === 'me' && <Profile onSignOut={() => go({ name: 'splash' })} />}
              {screen.name === 'entity' && <EntityQuick kind={screen.kind} id={screen.id} back={screen.back} />}
            </main>
            {!full && <TabBar screen={screen} />}
          </>
        )}
      </div>
    </NavCtx.Provider>
  )
}

function TabBar({ screen }: { screen: Screen }) {
  const user = useCurrentUser()!
  const rt = useNexus((s) => s.signals)
  const mine = useMySignals()
  const approvals = useApprovals().length
  const unread = mine.filter((s) => rt[s.id].status === 'new' && !rt[s.id].acks[user.id]).length
  const tabs = [
    { name: 'today', label: 'Today', icon: Home },
    { name: 'signals', label: 'Signals', icon: Bell, badge: unread },
    { name: 'ask', label: 'Ask', icon: MessageSquareText },
    { name: 'approvals', label: 'Approvals', icon: CheckSquare, badge: approvals },
    { name: 'me', label: 'Me', icon: User },
  ] as const
  const active = screen.name === 'signal' ? 'signals' : screen.name === 'entity' ? 'today' : screen.name
  return (
    <nav className="flex shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]" aria-label="App">
      {tabs.map((t) => (
        <NavButton key={t.name} target={{ name: t.name } as Screen} active={active === t.name} label={t.label} badge={'badge' in t ? t.badge : 0} Icon={t.icon} />
      ))}
    </nav>
  )
}

function NavButton({ target, active, label, badge, Icon }: { target: Screen; active: boolean; label: string; badge: number; Icon: typeof Home }) {
  return (
    <NavCtx.Consumer>
      {({ go }) => (
        <button onClick={() => go(target)} aria-current={active ? 'page' : undefined} className={cx('relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[12px]', active ? 'text-accent-ink' : 'text-ink-3', tap)}>
          <Icon size={21} />
          {label}
          {badge > 0 && <span className="num absolute top-1.5 left-1/2 ml-2 inline-flex min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[12px] leading-4 font-semibold text-surface">{badge}</span>}
        </button>
      )}
    </NavCtx.Consumer>
  )
}

/** Standalone sign-in: the same persona directory, phone-sized. */
function MobileLogin() {
  const db = useDb()
  const users = useTenantUsers()
  const { login } = useNexus()
  const featured = users.filter((u) => u.featured)
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-8 pb-6">
      <div className="flex items-center gap-3"><Logo size={40} /><div><div className="text-lg font-semibold text-ink">{BRAND.full}</div><div className="text-sm text-ink-2">{db.tenant.name}</div></div></div>
      <div className="mt-6 mb-2 flex items-center gap-2 text-sm font-medium text-ink">Sign in as <SimulatedTag what="single sign-on" /></div>
      <div className="space-y-2">
        {featured.map((u) => (
          <button key={u.id} onClick={() => login(u.id)} className={cx('flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left', tap)}>
            <Avatar name={u.name} size={36} />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{u.name}</span><span className="block truncate text-xs text-ink-2">{getRole(db, u.roleId).name}</span></span>
          </button>
        ))}
      </div>
    </div>
  )
}
