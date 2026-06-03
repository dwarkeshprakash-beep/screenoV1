// pages/manager/TeamPage.jsx
// My Team — full list with filter tabs, bulk select, and schedule/edit/remove actions.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Calendar, Upload, UserPlus } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Avatar from '../../components/shared/Avatar'
import Modal from '../../components/shared/Modal'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'
import ScheduleModal from '../../components/manager/ScheduleModal'
import AddCandidateModal from '../../components/manager/AddCandidateModal'
import EditMemberModal from '../../components/manager/EditMemberModal'

const FILTERS = ['all', 'overdue', 'never']

function AssessBadge({ lastAssessed }) {
  if (!lastAssessed) {
    return <span style={{ padding: '2px 8px', borderRadius: 99, background: 'var(--slate-100)', color: 'var(--fg-muted)', fontSize: 11, fontWeight: 600 }}>Never assessed</span>
  }
  const daysAgo = (Date.now() - new Date(lastAssessed).getTime()) / (1000 * 60 * 60 * 24)
  if (daysAgo > 90) {
    return <span style={{ padding: '2px 8px', borderRadius: 99, background: 'var(--warning-100)', color: 'var(--warning-700)', fontSize: 11, fontWeight: 600 }}>Overdue</span>
  }
  return <span style={{ padding: '2px 8px', borderRadius: 99, background: 'var(--success-50)', color: 'var(--success-700)', fontSize: 11, fontWeight: 600 }}>Up to date</span>
}

/**
 * Manager My Team page.
 */
function TeamPage() {
  const navigate = useNavigate()

  const [members, setMembers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [filter, setFilter]         = useState('all')
  const [selected, setSelected]     = useState([])
  const [openMenu, setOpenMenu]     = useState(null)

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleMember, setScheduleMember] = useState(null)
  const [addOpen, setAddOpen]       = useState(false)
  const [editMember, setEditMember] = useState(null)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getTeam(filter)
      setMembers(res.data || [])
      setSelected([])
    } catch (err) {
      setError('Could not load team members. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    setSelected(prev => prev.length === members.length ? [] : members.map(m => m.id))
  }

  async function handleRemove(id) {
    if (!window.confirm('Remove this member from your team?')) return
    try {
      await api.removeMember(id)
      load()
    } catch {
      alert('Could not remove member.')
    }
  }

  function openSchedule(member) {
    setScheduleMember(member)
    setScheduleOpen(true)
    setOpenMenu(null)
  }

  const thStyle = { padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid var(--border-default)' }
  const tdStyle = { padding: '12px 16px', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>My Team</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={14} /> Import CSV
          </button>
          <button onClick={() => setAddOpen(true)} style={{ padding: '9px 16px', background: 'var(--brand-500)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserPlus size={14} /> Add Member
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: 99,
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              background: filter === f ? 'var(--brand-500)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--fg-muted)',
              transition: 'all 0.15s',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40 }}><Spinner /></div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : members.length === 0 ? (
        <EmptyState message={filter === 'all' ? 'No team members yet. Add your first member.' : `No members with "${filter}" status.`} />
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 40 }}>
                  <input type="checkbox" checked={selected.length === members.length} onChange={toggleAll} />
                </th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Last Assessed</th>
                <th style={thStyle}>Resume Updated</th>
                <th style={{ ...thStyle, width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ background: selected.includes(m.id) ? 'var(--brand-50)' : 'transparent' }}>
                  <td style={tdStyle}>
                    <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleSelect(m.id)} />
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                      onClick={() => navigate(`/manager/team/${m.id}`)}
                    >
                      <Avatar name={`${m.first_name} ${m.last_name}`} size={32} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-primary)' }}>{m.first_name} {m.last_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}><AssessBadge lastAssessed={m.last_assessed} /></td>
                  <td style={{ ...tdStyle, fontSize: 13, color: 'var(--fg-muted)' }}>{m.last_assessed ? formatDate(m.last_assessed) : '—'}</td>
                  <td style={{ ...tdStyle, fontSize: 13, color: 'var(--fg-muted)' }}>{m.resume_updated ? formatDate(m.resume_updated) : '—'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={() => openSchedule(m)}
                        style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Calendar size={12} /> Schedule
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                          <MoreVertical size={16} color="var(--fg-muted)" />
                        </button>
                        {openMenu === m.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-md)', minWidth: 120, overflow: 'hidden' }}>
                            <button onClick={() => { setEditMember(m); setOpenMenu(null) }} style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>Edit</button>
                            <button onClick={() => handleRemove(m.id)} style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--danger-500)' }}>Remove</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk select bar */}
      {selected.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--fg-primary)', color: '#fff', borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow-lg)', zIndex: 100 }}>
          <span style={{ fontSize: 14 }}>{selected.length} selected</span>
          <button onClick={() => { setScheduleMember(null); setScheduleOpen(true) }} style={{ padding: '7px 16px', background: 'var(--brand-500)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} /> Schedule {selected.length}
          </button>
          <button onClick={() => setSelected([])} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>
      )}

      {/* Modals */}
      <ScheduleModal
        open={scheduleOpen}
        onClose={() => { setScheduleOpen(false); setScheduleMember(null) }}
        member={scheduleMember}
        selectedIds={selected}
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
