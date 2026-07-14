import { useCallback, useEffect, useState } from 'react'
import InterviewerAssignmentsPanel from '../../components/shared/InterviewerAssignmentsPanel'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'

function ManagerInterviewerPage() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getMyInterviewerAssignments()
      setAssignments(response.data || [])
    } catch (err) {
      setError(err.message || 'Could not load interviewer assignments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Spinner center />

  return (
    <div className="workspace-page workspace-stack">
      <div className="workspace-section-heading"><div><h2>Interviews I’m Conducting</h2><p>Join interviews and submit outcomes, feedback, and supporting documents.</p></div></div>
      {error && <ErrorMessage message={error} />}
      {!error && <InterviewerAssignmentsPanel assignments={assignments} onCompleted={load} />}
    </div>
  )
}

export default ManagerInterviewerPage
