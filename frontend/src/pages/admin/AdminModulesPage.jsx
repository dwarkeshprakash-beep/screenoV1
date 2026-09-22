// AdminModulesPage - list of the global module catalog. Modules are seeded by migration
// and their key is fixed, but an admin can rename the display name here. See
// docs/rbac-multi-tenant-plan.md.

import { useState, useEffect } from 'react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import ModulesTable from '../../components/admin/ModulesTable'
import ModuleFormModal from '../../components/admin/ModuleFormModal'
import * as api from '../../services/api'

function AdminModulesPage() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingModule, setEditingModule] = useState(null)

  useEffect(() => { loadModules() }, [])

  async function loadModules() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getModules()
      setModules(res.data || [])
    } catch {
      setError('Could not load modules. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden',
  }

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={cardStyle}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface-alt)' }}>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            Fixed, global list - the same for every company. Each ACL gates exactly one of these. Only the name can be renamed.
          </span>
        </div>

        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadModules} /> : modules.length === 0 ? (
          <EmptyState message="No modules found." />
        ) : (
          <ModulesTable
            modules={modules}
            onEdit={module => { setEditingModule(module); setFormOpen(true) }}
          />
        )}
      </div>

      <ModuleFormModal
        open={formOpen}
        module={editingModule}
        onClose={() => setFormOpen(false)}
        onDone={loadModules}
      />
    </div>
  )
}

export default AdminModulesPage
