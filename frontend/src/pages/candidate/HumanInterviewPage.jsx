import { useEffect, useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import * as api from '../../services/api'

function HumanInterviewPage() {
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [disconnected, setDisconnected] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    setDisconnected(false)
    try {
      const res = await api.getCandidateLiveKitToken()
      setRoom(res.data)
    } catch (err) {
      setError(err.message || 'Could not join interview room.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} onRetry={load} />

  if (disconnected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: 'calc(100vh - 60px)', background: 'var(--slate-900)', color: 'var(--bg-surface)', textAlign: 'center', padding: 24 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700 }}>You've been disconnected</h3>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', maxWidth: 360 }}>
          The connection to the interview room was lost. Check your network and rejoin — the interviewer will still be in the room.
        </p>
        <button
          onClick={load}
          style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, background: 'var(--brand-500, var(--brand-500))', color: 'var(--bg-surface)', cursor: 'pointer' }}
        >
          Rejoin room
        </button>
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 60px)', background: 'var(--slate-900)' }}>
      <LiveKitRoom
        token={room.token}
        serverUrl={room.wsUrl}
        connect={true}
        style={{ height: '100%' }}
        onError={(e) => setError(e.message || 'Video connection failed.')}
        onDisconnected={() => setDisconnected(true)}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  )
}

export default HumanInterviewPage
