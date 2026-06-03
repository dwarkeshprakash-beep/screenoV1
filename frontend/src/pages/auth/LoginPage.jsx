// pages/auth/LoginPage.jsx
// Login screen — dark navy design with demo accounts + email/password form.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../services/api'

// Screeno logo — two purple rectangles
function ScreenoLogo({ size = 44 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <div style={{
        position: 'absolute',
        top: size * 0.15, left: size * 0.1,
        width: size * 0.7, height: size * 0.28,
        background: 'var(--brand-500)',
        borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute',
        top: size * 0.52, left: size * 0.22,
        width: size * 0.7, height: size * 0.28,
        background: 'var(--brand-400)',
        borderRadius: 4,
      }} />
    </div>
  )
}

const DEMO_ACCOUNTS = [
  { label: 'Kiran Patel', sub: 'Manager · Acme Corp', badge: 'manager',     initials: 'KP', color: '#5B4FE9', email: 'kiran@acmecorp.com',  password: 'demo123' },
  { label: 'Anand Rao',   sub: 'Tech Interviewer · Acme', badge: 'interviewer', initials: 'AR', color: '#2563EB', email: 'anand@acmecorp.com',  password: 'demo123' },
]

function DemoButton({ account, onSelect }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onSelect(account)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: '#0F172A',
        border: `1px solid ${hovered ? 'var(--brand-500)' : '#334155'}`,
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 36, height: 36,
        borderRadius: '50%',
        background: account.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 13, fontWeight: 700,
        flexShrink: 0,
      }}>
        {account.initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{account.label}</div>
        <div style={{ color: '#94A3B8', fontSize: 12 }}>{account.sub}</div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 99,
        background: account.badge === 'manager' ? '#3730A3' : '#1E3A5F',
        color: account.badge === 'manager' ? '#C7D2FE' : '#93C5FD',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {account.badge}
      </span>
    </button>
  )
}

function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  /**
   * Submit login form — store access token and route by role.
   */
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await api.login(email, password)
      localStorage.setItem('accessToken', result.data.accessToken)
      localStorage.setItem('user', JSON.stringify(result.data.user))

      const role = result.data.user.role
      if (role === 'manager')     navigate('/manager/dashboard')
      else if (role === 'interviewer') navigate('/interviewer/dashboard')
      else navigate('/login')
    } catch (err) {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Click a demo account button — auto-fill and submit.
   */
  function selectDemo(account) {
    setEmail(account.email)
    setPassword(account.password)
    // Submit immediately
    setError(null)
    setLoading(true)
    api.login(account.email, account.password).then(result => {
      localStorage.setItem('accessToken', result.data.accessToken)
      localStorage.setItem('user', JSON.stringify(result.data.user))
      const role = result.data.user.role
      if (role === 'manager')     navigate('/manager/dashboard')
      else if (role === 'interviewer') navigate('/interviewer/dashboard')
      else navigate('/login')
    }).catch(() => {
      setEmail(account.email)
      setPassword(account.password)
      setError('Demo login failed. Use the form below to sign in manually.')
    }).finally(() => setLoading(false))
  }

  // Input style for dark card
  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0F172A',
      padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo + wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <ScreenoLogo size={44} />
            <span style={{ color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Screeno
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 6 }}>
            AI-powered hiring platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#1E293B',
          border: '1px solid #334155',
          borderRadius: 16,
          padding: 28,
        }}>
          {/* Demo accounts */}
          <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Demo Accounts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {DEMO_ACCOUNTS.map(a => (
              <DemoButton key={a.email} account={a} onSelect={selectDemo} />
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#334155' }} />
            <span style={{ color: '#475569', fontSize: 12 }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: '#334155' }} />
          </div>

          {/* Email + password form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: 'var(--danger-500)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--brand-500)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: 4,
              }}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          {/* Security note */}
          <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
            🔒 Secure end-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
