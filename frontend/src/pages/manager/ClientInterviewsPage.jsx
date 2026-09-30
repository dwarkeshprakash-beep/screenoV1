import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight, BriefcaseBusiness, FileText, Mail, Plus, Search, Users, X,
  LayoutGrid, List,
} from 'lucide-react'
import Button from '../../components/shared/Button'
import EmptyState from '../../components/shared/EmptyState'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'
import { useAccess } from '../../hooks/useAccess'
import CreateMandateModal from '../../components/manager/client-mandates/CreateMandateModal'
import MandateDetail from '../../components/manager/client-mandates/MandateDetail'
import MandateListPagination from '../../components/manager/client-mandates/MandateListPagination'
import MandateListView from '../../components/manager/client-mandates/MandateListView'
import { parseTags, mandateStatusLabel, mandateStatusPillClass } from '../../components/manager/client-mandates/mandateHelpers'

const MANDATE_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
]

const PAGE_SIZE = 10

function ClientInterviewsPage() {
  const { mandateId } = useParams()
  const { hasModule } = useAccess()
  // basePath is fixed to the real route prefix. What a non-owner may change is enforced
  // by the API (owner-only actions return 404/403), not by hiding buttons here.
  const basePath = '/workspace'
  const canCreateMandate = hasModule('client_mandates', 'Save')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [detailLoading, setDetailLoading] = useState(!!mandateId)
  const [detailError, setDetailError] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [listState, setListState] = useState('active')
  const [view, setView] = useState('cards')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getClientTemplates(listState)
      const sorted = (response.data || []).sort((a, b) =>
        new Date(b.updated_at || b.created || 0) - new Date(a.updated_at || a.created || 0))
      setTemplates(sorted)
    } catch (err) {
      setError(err.message || 'Could not load client mandates.')
    } finally {
      setLoading(false)
    }
  }, [listState])

  useEffect(() => { if (!mandateId) void load() }, [load, mandateId])
  useEffect(() => {
    setPage(1)
  }, [query, listState])

  useEffect(() => {
    if (!mandateId) {
      setSelectedTemplate(null)
      setDetailError(null)
      setDetailLoading(false)
      return
    }
    let cancelled = false
    async function loadMandate() {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const response = await api.getClientTemplate(mandateId)
        if (!cancelled) setSelectedTemplate(response.data)
      } catch (err) {
        if (!cancelled) setDetailError(err.message || 'Could not load this mandate.')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }
    loadMandate()
    return () => { cancelled = true }
  }, [mandateId])

  const visibleTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return templates.filter(template => !normalized
      || String(template.client_name || '').toLowerCase().includes(normalized)
      || String(template.requirements || '').toLowerCase().includes(normalized)
      || String(template.client_email || '').toLowerCase().includes(normalized)
      || String(template.candidate_search_text || '').toLowerCase().includes(normalized)
      || parseTags(template.tags).join(' ').toLowerCase().includes(normalized))
  }, [query, templates])

  const mandatePages = Math.max(1, Math.ceil(visibleTemplates.length / PAGE_SIZE))
  const safePage = Math.min(page, mandatePages)
  const pageTemplates = visibleTemplates.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    if (page > mandatePages) setPage(mandatePages)
  }, [page, mandatePages])

  if (mandateId && detailLoading) return <Spinner center />
  if (mandateId && detailError) return <div className="workspace-page"><ErrorMessage message={detailError} /></div>
  if (mandateId && selectedTemplate) return <MandateDetail initialTemplate={selectedTemplate} basePath={basePath} />

  const hasActiveFilters = query.trim() !== '' || listState !== 'active'

  function clearFilters() {
    setQuery('')
    setListState('active')
    setPage(1)
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="workspace-toolbar">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
          <div className="workspace-search" style={{ flex: '1 1 420px' }}>
            <Search size={16} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search clients, roles, skills, or assigned candidates..."
              aria-label="Search client mandates"
            />
          </div>

          <>
              <div style={{ display: 'inline-flex', gap: 4, padding: 4, border: '1px solid var(--border-default)', borderRadius: 999, background: 'var(--bg-surface)' }} aria-label="Mandate status filter">
                {MANDATE_FILTERS.map(filter => (
                  <button key={filter.value} type="button" onClick={() => setListState(filter.value)} aria-pressed={listState === filter.value}
                    style={{ border: 0, borderRadius: 999, padding: '7px 12px', background: listState === filter.value ? 'var(--brand-500)' : 'transparent', color: listState === filter.value ? 'white' : 'var(--fg-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {filter.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'inline-flex', padding: 3, border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface)' }} aria-label="Mandate display">
                <button type="button" aria-label="Card view" aria-pressed={view === 'cards'} onClick={() => setView('cards')} style={{ display: 'inline-flex', padding: 7, border: 0, borderRadius: 6, background: view === 'cards' ? 'var(--brand-50)' : 'transparent', color: view === 'cards' ? 'var(--brand-600)' : 'var(--fg-muted)', cursor: 'pointer' }}><LayoutGrid size={15} /></button>
                <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')} style={{ display: 'inline-flex', padding: 7, border: 0, borderRadius: 6, background: view === 'list' ? 'var(--brand-50)' : 'transparent', color: view === 'list' ? 'var(--brand-600)' : 'var(--fg-muted)', cursor: 'pointer' }}><List size={15} /></button>
              </div>
              {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X size={13} />Clear filters</Button>}
          </>
        </div>
        {canCreateMandate && <Button onClick={() => setWizardOpen(true)}><Plus size={15} />New mandate</Button>}
      </div>

      <>
          {loading && <Spinner center />}
          {error && <ErrorMessage message={error} />}
          {!loading && !error && templates.length === 0 && <div className="workspace-panel"><EmptyState message="No client mandates yet. Create one to begin matching organization members." /></div>}
          {!loading && !error && templates.length > 0 && visibleTemplates.length === 0 && <div className="workspace-panel"><EmptyState message="No client mandates match this search." /></div>}
          {!loading && !error && pageTemplates.length > 0 && view === 'list' && (
            <MandateListView templates={pageTemplates} basePath={basePath} />
          )}
          {!loading && !error && pageTemplates.length > 0 && view === 'cards' && (
            <div className="workspace-grid workspace-grid--wide">
              {pageTemplates.map(template => {
                const tags = parseTags(template.tags)
                return (
                  <Link className="workspace-card" key={template.id} to={`${basePath}/clients/${template.id}`}>
                    <div className="workspace-card__body">
                      <div className="workspace-card__topline">
                        <div className="workspace-card__icon"><BriefcaseBusiness size={20} /></div>
                        <span className="status-pill status-pill--brand">{template.headcount ?? 1} needed</span>
                      </div>
                      <div style={{ marginTop: 18 }}>
                        <div className="workspace-card__eyebrow">{template.client_name}</div>
                        <h3 className="workspace-card__title">{template.requirements || 'Role not specified'}</h3>
                        <p className="workspace-card__subtitle">{template.custom_info || 'Open this mandate to review the JD and manage candidates.'}</p>
                      </div>
                      {mandateStatusLabel(template.current_status) && (
                        <div style={{ marginTop: 10 }}>
                          <span className={`status-pill ${mandateStatusPillClass(template.current_status)}`}>{mandateStatusLabel(template.current_status)}</span>
                        </div>
                      )}
                      <div className="workspace-card__meta">
                        <span><Mail size={13} /> {template.client_email || 'No client email'}</span>
                        <span><Users size={13} /> {template.hired_count ?? 0} hired / {template.headcount ?? 1} positions</span>
                        <span><FileText size={13} /> {(template.jd_text || template.jd_file_path) ? 'JD ready' : 'JD missing'}</span>
                      </div>
                      {tags.length > 0 && (
                        <div className="tag-list" style={{ marginTop: 15 }}>
                          {tags.slice(0, 4).map(tag => <span className="tag" key={tag}>{tag}</span>)}
                          {tags.length > 4 && <span className="tag">+{tags.length - 4}</span>}
                        </div>
                      )}
                      <div className="workspace-card__footer">
                        <span className="workspace-card__link">Open mandate <ArrowRight size={13} /></span>
                        <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>Modified {formatDate(template.updated_at || template.created)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
          {!loading && !error && visibleTemplates.length > 0 && (
            <MandateListPagination page={safePage} pages={mandatePages} total={visibleTemplates.length} onChange={setPage} />
          )}
      </>

      <CreateMandateModal open={wizardOpen && canCreateMandate} onClose={() => setWizardOpen(false)} onCreated={load} />
    </div>
  )
}

export default ClientInterviewsPage
