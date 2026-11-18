// /mobile: the presenter view of the phone app. The app inside the frame is the real UI on the same store.
import { useEffect, useState } from 'react'
import { ExternalLink, Moon, Sun } from 'lucide-react'
import { useNexus, useCurrentUser, useTenantUsers, useVisibleSignals } from '@/store/useNexus'
import { PageHeader } from '@/components/Shell'
import { Button, cx, SimulatedTag } from '@/components/ui/primitives'
import type { ThemePref } from '@/theme/ThemeProvider'
import { MobileApp } from './MobileApp'
import type { Screen } from './screens'

interface Scene { id: string; label: string; screen: (sig?: string) => Screen; callouts: string[] }

const SCENES: Scene[] = [
  { id: 'lock', label: 'Lock-screen push', screen: (sig) => ({ name: 'lock', signalId: sig }), callouts: ['A critical signal reaches the right person on their phone, computed from role and scope.', 'Tap opens straight into the signal after biometric sign-in.', 'Fire any scenario live from the Presenter panel (Shift+D).'] },
  { id: 'splash', label: 'Splash and sign-in', screen: () => ({ name: 'splash' }), callouts: ['Biometric sign-in on the device.', 'Single sign-on with the company directory in production.'] },
  { id: 'today', label: 'Today', screen: () => ({ name: 'today' }), callouts: ['The Assistant brief and three KPI cards from this user’s own dashboard.', 'Swipe the cards. Every number is computed from SAP and module data.'] },
  { id: 'signals', label: 'Signals feed', screen: () => ({ name: 'signals' }), callouts: ['Swipe right to acknowledge, left to snooze.', 'Pull down to refresh.'] },
  { id: 'signal', label: 'Signal detail', screen: (sig) => ({ name: 'signal', id: sig ?? '' }), callouts: ['Impact numbers and a vertical ripple list built for small screens.', 'Proceed opens a bottom-sheet stepper that books value to the ledger.'] },
  { id: 'approvals', label: 'Approvals', screen: () => ({ name: 'approvals' }), callouts: ['Capex PO release, SAP PRs, price locks and Finance validation in one list.', 'Swipe to approve.'] },
  { id: 'ask', label: 'Ask Nexus', screen: () => ({ name: 'ask' }), callouts: ['Ask by voice or text.', 'Answers come from the same engine as the desktop Assistant.'] },
  { id: 'entity', label: 'Entity quick view', screen: () => ({ name: 'entity', kind: 'part', id: '310000451', back: { name: 'today' } }), callouts: ['Key SAP fields for a part, with the table-field on every value.', 'Call the vendor or share in one tap.'] },
  { id: 'me', label: 'Profile', screen: () => ({ name: 'me' }), callouts: ['Theme, notification channels by severity, language, quiet hours.', 'Scope and delegate are read-only here; admins set them.'] },
]

export function MobilePreview() {
  const user = useCurrentUser()
  const users = useTenantUsers()
  const signals = useVisibleSignals()
  const { login, pendingPush } = useNexus()
  const [scene, setScene] = useState<Scene>(SCENES[0])
  const [screen, setScreen] = useState<Screen>(SCENES[0].screen())
  const [phoneTheme, setPhoneTheme] = useState<ThemePref>('light')
  const heroSig = signals.find((s) => s.severity === 'critical')?.id ?? signals[0]?.id

  // A signal fired live from the Presenter panel lands on the phone's lock screen.
  useEffect(() => {
    if (!pendingPush) return
    setScene(SCENES[0])
    setScreen({ name: 'lock', signalId: pendingPush.signalId })
  }, [pendingPush])

  const pick = (s: Scene) => { setScene(s); setScreen(s.screen(heroSig)) }
  const resolvedTheme = phoneTheme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : phoneTheme

  return (
    <>
      <PageHeader title="Mobile App Preview" sub="The same Nexus, as a phone app. Click through it: it runs on the live demo data."
        actions={<>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm">
            <span className="text-xs text-ink-3">User</span>
            <select value={user?.id ?? ''} onChange={(e) => login(e.target.value)} className="bg-transparent text-ink outline-none" aria-label="Phone user">
              {users.filter((u) => u.featured).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <Button onClick={() => setPhoneTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label="Toggle phone theme">{resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} Phone {resolvedTheme === 'dark' ? 'light' : 'dark'}</Button>
          <a href="#/m" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:bg-surface-2"><ExternalLink size={15} /> Open /m</a>
        </>}
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr_260px]">
        <nav aria-label="Scenes" className="space-y-1">
          <div className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">Scenes</div>
          {SCENES.map((s, i) => (
            <button key={s.id} onClick={() => pick(s)} aria-current={scene.id === s.id ? 'true' : undefined} className={cx('flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm', scene.id === s.id ? 'bg-accent-soft font-medium text-accent-ink' : 'text-ink-2 hover:bg-surface-2')}>
              <span className="num w-5 text-xs text-ink-3">{i + 1}</span>{s.label}
            </button>
          ))}
        </nav>

        <div className="flex justify-center">
          {/* Generic device frame: no brand. The data-theme attribute scopes the phone's tokens. */}
          <div className="relative rounded-[52px] border border-line-strong bg-surface-2 p-3 shadow-pop" style={{ width: 390, maxWidth: '100%' }}>
            <div data-theme={resolvedTheme} className="relative overflow-hidden rounded-[40px] border border-line" style={{ height: 'min(780px, calc(100vh - 150px))', minHeight: 560, background: 'var(--bg)', colorScheme: resolvedTheme }}>
              <div className="pointer-events-none absolute top-2.5 left-1/2 z-50 h-7 w-28 -translate-x-1/2 rounded-full" style={{ background: 'var(--text)' }} aria-hidden />
              <MobileApp embedded screen={screen} onScreen={setScreen} phoneTheme={phoneTheme} setPhoneTheme={setPhoneTheme} />
              <div className="pointer-events-none absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full" style={{ background: 'var(--text-3)' }} aria-hidden />
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">What to point out</div>
          {scene.callouts.map((c) => <p key={c} className="rounded-xl border border-line bg-surface p-3 text-sm text-ink-2">{c}</p>)}
          <div className="rounded-xl border border-dashed border-line-strong p-3 text-xs text-ink-3">Installable as an app: open <span className="font-mono">/m</span> on a phone and choose Add to Home Screen. <SimulatedTag what="push notifications" /></div>
        </aside>
      </div>
    </>
  )
}
