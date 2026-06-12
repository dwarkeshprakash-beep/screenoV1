import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../services/api'

const DEMO_ACCOUNTS = [
  { role: 'manager',     name: 'Kiran Oza',         sub: 'Manager · Prakash Infotech',          initials: 'KO', bgColor: '#EDE9FE', fgColor: '#5B21B6', badgeBg: '#3730A3', badgeFg: '#C7D2FE', badge: 'manager',     email: 'kiran.oza@prakashinfotech.com',         password: 'psspl@1234' },
  { role: 'interviewer', name: 'Dwarkesh Vajjala',  sub: 'Tech Interviewer · Prakash Infotech',  initials: 'DV', bgColor: '#BFDBFE', fgColor: '#1E40AF', badgeBg: '#1E3A5F', badgeFg: '#93C5FD', badge: 'interviewer', email: 'dwarkesh.vajjala@prakashinfotech.com',   password: 'psspl@1234' },
  { role: 'candidate',   name: 'Raj Rathod',        sub: 'Candidate · Software Engineer',        initials: 'RR', bgColor: '#A7F3D0', fgColor: 'var(--success-700)', badgeBg: '#064E3B', badgeFg: '#6EE7B7', badge: 'candidate',   email: 'raj.rathod@gmail.com',                   password: 'psspl@1234' },
]

function roleRedirect(role) {
  if (role === 'manager')     return '/manager/dashboard'
  if (role === 'interviewer') return '/interviewer/dashboard'
  if (role === 'candidate')   return '/candidate/dashboard'
  return '/login'
}

function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await api.login(email, password)
      localStorage.setItem('accessToken', result.data.accessToken)
      localStorage.setItem('user', JSON.stringify(result.data.user))
      navigate(roleRedirect(result.data.user.role))
    } catch (err) {
      setError(err.message || 'Could not sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function selectDemo(account) {
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
    setLoading(true)
    try {
      const result = await api.login(account.email, account.password)
      localStorage.setItem('accessToken', result.data.accessToken)
      localStorage.setItem('user', JSON.stringify(result.data.user))
      navigate(roleRedirect(result.data.user.role))
    } catch (err) {
      setError(err.message || 'Demo login failed. Please try again.')
    } finally {
      setLoading(false)
    }
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
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--slate-400)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1.125rem' }}>Demo Accounts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
            {DEMO_ACCOUNTS.map(a => (
              <DemoButton key={a.email} account={a} onSelect={selectDemo} />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, height: 1, background: '#334155' }} />
            <span style={{ color: '#475569', fontSize: '0.75rem' }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: '#334155' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ color: 'var(--slate-400)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Email</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: 'var(--slate-400)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            </div>

            {error && <p style={{ fontSize: '0.8125rem', color: '#EF4444' }}>{error}</p>}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.25rem' }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p style={{ color: '#475569', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem' }}>Secure end-to-end encrypted</p>
        </div>
      </div>
    </div>
  )
}

function DemoButton({ account, onSelect }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onSelect(account)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: 'var(--slate-900)', border: `1px solid ${hovered ? 'var(--brand-500)' : '#334155'}`, borderRadius: '0.625rem', cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms', width: '100%' }}
    >
      <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: account.bgColor, color: account.fgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
        {account.initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--bg-surface)' }}>{account.name}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.125rem' }}>{account.sub}</div>
      </div>
      <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '0.375rem', background: account.badgeBg, color: account.badgeFg, letterSpacing: '0.04em', textTransform: 'capitalize' }}>
        {account.badge}
      </span>
    </button>
  )
}

export default LoginPage
