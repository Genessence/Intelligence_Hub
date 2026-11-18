import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Toaster } from 'sonner'
import { useCurrentUser } from '@/store/useNexus'
import { useTheme } from '@/theme/ThemeProvider'
import { Shell } from '@/components/Shell'
import { Login } from '@/pages/Login'
import { SignalInbox } from '@/pages/SignalInbox'
import { ImpactExplorer } from '@/pages/ImpactExplorer'
import { ValueLedger } from '@/pages/ValueLedger'
import { CommandCenter } from '@/pages/CommandCenter'
import { BoardPack } from '@/pages/BoardPack'
import { AssistantPage } from '@/assistant/AssistantPage'
import { Commodity360, Model360, Part360, Plant360, Project360, Shipment360, Vendor360 } from '@/pages/entity/Entity360'
import { AppLauncher } from '@/pages/AppLauncher'
import { AppSummary } from '@/pages/AppSummary'
import { Audit, BringYourData, DataFabric, MyProfile, Onboarding, P2PChain, People, Rules, SapConnector, SapFieldExplorer, SourceHub } from '@/pages/platform'
import { MobilePreview } from '@/mobile/MobilePreview'
import { MobileApp } from '@/mobile/MobileApp'
import { landingFor } from '@/config/routes'

function Authed({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  return <Shell>{children}</Shell>
}

function Home() {
  const user = useCurrentUser()
  return <Navigate to={user ? landingFor(user.roleId) : '/login'} replace />
}

/** Phones get the app layout (spec 7.3): below 640px the desktop root redirects to /m. */
function PhoneRedirect() {
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => {
    if (window.innerWidth < 640 && !loc.pathname.startsWith('/m') && loc.pathname !== '/value/board') nav('/m', { replace: true })
  }, [loc.pathname, nav])
  return null
}

const A = (el: ReactNode) => <Authed>{el}</Authed>

export default function App() {
  const { resolved } = useTheme()
  return (
    <Tooltip.Provider>
      <HashRouter>
        <PhoneRedirect />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/command" element={A(<CommandCenter />)} />
          <Route path="/signals" element={A(<SignalInbox />)} />
          <Route path="/signals/:id" element={A(<ImpactExplorer />)} />
          <Route path="/assistant" element={A(<AssistantPage />)} />
          <Route path="/value" element={A(<ValueLedger />)} />
          <Route path="/value/board" element={<BoardPack />} />
          <Route path="/parts/:code" element={A(<Part360 />)} />
          <Route path="/vendors/:id" element={A(<Vendor360 />)} />
          <Route path="/projects/:id" element={A(<Project360 />)} />
          <Route path="/shipments/:ref" element={A(<Shipment360 />)} />
          <Route path="/plants/:code" element={A(<Plant360 />)} />
          <Route path="/commodities/:slug" element={A(<Commodity360 />)} />
          <Route path="/models/:id" element={A(<Model360 />)} />
          <Route path="/apps" element={A(<AppLauncher />)} />
          <Route path="/apps/:id" element={A(<AppSummary />)} />
          <Route path="/sources" element={A(<SourceHub />)} />
          <Route path="/sources/new" element={A(<BringYourData />)} />
          <Route path="/sources/sap" element={A(<SapConnector />)} />
          <Route path="/sources/sap/fields" element={A(<SapFieldExplorer />)} />
          <Route path="/sources/sap/p2p" element={A(<P2PChain />)} />
          <Route path="/fabric" element={A(<DataFabric />)} />
          <Route path="/rules" element={A(<Rules />)} />
          <Route path="/audit" element={A(<Audit />)} />
          <Route path="/admin/people" element={A(<People />)} />
          <Route path="/me" element={A(<MyProfile />)} />
          <Route path="/onboarding" element={A(<Onboarding />)} />
          <Route path="/mobile" element={A(<MobilePreview />)} />
          <Route path="/m/*" element={<MobileApp />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </HashRouter>
      <Toaster theme={resolved} position="bottom-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' } }} />
    </Tooltip.Provider>
  )
}
