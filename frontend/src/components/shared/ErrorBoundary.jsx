// ErrorBoundary — catches render-time crashes in its subtree and shows a
// fallback instead of leaving the user with a blank white page.
// Class component required: React only supports error boundaries via
// componentDidCatch / getDerivedStateFromError, no hook equivalent exists.

import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI crash:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  handleDashboard = () => {
    let role = null
    try {
      role = JSON.parse(localStorage.getItem('user') || '{}').role || null
    } catch { /* use login fallback */ }
    const target = role === 'manager'
      ? '/manager/dashboard'
      : role === 'candidate'
        ? '/candidate/overview'
        : role === 'admin'
          ? '/admin/dashboard'
          : '/login'
    window.location.assign(target)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            minHeight: '100vh',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-heading, var(--slate-900))' }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: 'var(--fg-muted, #64748B)', maxWidth: 420 }}>
            This page ran into an unexpected error. Reloading usually fixes it — your data is safe.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleDashboard}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, border: '1px solid var(--border-default, #CBD5E1)', borderRadius: 8, background: 'var(--bg-surface, #FFF)', color: 'var(--fg-body, #334155)', cursor: 'pointer' }}
            >
              Go to dashboard
            </button>
            <button
              onClick={this.handleReload}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, background: 'var(--brand-500, #6D4AFF)', color: 'var(--bg-surface, #FFF)', cursor: 'pointer' }}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
