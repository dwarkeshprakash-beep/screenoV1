// AdminModulesPage - list of the global module catalog. Modules are seeded by migration
// and their key is fixed, but an admin can rename the display name here. Pick a company
// to see (and assign) which ACL gates each module for that company - see
// docs/rbac-multi-tenant-plan.md.

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import CompanyScopedToolbar from '../../components/admin/CompanyScopedToolbar'
import ModulesTable from '../../components/admin/ModulesTable'
import ModuleFormModal from '../../components/admin/ModuleFormModal'
import * as api from '../../services/api'

function AdminModulesPage() {
  const [searchParams] = useSearchParams()
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState(null)
  const [modules, setModules] = useState([])
  const [unassignedAcls, setUnassignedAcls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingModule, setEditingModule] = useState(null)

  useEffect(() => { loadCompanies() }, [])
  useEffect(() => {
    if (companies.length === 0) return
    const requestedId = Number(searchParams.get('companyId'))
    setCompanyId(companies.some(c => c.id === requestedId) ? requestedId : (companies[0]?.id || null))
  }, [searchParams, companies])
  useEffect(() => { if (companyId) loadModules() }, [companyId])

  async function loadCompanies() {
    try {
      const res = await api.getAdminCompanies()
      setCompanies(res.data || [])
    } catch {
      setError('Could not load companies. Please try again.')
      setLoading(false)
    }
  }

  async function loadModules() {
    setLoading(true)
    setError(null)
    try {
      const [modulesRes, unassignedRes] = await Promise.all([
        api.getModules(companyId),
        api.getUnassignedAcls(companyId),
      ])
      setModules(modulesRes.data || [])
      setUnassignedAcls(unassignedRes.data || [])
    } catch {
      setError('Could not load modules. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAssignAcl(module, aclId) {
    try {
      await api.assignModuleAcl(module.id, companyId, aclId)
      await loadModules()
    } catch (err) {
      setError(err.message || 'Could not assign ACL to module')
    }
  }

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden',
  }

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={cardStyle}>
        <CompanyScopedToolbar
          companies={companies}
          companyId={companyId}
          onCompanyChange={setCompanyId}
          itemLabel="module"
          count={modules.length}
          showCount={!loading && !error}
        />

        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadModules} /> : modules.length === 0 ? (
          <EmptyState message="No modules found." />
        ) : (
          <ModulesTable
            modules={modules}
            unassignedAcls={unassignedAcls}
            onEdit={module => { setEditingModule(module); setFormOpen(true) }}
            onAssignAcl={handleAssignAcl}
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
