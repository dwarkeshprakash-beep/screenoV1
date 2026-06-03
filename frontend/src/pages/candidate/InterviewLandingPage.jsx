// pages/candidate/InterviewLandingPage.jsx
// Magic link landing — validates token, shows interview info, starts flow.

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Briefcase, Clock, ArrowRight } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import Button from '../../components/shared/Button'
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

      // Store session so subsequent interview pages can read it
      localStorage.setItem('interviewSession', JSON.stringify({
        interviewId: data.interview.id,
        token,
        jobTitle: data.interview.mode === 'client_mock' ? 'Client Mock Interview' : 'Monthly Assessment',
        companyName: data.interview.companyName || 'Your Company',
        mode: data.interview.interviewMode,
        transcriptionMode: data.interview.transcriptionMode,
      }))

      // Replace token with session JWT for subsequent API calls
      localStorage.setItem('accessToken', data.sessionToken)
      setInterview(data.interview)
    } catch (err) {
      setError(err.message || 'Could not validate this link.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 440, textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {error === 'Link has expired' ? 'Link Expired' : error === 'Interview already completed' ? 'Already Completed' : 'Invalid Link'}
          </h2>
          <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>{error}</p>
        </div>
      </div>
    )
  }

  const typeLabel = interview.type === 'ai_voice' ? 'AI Voice Interview' : interview.type === 'exam' ? 'Assessment Exam' : 'Interview'

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 40, textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Briefcase size={36} color="#fff" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg-primary)', marginBottom: 8 }}>{typeLabel}</h1>
        <p style={{ fontSize: 15, color: 'var(--fg-muted)', marginBottom: 24 }}>{interview.companyName || 'Your Company'}</p>

        <div style={{ background: 'var(--bg-surface-alt)', borderRadius: 12, padding: 16, marginBottom: 28, textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
            <Briefcase size={16} color="var(--fg-muted)" />
            <span style={{ fontSize: 14, color: 'var(--fg-body)' }}>{typeLabel}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Clock size={16} color="var(--fg-muted)" />
            <span style={{ fontSize: 14, color: 'var(--fg-body)' }}>~20 minutes</span>
          </div>
        </div>

        <Button fullWidth size="lg" onClick={() => navigate(`/interview/${token}/device-check`)}>
          Check your device and start <ArrowRight size={16} />
        </Button>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 12 }}>Takes about 30 seconds</p>
      </div>
    </div>
  )
}

export default InterviewLandingPage
