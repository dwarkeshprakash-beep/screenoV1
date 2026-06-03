// pages/interviewer/LiveRoomPage.jsx
// Human interview live room — video (LiveKit) + side panel with Q/Notes/AI tabs.

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, Cpu } from 'lucide-react'
import * as api from '../../services/api'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'

const PANEL_TABS = ['Questions', 'Notes', 'AI Suggestions']

const SAMPLE_QUESTIONS = [
  'Tell me about your most complex system design challenge.',
  'How do you approach performance optimization in .NET applications?',
  'Describe a time you had a disagreement with a team member. How did you resolve it?',
  'Walk me through your experience with microservices architecture.',
  "What's your approach to writing testable code?",
]

function LiveRoomPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Side-panel state
  const [tab, setTab]             = useState(0)
  const [notes, setNotes]         = useState('')
  const [lastSaved, setLastSaved] = useState(null)
  const [asked, setAsked]         = useState([])
  const [ending, setEnding]       = useState(false)
  const saveTimerRef              = useRef(null)

  // LiveKit state
  const [lkToken, setLkToken]       = useState(null)
  const [wsUrl, setWsUrl]           = useState(null)
  const [tokenLoading, setTokenLoading] = useState(true)
  const [tokenError, setTokenError] = useState(null)

  // Fetch LiveKit token on mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const participantName =
      [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Interviewer'

    api.getLiveKitToken(`interview-${id}`, participantName)
      .then(r => {
        setLkToken(r.data.token)
        setWsUrl(r.data.wsUrl)
      })
      .catch(err => setTokenError(err.message))
      .finally(() => setTokenLoading(false))
  }, [id])

  function handleNotesChange(val) {
    setNotes(val)
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      setLastSaved(new Date())
    }, 3000)
  }

  function toggleAsked(i) {
    setAsked(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  function handleEndInterview() {
    if (!ending) { setEnding(true); return }
    navigate('/interviewer/dashboard')
  }

  const tabStyle = (i) => ({
    flex: 1, padding: '10px 0', background: 'none', border: 'none',
    borderBottom: `2px solid ${tab === i ? 'var(--brand-500)' : 'transparent'}`,
    color: tab === i ? 'var(--brand-500)' : 'var(--fg-muted)',
    fontSize: 13, fontWeight: tab === i ? 600 : 400, cursor: 'pointer',
  })

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#0F172A', overflow: 'hidden' }}>
      {/* Left: Video area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 12 }}>
        {/* LiveKit video room */}
        <div style={{ flex: 1, background: '#0F172A', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
          {tokenLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 14 }}>
              Connecting to video room…
            </div>
          )}
          {tokenError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F87171', fontSize: 13, padding: 20, textAlign: 'center' }}>
              Video connection failed: {tokenError}
            </div>
          )}
          {lkToken && wsUrl && (
            <LiveKitRoom
              token={lkToken}
              serverUrl={wsUrl}
              connect={true}
              style={{ height: '100%' }}
              onError={(e) => setTokenError(e.message)}
            >
              <VideoConference />
            </LiveKitRoom>
          )}
        </div>
      </div>

      {/* Right: Side panel */}
      <div style={{ width: 380, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' }}>
        {/* Panel tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', padding: '0 4px' }}>
          {PANEL_TABS.map((t, i) => (
            <button key={t} style={tabStyle(i)} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* Questions */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SAMPLE_QUESTIONS.map((q, i) => (
                <div key={i} style={{ background: asked.includes(i) ? 'var(--success-50)' : 'var(--bg-surface-alt)', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={asked.includes(i)} onChange={() => toggleAsked(i)} style={{ marginTop: 2, accentColor: 'var(--success-500)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: asked.includes(i) ? 'var(--fg-muted)' : 'var(--fg-body)', textDecoration: asked.includes(i) ? 'line-through' : 'none', lineHeight: 1.5 }}>{q}</span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {tab === 1 && (
            <div>
              <textarea
                rows={16}
                placeholder="Take notes here — auto-saved every 3 seconds"
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                style={{ width: '100%', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.6, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
              />
              {lastSaved && (
                <div style={{ fontSize: 11, color: 'var(--success-500)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={11} /> Saved {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* AI Suggestions */}
          {tab === 2 && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Cpu size={32} color="var(--fg-muted)" style={{ marginBottom: 8 }} />
              <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>AI follow-up suggestions will appear here as the candidate answers questions.</p>
            </div>
          )}
        </div>

        {/* End interview */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border-default)' }}>
          {ending ? (
            <div>
              <p style={{ fontSize: 13, color: 'var(--danger-500)', marginBottom: 8 }}>Are you sure? This will end the interview for both parties.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEnding(false)} style={{ flex: 1, padding: '9px', border: '1px solid var(--border-default)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={handleEndInterview} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 8, background: 'var(--danger-500)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Confirm End</button>
              </div>
            </div>
          ) : (
            <button onClick={handleEndInterview} style={{ width: '100%', padding: '10px', border: '1px solid var(--danger-500)', borderRadius: 8, background: 'none', color: 'var(--danger-500)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              End Interview
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default LiveRoomPage
