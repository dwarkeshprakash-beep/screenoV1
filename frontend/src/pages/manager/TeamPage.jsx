import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Users, CheckCircle2, Clock, AlertTriangle, UserPlus, Upload, CalendarPlus, GitCompare, Mail, Search, SlidersHorizontal, X } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'
import ScheduleModal from '../../components/manager/ScheduleModal'
import AddCandidateModal from '../../components/manager/AddCandidateModal'
import EditMemberModal from '../../components/manager/EditMemberModal'
import CompareModal from '../../components/manager/CompareModal'

const AV_COLORS = [
  { bg: '#EDE9FE', fg: '#5B21B6' }, { bg: '#FED7AA', fg: '#9A3412' },
  { bg: '#A7F3D0', fg: '#065F46' }, { bg: '#BFDBFE', fg: '#1E40AF' },
  { bg: '#FBCFE8', fg: '#9D174D' }, { bg: '#FDE68A', fg: '#854D0E' },
  { bg: '#C7D2FE', fg: '#3730A3' }, { bg: '#FCA5A5', fg: '#7F1D1D' },
]

function avHash(s) {
  let h = 0
  for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function Avatar({ name = '?', size = 36 }) {
  const c = AV_COLORS[avHash(name) % AV_COLORS.length]
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: 9999, flexShrink: 0, background: c.bg, color: c.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: Math.round(size * 0.38), letterSpacing: '-0.01em' }}>
      {initials}
    </div>
  )
}

function AssessBadge({ lastAssessed }) {
  if (!lastAssessed) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: '#FEF2F2', color: '#EF4444', fontSize: 12, fontWeight: 600 }}>
        Never assessed
      </span>
    )
  }
  const daysAgo = (Date.now() - new Date(lastAssessed).getTime()) / (1000 * 60 * 60 * 24)
  if (daysAgo > 90) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: '#FFFBEB', color: '#D97706', fontSize: 12, fontWeight: 600 }}>
        Overdue
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: '#ECFDF5', color: '#059669', fontSize: 12, fontWeight: 600 }}>
      Up to date
    </span>
  )
}

function TeamPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

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

  // ── Search + filter state — initialise from URL ?search= (set by TopBar) ──
  const [searchTerm, setSearchTerm]     = useState(() => searchParams.get('search') || '')
  const [showFilters, setShowFilters]   = useState(false)
  const [filterLocation, setFilterLocation] = useState('')
  const [filterPosition, setFilterPosition] = useState('')

  // Sync when TopBar navigates here with ?search= param
  useEffect(() => {
    const q = searchParams.get('search') || ''
    setSearchTerm(q)
    if (q) setSearchParams({}, { replace: true }) // clean URL after reading
  }, [searchParams.get('search')])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getTeam('all')
      setMembers(res.data || [])
      setSelected(new Set())
    } catch (err) {
      setError('Could not load team members. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function isOverdue(m) {
    if (!m.last_assessed) return true
    return (Date.now() - new Date(m.last_assessed).getTime()) / (1000 * 60 * 60 * 24) > 90
  }

  function toggleSelect(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleAll() {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)))
  }

  async function handleRemove(id) {
    if (!window.confirm('Remove this member from your team?')) return
    try { await api.removeMember(id); load() } catch { alert('Could not remove member.') }
  }

  function openSchedule(member) {
    setScheduleMember(member)
    setScheduleOpen(true)
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportStatus('')
    try {
      const csv = await file.text()
      const res = await api.importTeamCSV(csv)
      const data = res.data || {}
      setImportStatus(`Imported ${data.inserted || 0} new; updated ${data.updated || 0} existing${data.errors?.length ? `; ${data.errors.length} row issue(s)` : ''}.`)
      await load()
    } catch (err) {
      setImportStatus(err.message || 'CSV import failed.')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  // ── Build unique options for dropdowns ───────────────────────
  const locationOptions = [...new Set(members.map(m => m.location).filter(Boolean))].sort()
  const positionOptions = [...new Set(members.map(m => m.current_position).filter(Boolean))].sort()

  // ── Filter pipeline ──────────────────────────────────────────
  const term = searchTerm.trim().toLowerCase()
  const filtered = members.filter(m => {
    if (tab === 'attention' && !isOverdue(m)) return false
    if (term) {
      const haystack = `${m.first_name || ''} ${m.last_name || ''} ${m.email || ''} ${m.employee_id || ''}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    if (filterLocation && m.location !== filterLocation) return false
    if (filterPosition && m.current_position !== filterPosition) return false
    return true
  })
  const rows = filtered
  const overdueCount = members.filter(m => isOverdue(m)).length
  const allSel = rows.length > 0 && selected.size === rows.length

  const cardStyle = { background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }
  const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', borderBottom: '1px solid #E2E8F0' }
  const btnSecondary = { background: '#FFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: 8, fontWeight: 600, padding: '8px 14px', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
  const btnPrimary = { background: '#5B4FE9', color: '#FFF', border: 0, borderRadius: 8, fontWeight: 600, padding: '8px 14px', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }

  const hasActiveFilter = filterLocation || filterPosition

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        {overdueCount > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#B45309' }}>
            <AlertTriangle size={14} /> {overdueCount} members overdue
          </div>
        )}
        <button type="button" style={btnSecondary} onClick={() => setAddOpen(true)}><UserPlus size={13} /> Add member</button>
        <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: 'none' }} />
        <button type="button" disabled={importing} onClick={() => importInputRef.current?.click()} style={{ ...btnPrimary, opacity: importing ? 0.65 : 1, cursor: importing ? 'not-allowed' : 'pointer' }}><Upload size={13} /> {importing ? 'Importing...' : 'Import CSV'}</button>
      </div>

      {importStatus && (
        <div role="status" style={{ padding: '9px 12px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: 12, fontWeight: 500 }}>
          {importStatus}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { icon: Users,        color: '#5B4FE9', bg: '#EFEDFD', value: members.length,                          label: 'Total team members' },
          { icon: CheckCircle2, color: '#059669', bg: '#ECFDF5', value: members.filter(m => !isOverdue(m)).length, label: 'Assessed last 90 days' },
          { icon: Clock,        color: '#D97706', bg: '#FFFBEB', value: overdueCount,                            label: 'Need assessment' },
        ].map((s, i) => (
          <div key={i} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 12px', flex: 1, minWidth: 240 }}>
          <Search size={14} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search by name, email or employee ID…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ border: 0, outline: 'none', background: 'transparent', fontSize: 13, color: '#0F172A', flex: 1, fontFamily: 'inherit' }}
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#94A3B8', display: 'inline-flex', padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Advanced filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(f => !f)}
          style={{ ...btnSecondary, position: 'relative', borderColor: hasActiveFilter ? '#5B4FE9' : '#CBD5E1', color: hasActiveFilter ? '#5B4FE9' : '#0F172A' }}
        >
          <SlidersHorizontal size={13} /> Filters {hasActiveFilter && `(${[filterLocation, filterPosition].filter(Boolean).length})`}
        </button>
      </div>

      {/* Advanced filter panel */}
      {showFilters && (
        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Location</div>
            <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#FFF' }}>
              <option value="">All locations</option>
              {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Current position</div>
            <select value={filterPosition} onChange={e => setFilterPosition(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#FFF' }}>
              <option value="">All positions</option>
              {positionOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {hasActiveFilter && (
            <button type="button" onClick={() => { setFilterLocation(''); setFilterPosition('') }} style={{ ...btnSecondary, alignSelf: 'flex-end' }}>
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { id: 'all',       label: 'All members' },
          { id: 'attention', label: `Need attention (${overdueCount})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${tab === t.id ? '#5B4FE9' : '#E2E8F0'}`, background: '#FFF', color: tab === t.id ? '#5B4FE9' : '#374151', fontWeight: tab === t.id ? 600 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <Spinner center />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : rows.length === 0 ? (
        <EmptyState message={searchTerm || hasActiveFilter ? 'No team members match your filters.' : tab === 'all' ? 'No team members yet. Add your first member.' : 'No members need attention.'} />
      ) : (
        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ ...thStyle, width: 36 }}>
                  <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ accentColor: '#5B4FE9', cursor: 'pointer' }} />
                </th>
                {['TEAM MEMBER', 'EMPLOYEE ID', 'DEPARTMENT', 'LOCATION', 'CURRENT POSITION', 'LAST ASSESSMENT', 'ACTIONS'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(m => {
                const name = `${m.first_name} ${m.last_name}`
                const sel = selected.has(m.id)
                return (
                  <tr key={m.id}
                    onClick={() => navigate(`/manager/team/${m.id}`)}
                    style={{ cursor: 'pointer', background: sel ? '#F3F0FF' : '#FFF', transition: 'background 120ms' }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#F8FAFC' }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = '#FFF' }}
                  >
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={sel} onChange={() => toggleSelect(m.id)} style={{ accentColor: '#5B4FE9', cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={name} size={36} />
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{name}</div>
                          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', color: m.employee_id ? '#0F172A' : '#CBD5E1' }}>
                      {m.employee_id || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', color: m.department ? '#0F172A' : '#CBD5E1' }}>
                      {m.department || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', color: m.location ? '#0F172A' : '#CBD5E1' }}>
                      {m.location || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', color: m.current_position ? '#0F172A' : '#CBD5E1', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.current_position || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <AssessBadge lastAssessed={m.last_assessed} />
                      {m.last_assessed && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{formatDate(m.last_assessed)}</div>}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openSchedule(m)}
                        style={{ background: '#FFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
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
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#FFF', borderRadius: 14, padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: 14, boxShadow: '0 16px 40px rgba(15,23,42,0.32)', zIndex: 30 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.size} selected</span>
          {selected.size >= 2 && (
            <button onClick={() => setCompareOpen(true)} style={{ background: '#5B4FE9', color: '#FFF', border: 0, borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <GitCompare size={12} /> Compare {selected.size > 2 ? '(first 2)' : ''}
            </button>
          )}
          <button onClick={() => { setScheduleMember(null); setScheduleOpen(true) }} style={{ background: '#5B4FE9', color: '#FFF', border: 0, borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CalendarPlus size={12} /> Schedule all
          </button>
          <button onClick={() => setSelected(new Set())} style={{ background: 'transparent', border: 0, color: '#64748B', cursor: 'pointer', fontSize: 13 }}>Deselect</button>
        </div>
      )}

      <CompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        members={rows.filter(r => selected.has(r.id)).slice(0, 2)}
      />
      <ScheduleModal
        open={scheduleOpen}
        onClose={() => { setScheduleOpen(false); setScheduleMember(null) }}
        member={scheduleMember}
        selectedIds={Array.from(selected)}
        onDone={load}
      />
      <AddCandidateModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onDone={load}
      />
      {editMember && (
        <EditMemberModal
          open={!!editMember}
          member={editMember}
          onClose={() => setEditMember(null)}
          onDone={load}
        />
      )}
    </div>
  )
}

export default TeamPage
