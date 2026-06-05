import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../services/api'

const DEMO_ACCOUNTS = [
  { role: 'manager',     name: 'Kiran Oza',         sub: 'Manager · Prakash Infotech',          initials: 'KO', bgColor: '#EDE9FE', fgColor: '#5B21B6', badgeBg: '#3730A3', badgeFg: '#C7D2FE', badge: 'manager',     email: 'kiran.oza@prakashinfotech.com',         password: 'Admin@1234' },
  { role: 'interviewer', name: 'Dwarkesh Vajjala',  sub: 'Tech Interviewer · Prakash Infotech',  initials: 'DV', bgColor: '#BFDBFE', fgColor: '#1E40AF', badgeBg: '#1E3A5F', badgeFg: '#93C5FD', badge: 'interviewer', email: 'dwarkesh.vajjala@prakashinfotech.com',   password: 'Admin@1234' },
  { role: 'candidate',   name: 'Arjun Mehta',       sub: 'Candidate · Software Engineer',        initials: 'AM', bgColor: '#A7F3D0', fgColor: '#065F46', badgeBg: '#064E3B', badgeFg: '#6EE7B7', badge: 'candidate',   email: 'arjun.mehta@gmail.com',                  password: 'Admin@1234' },
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
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function selectDemo(account) {
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
    setLoading(true)
    api.login(account.email, account.password).then(result => {
      localStorage.setItem('accessToken', result.data.accessToken)
      localStorage.setItem('user', JSON.stringify(result.data.user))
      navigate(roleRedirect(result.data.user.role))
    }).catch(() => {
      setEmail(account.email)
      setPassword(account.password)
      setError('Demo login failed. Use the form below to sign in manually.')
    }).finally(() => setLoading(false))
  }

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
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#5B4FE9,#4A3FCE)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 11, top: 14, width: 22, height: 3, background: '#FFF', borderRadius: 2, opacity: 0.95 }} />
              <div style={{ position: 'absolute', left: 11, top: 21, width: 22, height: 3, background: '#FFF', borderRadius: 2, opacity: 0.6 }} />
            </div>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#FFF', letterSpacing: '-0.025em' }}>Screeno</span>
          </div>
          <p style={{ fontSize: 14, color: '#64748B' }}>AI-powered hiring platform</p>
        </div>

        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 16, padding: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 18 }}>Demo Accounts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {DEMO_ACCOUNTS.map(a => (
              <DemoButton key={a.email} account={a} onSelect={selectDemo} />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#334155' }} />
            <span style={{ color: '#475569', fontSize: 12 }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: '#334155' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            </div>

            {error && <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#5B4FE9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 16 }}>Secure end-to-end encrypted</p>
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
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#0F172A', border: `1px solid ${hovered ? '#5B4FE9' : '#334155'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms', width: '100%' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: account.bgColor, color: account.fgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
        {account.initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#FFF' }}>{account.name}</div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{account.sub}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: account.badgeBg, color: account.badgeFg, letterSpacing: '0.04em', textTransform: 'capitalize' }}>
        {account.badge}
      </span>
    </button>
  )
}

export default LoginPage
