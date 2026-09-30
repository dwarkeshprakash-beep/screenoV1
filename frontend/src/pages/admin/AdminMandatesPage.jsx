// AdminMandatesPage - platform-admin repair screen for mandates across every company:
// force reassignment, archive/restore, and permanent deletion.

import { useState, useEffect } from 'react'
import * as api from '../../services/api'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import Notice from '../../components/shared/Notice'
import MandatesAdminTable from '../../components/admin/MandatesAdminTable'
import ReassignMandateModal from '../../components/admin/ReassignMandateModal'
import ForceDeleteMandateModal from '../../components/admin/ForceDeleteMandateModal'

const FILTERS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'active', label: 'Active', match: m => !m.archived_at },
  { key: 'archived', label: 'Archived', match: m => !!m.archived_at },
]

export default function AdminMandatesPage() {
  const [mandates, setMandates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState(null) // { type, message }
  const [reassignTarget, setReassignTarget] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const activeFilter = FILTERS.find(f => f.key === filter)
  const filteredMandates = mandates.filter(activeFilter.match)

  async function loadMandates() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/admin/mandates')
      setMandates(res.data || [])
    } catch (err) {
      setError(err.message || 'Could not load mandates.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMandates() }, [])

  // Called by the modals after a successful action.
  function handleActionDone(message) {
    setReassignTarget(null)
    setDeleteTarget(null)
    setNotice({ type: 'success', message })
    loadMandates()
  }

  async function handleToggleArchive() {
    const mandate = archiveTarget
    const archived = !mandate.archived_at
    try {
      await api.patch(`/api/admin/mandates/${mandate.id}/force-status`, { archived })
      handleActionDone(`Mandate "${mandate.client_name}" ${archived ? 'archived' : 'restored'}.`)
    } catch (err) {
      setNotice({ type: 'error', message: `Failed: ${err.message}` })
    }
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="workspace-tabs" role="tablist" style={{ alignSelf: 'flex-start' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`workspace-tabs__button${filter === f.key ? ' is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({mandates.filter(f.match).length})
          </button>
        ))}
      </div>

      <Notice type={notice?.type} message={notice?.message} onDismiss={() => setNotice(null)} />

      <div className="admin-panel">
        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadMandates} /> : filteredMandates.length === 0 ? (
          <EmptyState message="No mandates match this filter." />
        ) : (
          <MandatesAdminTable
            mandates={filteredMandates}
            onReassign={setReassignTarget}
            onToggleArchive={setArchiveTarget}
            onDelete={setDeleteTarget}
          />
        )}
      </div>

      <ReassignMandateModal mandate={reassignTarget} onClose={() => setReassignTarget(null)} onDone={handleActionDone} />
      <ForceDeleteMandateModal mandate={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={handleActionDone} />
      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleToggleArchive}
        title={archiveTarget?.archived_at ? 'Restore Mandate' : 'Archive Mandate'}
        message={`Force ${archiveTarget?.archived_at ? 'restore' : 'archive'} mandate "${archiveTarget?.client_name}"?`}
        confirmText={archiveTarget?.archived_at ? 'Restore' : 'Archive'}
      />
    </div>
  )
}
