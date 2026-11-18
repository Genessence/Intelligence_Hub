import { MessageSquare, MessageSquareText } from 'lucide-react'
import { useCurrentUser } from '@/store/useNexus'
import { PageHeader } from '@/components/Shell'
import { Card, cx } from '@/components/ui/primitives'
import { AssistantHeaderTools, Composer, ProductionNote, Suggestions, Thread, useChat, useLang } from './chat'

export function AssistantPage() {
  const user = useCurrentUser()!
  const { messages, ask, clear, animId } = useChat()
  const { hi, toggle } = useLang()
  const questions = messages.filter((m) => m.role === 'user')
  return (
    <>
      <PageHeader title={<span className="flex items-center gap-2"><MessageSquareText size={20} className="text-accent-ink" /> Nexus Assistant</span>} sub="Ask across EXIM, SAP, NPD, Tooling, R&D, Capex, Vendor Management and your uploaded data." actions={<AssistantHeaderTools hi={hi} onToggleHi={toggle} onClear={clear} />} />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-4">
          <Card title="History" pad={false}>
            {questions.length === 0 ? <p className="p-4 text-xs text-ink-3">Your questions appear here.</p> : (
              <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
                {questions.map((m) => (
                  <li key={m.id}><a href={`#/assistant`} onClick={(e) => { e.preventDefault(); document.getElementById(m.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} className="flex gap-2 px-4 py-2.5 text-xs text-ink-2 hover:bg-surface-2 hover:text-ink"><MessageSquare size={13} className="mt-0.5 shrink-0 text-ink-3" /> <span className="line-clamp-2">{m.text}</span></a></li>
                ))}
              </ul>
            )}
          </Card>
          <ProductionNote />
        </div>
        <Card className="flex min-h-[560px] flex-col" pad={false}>
          <div className={cx('flex-1 overflow-y-auto p-5', messages.length === 0 && 'flex items-center')}>
            {messages.length === 0 ? (
              <div className="mx-auto max-w-md text-center">
                <MessageSquareText size={28} className="mx-auto mb-3 text-accent-ink" />
                <p className="text-sm text-ink">Good morning {user.name.split(' ')[0]}. What would you like to know?</p>
                <p className="mt-1 text-xs text-ink-3">Try a suggestion below, or type a part code, vendor, shipment or project.</p>
              </div>
            ) : <Thread messages={messages} animId={animId} hi={hi} onAsk={ask} />}
          </div>
          <div className="space-y-2 border-t border-line p-4">
            <Suggestions onAsk={ask} />
            <Composer onAsk={ask} autoFocus />
          </div>
        </Card>
      </div>
    </>
  )
}
