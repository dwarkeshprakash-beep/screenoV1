import { useEffect, useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import * as api from '../../services/api'

function HumanInterviewPage() {
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.getCandidateLiveKitToken()
        setRoom(res.data)
      } catch (err) {
        setError(err.message || 'Could not join interview room.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>
  if (error) return <ErrorMessage message={error} />

  return (
    <div style={{ height: 'calc(100vh - 60px)', background: '#0F172A' }}>
      <LiveKitRoom token={room.token} serverUrl={room.wsUrl} connect={true} style={{ height: '100%' }}>
        <VideoConference />
      </LiveKitRoom>
    </div>
  )
}

export default HumanInterviewPage
