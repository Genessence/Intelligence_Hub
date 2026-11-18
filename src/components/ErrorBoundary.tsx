import { Component, type ReactNode } from 'react'

/** Keeps one broken screen from blanking the app; resets when the route changes. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto mt-16 max-w-md rounded-[var(--radius-card)] bg-surface p-6 text-center shadow-card">
        <div className="text-base font-semibold text-ink">This view could not be drawn</div>
        <p className="mt-1 text-sm text-ink-2">The rest of Nexus is fine. Go back, or reset the demo from the user menu.</p>
        <p className="mt-3 font-mono text-xs text-ink-3">{this.state.error.message}</p>
      </div>
    )
  }
}
