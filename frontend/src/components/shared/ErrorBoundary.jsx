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
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-heading, #0F172A)' }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: 'var(--fg-muted, #64748B)', maxWidth: 420 }}>
            This page ran into an unexpected error. Reloading usually fixes it — your data is safe.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              borderRadius: 8,
              background: 'var(--brand-500, #5B4FE9)',
              color: '#FFF',
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
