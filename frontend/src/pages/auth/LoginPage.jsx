import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import * as api from '../../services/api'

function initialsFor(account) {
  const source = account.name || account.email || account.role || 'U'
  return source
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

function parseDemoAccounts() {
  try {
    const accounts = JSON.parse(import.meta.env.VITE_DEMO_ACCOUNTS || '[]')
    if (!Array.isArray(accounts)) return []

    return accounts
      .filter(account => account?.email && account?.password && account?.role)
      .map(account => ({
        ...account,
        name: account.name || account.email,
        sub: account.sub || account.role,
        initials: account.initials || initialsFor(account),
        bgColor: account.bgColor || '#EDE9FE',
        fgColor: account.fgColor || '#5B21B6',
        badgeBg: account.badgeBg || '#3730A3',
        badgeFg: account.badgeFg || '#C7D2FE',
      }))
  } catch {
    return []
  }
}

const showDemoAccounts = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true'
const showQuickAccessAccounts = import.meta.env.VITE_SHOW_QUICK_ACCESS_ACCOUNTS !== 'false'
const quickAccessPassword = import.meta.env.VITE_QUICK_LOGIN_DEFAULT_PASSWORD || 'Test@1234'
const configuredDemoAccounts = showDemoAccounts
  ? parseDemoAccounts()
  : []
const QUICK_ACCESS_ACCOUNTS = showQuickAccessAccounts ? [
  {
    role: 'manager',
    name: 'Kiran Oza',
    sub: 'Manager quick access',
    initials: 'KO',
    email: 'kiran.oza@prakashinfotech.com',
    password: import.meta.env.VITE_QUICK_LOGIN_KIRAN_PASSWORD || import.meta.env.VITE_QUICK_LOGIN_MANAGER_PASSWORD || quickAccessPassword,
    bgColor: '#EDE9FE',
    fgColor: '#5B21B6',
    badgeBg: '#3730A3',
    badgeFg: '#C7D2FE',
  },
  {
    role: 'candidate',
    name: 'Dwarkesh Vajjala',
    sub: 'Candidate quick access',
    initials: 'DV',
    email: 'dwarkesh.vajjala@prakashinfotech.com',
    password: import.meta.env.VITE_QUICK_LOGIN_DWARKESH_PASSWORD || import.meta.env.VITE_QUICK_LOGIN_CANDIDATE_PASSWORD || quickAccessPassword,
    bgColor: '#FEE2E2',
    fgColor: '#B91C1C',
    badgeBg: '#7F1D1D',
    badgeFg: '#FECACA',
  },
].filter(account => account.password) : []

function mergeDemoAccounts(accounts) {
  const byEmail = new Map()
  for (const account of accounts) {
    if (!account?.email || !account?.password) continue
    byEmail.set(account.email.toLowerCase(), {
      ...account,
      name: account.name || account.email,
      sub: account.sub || account.role,
      initials: account.initials || initialsFor(account),
      bgColor: account.bgColor || '#EDE9FE',
      fgColor: account.fgColor || '#5B21B6',
      badgeBg: account.badgeBg || '#3730A3',
      badgeFg: account.badgeFg || '#C7D2FE',
    })
  }
  return [...byEmail.values()]
}

const DEMO_ACCOUNTS = mergeDemoAccounts([
  ...QUICK_ACCESS_ACCOUNTS,
  ...configuredDemoAccounts,
])

function roleRedirect(role) {
  if (role === 'manager') return '/manager/dashboard'
  if (role === 'candidate') return '/candidate/dashboard'
  if (role === 'admin') return '/admin/dashboard'
  return '/login'
}

function LoginPage() {
  const navigate = useNavigate()
  const initialResetToken = (() => {
    try { return new URLSearchParams(window.location.search).get('reset') || '' } catch { return '' }
  })()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState(initialResetToken ? 'reset' : 'login')
  const [resetToken, setResetToken] = useState(initialResetToken)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  async function signIn(loginEmail, loginPassword) {
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const result = await api.login(loginEmail, loginPassword)
      if (!['manager', 'candidate', 'admin'].includes(result.data.user.role)) {
        throw new Error('This account type is paused in Screeno V2.')
      }
      localStorage.setItem('accessToken', result.data.accessToken)
      localStorage.setItem('user', JSON.stringify(result.data.user))
      window.dispatchEvent(new Event('user_login'))
      navigate(roleRedirect(result.data.user.role))
    } catch (err) {
      setError(err.message || 'Could not sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await signIn(email, password)
  }

  async function handleForgotSubmit(event) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      await api.forgotPassword(email)
      setMessage('If that email exists, a password reset link has been sent.')
    } catch (err) {
      setError(err.message || 'Could not request password reset.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetSubmit(event) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await api.resetPassword(resetToken, password)
      setPassword('')
      setConfirmPassword('')
      setResetToken('')
      setMode('login')
      setMessage('Password updated. Please sign in.')
    } catch (err) {
      setError(err.message || 'Could not reset password.')
    } finally {
      setLoading(false)
    }
  }

  async function selectDemo(account) {
    setEmail(account.email)
    setPassword(account.password)
    await signIn(account.email, account.password)
  }

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--slate-900)',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: 'var(--bg-surface)',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--slate-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
      <div style={{ width: '100%', maxWidth: '28rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
            <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,var(--brand-500),var(--brand-600))', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '25%', top: '32%', width: '50%', height: '10%', background: 'var(--bg-surface)', borderRadius: '0.125rem', opacity: 0.95 }} />
              <div style={{ position: 'absolute', left: '25%', top: '56%', width: '50%', height: '10%', background: 'var(--bg-surface)', borderRadius: '0.125rem', opacity: 0.6 }} />
            </div>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--bg-surface)', letterSpacing: '-0.025em' }}>Screeno</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748B' }}>AI-powered hiring platform</p>
        </div>

        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '1rem', padding: '1.75rem' }}>
          {mode === 'login' && DEMO_ACCOUNTS.length > 0 && (
            <>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--slate-400)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.125rem' }}>Quick access</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
                {DEMO_ACCOUNTS.map(account => (
                  <DemoButton key={account.email} account={account} onSelect={selectDemo} loading={loading} />
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, height: 1, background: '#334155' }} />
                <span style={{ color: '#475569', fontSize: '0.75rem' }}>or sign in with email</span>
                <div style={{ flex: 1, height: 1, background: '#334155' }} />
              </div>
            </>
          )}

          {mode === 'login' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ color: 'var(--slate-400)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Email</label>
                <input type="email" placeholder="you@company.com" value={email} onChange={event => setEmail(event.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={{ color: 'var(--slate-400)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={event => setPassword(event.target.value)} required style={{ ...inputStyle, paddingRight: '2.75rem' }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: '#64748B', display: 'inline-flex', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p role="alert" style={{ fontSize: '0.8125rem', color: '#EF4444' }}>{error}</p>}
              {message && <p role="status" style={{ fontSize: '0.8125rem', color: '#86EFAC' }}>{message}</p>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.25rem' }}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <button type="button" onClick={() => { setMode('forgot'); setError(null); setMessage(null) }} style={{ background: 'transparent', border: 0, color: '#94A3B8', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem' }}>
                Forgot password?
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ color: 'var(--slate-400)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Email</label>
                <input type="email" placeholder="you@company.com" value={email} onChange={event => setEmail(event.target.value)} required style={inputStyle} />
              </div>
              {error && <p role="alert" style={{ fontSize: '0.8125rem', color: '#EF4444' }}>{error}</p>}
              {message && <p role="status" style={{ fontSize: '0.8125rem', color: '#86EFAC' }}>{message}</p>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.25rem' }}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => { setMode('login'); setError(null); setMessage(null) }} style={{ background: 'transparent', border: 0, color: '#94A3B8', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem' }}>
                Back to sign in
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ color: 'var(--slate-400)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>New password</label>
                <input type={showPassword ? 'text' : 'password'} placeholder="New password" value={password} onChange={event => setPassword(event.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={{ color: 'var(--slate-400)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Confirm password</label>
                <input type={showPassword ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required style={inputStyle} />
              </div>
              <button type="button" onClick={() => setShowPassword(p => !p)} style={{ background: 'transparent', border: 0, color: '#94A3B8', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem', alignSelf: 'flex-start' }}>
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
              {error && <p role="alert" style={{ fontSize: '0.8125rem', color: '#EF4444' }}>{error}</p>}
              {message && <p role="status" style={{ fontSize: '0.8125rem', color: '#86EFAC' }}>{message}</p>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.25rem' }}>
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function DemoButton({ account, onSelect, loading }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onSelect(account)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={loading}
      style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: 'var(--slate-900)', border: `1px solid ${hovered ? 'var(--brand-500)' : '#334155'}`, borderRadius: '0.625rem', cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'border-color 150ms', width: '100%', opacity: loading ? 0.6 : 1 }}
    >
      <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: account.bgColor, color: account.fgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
        {account.initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--bg-surface)' }}>{account.name}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.125rem' }}>{account.sub}</div>
      </div>
      <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '0.375rem', background: account.badgeBg, color: account.badgeFg, letterSpacing: '0.04em', textTransform: 'capitalize' }}>
        {account.role}
      </span>
    </button>
  )
}

export default LoginPage
