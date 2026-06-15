import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Users, CheckCircle2, Clock, AlertTriangle, UserPlus, Upload, CalendarPlus, GitCompare, Search, SlidersHorizontal, X, UserCheck } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'
import ScheduleModal from '../../components/manager/ScheduleModal'
import AddCandidateModal from '../../components/manager/AddCandidateModal'
import EditMemberModal from '../../components/manager/EditMemberModal'
import CompareModal from '../../components/manager/CompareModal'

function AssessBadge({ lastAssessed, now }) {
  if (!lastAssessed) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: 'var(--danger-50)', color: 'var(--danger-500)', fontSize: 12, fontWeight: 600 }}>Never assessed</span>
  }
  const daysAgo = (now - new Date(lastAssessed).getTime()) / (1000 * 60 * 60 * 24)
  if (daysAgo > 30) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: 'var(--warning-50)', color: 'var(--warning-500)', fontSize: 12, fontWeight: 600 }}>Overdue</span>
  }
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: 'var(--success-50)', color: 'var(--success-500)', fontSize: 12, fontWeight: 600 }}>Up to date</span>
}

// ── Add External Candidate Modal ──────────────────────────────
function AddExternalModal({ open, onClose, onDone }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [resumeFile, setResumeFile] = useState(null)

  function reset() { setFirstName(''); setLastName(''); setEmail(''); setResumeFile(null); setError(null) }
  function handleClose() { reset(); onClose() }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!firstName.trim()) { setError('First name is required'); return }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Valid email is required'); return }
    setSaving(true); setError(null)
    try {
      let resumeUrl = null
      if (resumeFile) {
        const res = await api.uploadResume(null, resumeFile)
        resumeUrl = res.data?.resumeUrl
      }
      await api.addExternalCandidate({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), resumeUrl })
      reset(); onDone(); onClose()
    } catch (err) {
      setError(err.message || 'Could not add external candidate')
    } finally {
      setSaving(false)
    }
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <Modal open={open} onClose={handleClose} title="Add External Candidate" size="sm">
      <form onSubmit={handleSubmit}>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 16px' }}>
          External candidates are contractors or freelancers not on your internal employee roster.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>First name *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Rahul" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Last name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Sharma" style={inp} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rahul@external.com" style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Resume (optional)</label>
            <input type="file" onChange={e => setResumeFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx" style={inp} />
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--danger-700)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add External Candidate'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function TeamPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Roster type: internal | external ─────────────────────────
  const [rosterTab, setRosterTab]       = useState('internal')

  // ── Internal member state ─────────────────────────────────────
  const [members, setMembers]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [tab, setTab]                   = useState('all')
  const [selected, setSelected]         = useState(new Set())
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleMember, setScheduleMember] = useState(null)
  const [addOpen, setAddOpen]           = useState(false)
  const [editMember, setEditMember]     = useState(null)
  const [compareOpen, setCompareOpen]   = useState(false)
  const [importing, setImporting]       = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const importInputRef = useRef(null)

  // ── External state ────────────────────────────────────────────
  const [externals, setExternals]           = useState([])
  const [extLoading, setExtLoading]         = useState(false)
  const [extError, setExtError]             = useState(null)
  const [addExternalOpen, setAddExternalOpen] = useState(false)

  // ── Search + filter state ─────────────────────────────────────
  const [searchTerm, setSearchTerm]     = useState(() => searchParams.get('search') || '')
  const [showFilters, setShowFilters]   = useState(false)
  const [filterLocation, setFilterLocation] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [filterAvailability, setFilterAvailability] = useState('')
  const [now] = useState(() => Date.now())

  const searchFromURL = searchParams.get('search')
  useEffect(() => {
    if (!searchFromURL) return
    setSearchTerm(searchFromURL)
    setSearchParams({}, { replace: true })
  }, [searchFromURL, setSearchParams])

  useEffect(() => { loadInternal() }, [])

  useEffect(() => {
    if (rosterTab === 'external') loadExternal()
  }, [rosterTab])

  async function loadInternal() {
    setLoading(true); setError(null)
    try {
      const res = await api.getTeam('all')
      setMembers(res.data || [])
      setSelected(new Set())
    } catch { setError('Could not load team members. Please try again.') }
    finally { setLoading(false) }
  }

  async function loadExternal() {
    setExtLoading(true); setExtError(null)
    try {
      const res = await api.getExternalCandidates()
      setExternals(res.data || [])
    } catch { setExtError('Could not load external candidates.') }
    finally { setExtLoading(false) }
  }

  function isOverdue(m) {
    if (!m.last_assessed) return true
    return (now - new Date(m.last_assessed).getTime()) / (1000 * 60 * 60 * 24) > 30
  }

  function toggleSelect(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)))
  }
  function openSchedule(member) { setScheduleMember(member); setScheduleOpen(true) }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true); setImportStatus('')
    try {
      const csv = await file.text()
      const res = await api.importTeamCSV(csv)
      const data = res.data || {}
      setImportStatus(`Imported ${data.inserted || 0} new; updated ${data.updated || 0} existing${data.errors?.length ? `; ${data.errors.length} row issue(s)` : ''}.`)
      await loadInternal()
    } catch (err) { setImportStatus(err.message || 'CSV import failed.') }
    finally { setImporting(false); e.target.value = '' }
  }

  const locationOptions = [...new Set(members.map(m => m.location).filter(Boolean))].sort()
  const positionOptions = [...new Set(members.map(m => m.current_position).filter(Boolean))].sort()

  const term = searchTerm.trim().toLowerCase()
  const filtered = members.filter(m => {
    if (tab === 'attention' && !isOverdue(m)) return false
    if (term) {
      const hay = `${m.first_name || ''} ${m.last_name || ''} ${m.email || ''} ${m.employee_id || ''}`.toLowerCase()
      if (!hay.includes(term)) return false
    }
    if (filterLocation && m.location !== filterLocation) return false
    if (filterPosition && m.current_position !== filterPosition) return false
    if (filterAvailability && m.availability !== filterAvailability) return false
    return true
  })
  const rows = filtered
  const overdueCount = members.filter(m => isOverdue(m)).length
  const allSel = rows.length > 0 && selected.size === rows.length
  const hasActiveFilter = filterLocation || filterPosition || filterAvailability

  const cardStyle    = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }
  const thStyle      = { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)' }
  const btnSecondary = { background: 'var(--bg-surface)', color: 'var(--fg-primary)', border: '1px solid var(--border-default)', borderRadius: 8, fontWeight: 600, padding: '8px 14px', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
  const btnPrimary   = { background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, borderRadius: 8, fontWeight: 600, padding: '8px 14px', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }

  const rosterTabStyle = (t) => ({
    padding: '8px 18px', borderRadius: 8, border: `1px solid ${rosterTab === t ? 'var(--brand-500)' : 'var(--border-default)'}`,
    background: rosterTab === t ? 'var(--brand-50)' : 'var(--bg-surface)',
    color: rosterTab === t ? 'var(--brand-700)' : 'var(--fg-muted)',
    fontWeight: rosterTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Roster type selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={rosterTabStyle('internal')} onClick={() => setRosterTab('internal')}>
          <Users size={14} /> Internal Employees
        </button>
        <button style={rosterTabStyle('external')} onClick={() => setRosterTab('external')}>
          <UserCheck size={14} /> External Candidates
        </button>
      </div>

      {/* ═══════════════ INTERNAL ═══════════════ */}
      {rosterTab === 'internal' && (
        <>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
            {overdueCount > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--warning-50)', border: '1px solid var(--warning-100)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--warning-600)' }}>
                <AlertTriangle size={14} /> {overdueCount} overdue
              </div>
            )}
            <button type="button" style={btnSecondary} onClick={() => setAddOpen(true)}><UserPlus size={13} /> Add member</button>
            <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: 'none' }} />
            <button type="button" disabled={importing} onClick={() => importInputRef.current?.click()} style={{ ...btnPrimary, opacity: importing ? 0.65 : 1, cursor: importing ? 'not-allowed' : 'pointer' }}>
              <Upload size={13} /> {importing ? 'Importing…' : 'Import CSV'}
            </button>
          </div>

          {importStatus && (
            <div role="status" style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--bg-surface-alt)', border: '1px solid var(--border-default)', color: 'var(--fg-body)', fontSize: 12 }}>
              {importStatus}
            </div>
          )}

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '0.875rem' }}>
            {[
              { icon: Users,        color: 'var(--brand-500)', bg: 'var(--brand-50)',   value: members.length,                          label: 'Total team members' },
              { icon: CheckCircle2, color: 'var(--success-500)', bg: 'var(--success-50)', value: members.filter(m => !isOverdue(m)).length, label: 'Assessed last 30 days' },
              { icon: Clock,        color: 'var(--warning-500)', bg: 'var(--warning-50)', value: overdueCount,                            label: 'Need assessment' },
            ].map((s, i) => (
              <div key={i} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '7px 12px', flex: 1, minWidth: 240 }}>
                <Search size={14} color="var(--fg-subtle)" />
                <input type="text" placeholder="Search by name, email or employee ID…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ border: 0, outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--fg-primary)', flex: 1, fontFamily: 'inherit' }} />
                {searchTerm && <button type="button" onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--fg-subtle)', display: 'inline-flex', padding: 0 }}><X size={13} /></button>}
              </div>
              <button type="button" onClick={() => setShowFilters(f => !f)} style={{ ...btnSecondary, borderColor: hasActiveFilter ? 'var(--brand-500)' : 'var(--border-default)', color: hasActiveFilter ? 'var(--brand-500)' : 'var(--fg-primary)' }}>
                <SlidersHorizontal size={13} /> Filters {hasActiveFilter && `(${[filterLocation, filterPosition].filter(Boolean).length})`}
              </button>
            </div>
            {showFilters && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}>
                {[
                  { label: 'Location', val: filterLocation, set: setFilterLocation, options: locationOptions.map(l => ({ v: l, l })) },
                  { label: 'Position', val: filterPosition, set: setFilterPosition, options: positionOptions.map(p => ({ v: p, l: p })) },
                  { label: 'Availability', val: filterAvailability, set: setFilterAvailability, options: [{v: 'bench', l: 'Bench'}, {v: 'client_side', l: 'Client side'}] },
                ].map(f => (
                  <div key={f.label} style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 5 }}>{f.label}</div>
                    <select value={f.val} onChange={e => f.set(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-surface)' }}>
                      <option value="">All {f.label.toLowerCase()}s</option>
                      {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
                {hasActiveFilter && <button type="button" onClick={() => { setFilterLocation(''); setFilterPosition(''); setFilterAvailability('') }} style={{ ...btnSecondary, alignSelf: 'flex-end' }}><X size={12} /> Clear</button>}
              </div>
            )}
          </div>

          {/* Sub-tab: All | Need attention */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ id: 'all', label: 'All members' }, { id: 'attention', label: `Need attention (${overdueCount})` }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${tab === t.id ? 'var(--brand-500)' : 'var(--border-default)'}`, background: 'var(--bg-surface)', color: tab === t.id ? 'var(--brand-500)' : 'var(--fg-body)', fontWeight: tab === t.id ? 600 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? <Spinner center /> : error ? <ErrorMessage message={error} /> : rows.length === 0 ? (
            <EmptyState message={searchTerm || hasActiveFilter ? 'No members match your filters.' : tab === 'all' ? 'No team members yet. Add your first member.' : 'No members need attention.'} />
          ) : (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '0.75rem', overflowX: 'auto', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-alt)' }}>
                    <th style={{ ...thStyle, width: 36 }}><input type="checkbox" checked={allSel} onChange={toggleAll} style={{ accentColor: 'var(--brand-500)', cursor: 'pointer' }} /></th>
                    {['TEAM MEMBER', 'EMPLOYEE ID', 'DEPARTMENT', 'LOCATION', 'POSITION', 'LAST ASSESSMENT', 'ACTIONS'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(m => {
                    const name = `${m.first_name} ${m.last_name}`
                    const sel = selected.has(m.id)
                    return (
                      <tr key={m.id} onClick={() => navigate(`/manager/team/${m.id}`)} style={{ cursor: 'pointer', background: sel ? 'var(--brand-50)' : 'var(--bg-surface)', transition: 'background 120ms' }} onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--bg-surface-alt)' }} onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'var(--bg-surface)' }}>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={sel} onChange={() => toggleSelect(m.id)} style={{ accentColor: 'var(--brand-500)', cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--fg-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {name}
                                {m.availability && (
                                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: m.availability === 'bench' ? 'var(--brand-50)' : 'var(--success-50)', color: m.availability === 'bench' ? 'var(--brand-700)' : 'var(--success-600)' }}>
                                    {m.availability === 'client_side' ? 'Client side' : 'Bench'}
                                  </span>
                                )}
                                {/* Skill tags (up to 3) */}
                                {(() => { try { const t = m.tags; return Array.isArray(t) ? t : JSON.parse(t || '[]') } catch { return [] } })().slice(0, 3).map(t => (
                                  <span key={t} style={{ fontSize: 10, background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)', padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>{t}</span>
                                ))}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 1 }}>{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', color: m.employee_id ? 'var(--fg-primary)' : 'var(--fg-subtle)' }}>{m.employee_id || '—'}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', color: m.department ? 'var(--fg-primary)' : 'var(--fg-subtle)' }}>{m.department || '—'}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', color: m.location ? 'var(--fg-primary)' : 'var(--fg-subtle)' }}>{m.location || '—'}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', color: m.current_position ? 'var(--fg-primary)' : 'var(--fg-subtle)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.current_position || '—'}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
                          <AssessBadge lastAssessed={m.last_assessed} now={now} />
                          {m.last_assessed && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 3 }}>{formatDate(m.last_assessed)}</div>}
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => openSchedule(m)} style={{ background: 'var(--bg-surface)', color: 'var(--fg-primary)', border: '1px solid var(--border-default)', borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CalendarPlus size={12} /> Schedule
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--fg-primary)', color: 'var(--bg-surface)', borderRadius: 14, padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: 14, boxShadow: '0 16px 40px rgba(15,23,42,0.32)', zIndex: 30 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.size} selected</span>
              {selected.size >= 2 && <button onClick={() => setCompareOpen(true)} style={{ background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <GitCompare size={12} /> Compare {selected.size > 2 ? '(first 2)' : ''}
              </button>}
              <button onClick={() => { setScheduleMember(null); setScheduleOpen(true) }} style={{ background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CalendarPlus size={12} /> Schedule all
              </button>
              <button onClick={() => setSelected(new Set())} style={{ background: 'transparent', border: 0, color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 13 }}>Deselect</button>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ EXTERNAL ═══════════════ */}
      {rosterTab === 'external' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>Contractors and freelancers managed at the company level. They can be scheduled for interviews like internal employees.</p>
            <button type="button" style={btnPrimary} onClick={() => setAddExternalOpen(true)}>
              <UserPlus size={13} /> Add External Candidate
            </button>
          </div>

          {extLoading ? <Spinner center /> : extError ? <ErrorMessage message={extError} /> : externals.length === 0 ? (
            <EmptyState message="No external candidates yet. Add contractors or freelancers to schedule interviews." />
          ) : (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-alt)' }}>
                    {['CANDIDATE', 'EMAIL', 'INTERVIEWS', 'LAST INTERVIEW', 'ACTIONS'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {externals.map(c => {
                    const name = `${c.first_name} ${c.last_name}`.trim()
                    return (
                      <tr key={c.id} style={{ transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>{name}</div>
                              <div style={{ fontSize: 11, background: 'var(--warning-50)', color: 'var(--warning-600)', padding: '1px 6px', borderRadius: 4, fontWeight: 600, display: 'inline-block', marginTop: 3 }}>External</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', color: 'var(--fg-muted)' }}>{c.email}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', color: 'var(--fg-primary)', fontWeight: 600 }}>{c.interview_count || 0}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', color: 'var(--fg-muted)' }}>{c.last_interview ? formatDate(c.last_interview) : '—'}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
                          <button onClick={() => openSchedule({ ...c, external: true })} style={{ background: 'var(--bg-surface)', color: 'var(--fg-primary)', border: '1px solid var(--border-default)', borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CalendarPlus size={12} /> Schedule
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <CompareModal open={compareOpen} onClose={() => setCompareOpen(false)} members={rows.filter(r => selected.has(r.id)).slice(0, 2)} />
      <ScheduleModal
        open={scheduleOpen}
        onClose={() => { setScheduleOpen(false); setScheduleMember(null) }}
        member={scheduleMember}
        selectedMembers={rows.filter(row => selected.has(row.id))}
        onDone={loadInternal}
      />
      <AddCandidateModal open={addOpen} onClose={() => setAddOpen(false)} onDone={loadInternal} />
      <AddExternalModal open={addExternalOpen} onClose={() => setAddExternalOpen(false)} onDone={loadExternal} />
      {editMember && <EditMemberModal open={!!editMember} member={editMember} onClose={() => setEditMember(null)} onDone={loadInternal} />}
    </div>
  )
}

export default TeamPage
