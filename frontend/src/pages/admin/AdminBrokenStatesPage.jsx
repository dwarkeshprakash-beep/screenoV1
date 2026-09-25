// AdminBrokenStatesPage - platform-admin scan for data-integrity problems (orphaned
// mandates, invalid requirement links, stuck interviews) with one-click fixes.

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import * as api from '../../services/api'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Button from '../../components/shared/Button'
import Notice from '../../components/shared/Notice'
import BrokenStateIssue from '../../components/admin/BrokenStateIssue'

export default function AdminBrokenStatesPage() {
  const [brokenStates, setBrokenStates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null) // { type, message }

  async function loadBrokenStates() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/admin/broken-states')
      setBrokenStates(res.data)
    } catch (err) {
      setError(err.message || 'Could not scan for broken states.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBrokenStates() }, [])

  function handleFixed(message) {
    setNotice({ type: 'success', message })
    loadBrokenStates()
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="workspace-toolbar">
        <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)' }}>
          Automated detection of data integrity issues and broken references
        </p>
        <Button variant="secondary" onClick={loadBrokenStates} loading={loading}>
          <RefreshCw size={14} /> Re-scan for Issues
        </Button>
      </div>

      <Notice type={notice?.type} message={notice?.message} onDismiss={() => setNotice(null)} />

      {loading ? <Spinner center label="Scanning for broken states…" /> : error ? (
        <div className="admin-panel"><ErrorMessage message={error} onRetry={loadBrokenStates} /></div>
      ) : brokenStates?.issueCount === 0 ? (
        <div className="admin-panel admin-panel__body" style={{ textAlign: 'center', background: 'var(--success-50)', borderColor: 'var(--success-200)' }}>
          <h2 className="admin-panel__title" style={{ color: 'var(--success-700)' }}>All Systems Operational</h2>
          <p className="admin-panel__hint" style={{ marginBottom: 0, color: 'var(--success-600)' }}>No data integrity issues detected</p>
        </div>
      ) : (
        brokenStates?.issues.map(issue => (
          <BrokenStateIssue
            key={issue.type}
            issue={issue}
            onFixed={handleFixed}
            onError={message => setNotice({ type: 'error', message })}
          />
        ))
      )}
    </div>
  )
}
