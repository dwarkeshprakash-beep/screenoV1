// AdminInterviewsPage - platform-admin repair screen: browse the latest interviews
// (optionally by status) and force a status change on broken or stuck ones.

import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Notice from '../../components/shared/Notice'
import InterviewsAdminTable from '../../components/admin/InterviewsAdminTable'
import ForceInterviewStatusModal from '../../components/admin/ForceInterviewStatusModal'

const FILTERS = ['all', 'scheduled', 'in_progress', 'completed', 'cancelled', 'expired']

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState(null) // { type, message }
  const [statusTarget, setStatusTarget] = useState(null)

  const loadInterviews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await api.get(`/api/admin/interviews${params}`)
      setInterviews(res.data || [])
    } catch (err) {
      setError(err.message || 'Could not load interviews.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadInterviews() }, [loadInterviews])

  function handleStatusChanged(message) {
    setStatusTarget(null)
    setNotice({ type: 'success', message })
    loadInterviews()
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="workspace-tabs" role="tablist" style={{ alignSelf: 'flex-start' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className={`workspace-tabs__button${filter === f ? ' is-active' : ''}`}
            style={{ textTransform: 'capitalize' }}
            onClick={() => setFilter(f)}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <Notice type={notice?.type} message={notice?.message} onDismiss={() => setNotice(null)} />

      <div className="admin-panel">
        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadInterviews} /> : interviews.length === 0 ? (
          <EmptyState message="No interviews found." />
        ) : (
          <InterviewsAdminTable interviews={interviews} onChangeStatus={setStatusTarget} />
        )}
      </div>

      <ForceInterviewStatusModal interview={statusTarget} onClose={() => setStatusTarget(null)} onDone={handleStatusChanged} />
    </div>
  )
}
