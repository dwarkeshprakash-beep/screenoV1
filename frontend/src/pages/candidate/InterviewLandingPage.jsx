import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Briefcase, Video, Calendar, ArrowRight } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'

function InterviewLandingPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [interview, setInterview] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => { validate() }, [token])

  async function validate() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.validateMagicLink(token)
      const data = res.data

      localStorage.setItem('interviewSession', JSON.stringify({
        interviewId: data.interview.id,
        token,
        jobTitle: data.interview.mode === 'client_mock' ? 'Client Mock Interview' : 'Monthly Assessment',
        companyName: data.interview.companyName || 'Your Company',
        mode: data.interview.interviewMode,
        transcriptionMode: data.interview.transcriptionMode,
      }))
      localStorage.setItem('accessToken', data.sessionToken)
      setInterview(data.interview)
    } catch (err) {
      setError(err.message || 'Could not validate this link.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 440, textAlign: 'center', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {error === 'Link has expired' ? 'Link Expired' : error === 'Interview already completed' ? 'Already Completed' : 'Invalid Link'}
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14 }}>{error}</p>
      </div>
    </div>
  )

  const typeLabel = interview.type === 'ai_voice' ? 'AI Voice Interview' : interview.type === 'exam' ? 'Assessment Exam' : 'Interview'
  const companyName = interview.companyName || 'Your Company'

  return (
    <div style={{ minHeight: 'calc(100vh - 132px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '40px 32px', maxWidth: 480, width: '100%', boxShadow: '0 8px 28px rgba(15,23,42,0.06)', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: '#EFEDFD', color: '#5B4FE9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Briefcase size={28} />
        </div>

        <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 26, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          {typeLabel}
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 28px' }}>
          {companyName} is inviting you to the next step.
        </p>

        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'left' }}>
          {[
            { icon: Video,    label: typeLabel,       sub: '~20 minutes' },
            { icon: Calendar, label: 'Scheduled',     sub: 'Check your email for details' },
          ].map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: i === 0 ? '0 0 14px' : '14px 0 0', borderTop: i > 0 ? '1px solid #E2E8F0' : '0' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFEDFD', color: '#5B4FE9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <it.icon size={14} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{it.label}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{it.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate(`/interview/${token}/device-check`)}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          style={{ width: '100%', padding: '14px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#5B4FE9,#4A3FCE)', color: '#FFF', border: 0, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 24px rgba(91,79,233,0.3)', transition: 'all 120ms' }}
        >
          Check your device and start <ArrowRight size={16} />
        </button>
        <p style={{ fontSize: 12, color: '#94A3B8', margin: '12px 0 0' }}>This takes about 30 seconds. Make sure you are in a quiet place.</p>
      </div>
    </div>
  )
}

export default InterviewLandingPage
