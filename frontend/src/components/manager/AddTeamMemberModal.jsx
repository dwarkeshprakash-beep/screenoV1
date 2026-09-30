// AddTeamMemberModal - search existing organisation users and add them to your team.
// User accounts are created in the Users module (admin-only), not here - this modal only
// links an already-existing account to the current manager's team.

import { useState, useEffect, useRef } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Spinner from '../shared/Spinner'
import Avatar from '../shared/Avatar'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

function AddTeamMemberModal({ open, onClose, onDone }) {
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)

  const [allUsers, setAllUsers]     = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState(new Set())  // ids
  const searchRef = useRef(null)

  async function loadUsers() {
    setUsersLoading(true)
    try {
      const res = await api.getOrgUsersNotInTeam()
      setAllUsers(res.data || [])
    } catch {
      setAllUsers([])
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setError(null); setSuccess(null)
      setSearch(''); setSelected(new Set())
      return
    }
    loadUsers()
  }, [open])

  const filtered = search.trim()
    ? allUsers.filter(u => {
        const name = `${u.first_name} ${u.last_name}`.toLowerCase()
        return name.includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase())
      })
    : allUsers

  function toggleUser(id) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  async function handleAddSelected() {
    if (selected.size === 0) return setError('Select at least one member.')
    const toAdd = allUsers.filter(u => selected.has(u.id))
    setLoading(true); setError(null)
    try {
      await Promise.all(toAdd.map(u =>
        api.addMember({
          firstName: u.first_name || '',
          lastName:  u.last_name  || '',
          email:     u.email      || '',
        }).catch(() => {})
      ))
      setSuccess(`${selected.size} member${selected.size !== 1 ? 's' : ''} added to your team.`)
      setTimeout(() => { onDone && onDone(); onClose() }, 1000)
    } catch (err) {
      setError(err.message || 'Could not add members.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 120ms, box-shadow 120ms',
  }

  return (
    <div style={{ position: 'relative', zIndex: 1050 }}>
      <Modal open={open} onClose={onClose} title="Add Team Member" size="md">
        <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '0 0 14px' }}>
          Search your organisation's users and add one or more to your team. New accounts are created in the Users module.
        </p>

        {success && (
          <div style={{ padding: '10px 14px', background: 'var(--success-50)', border: '1px solid var(--success-200)', borderRadius: 8, fontSize: 13, color: 'var(--success-600)', marginBottom: 16 }}>
            ✓ {success}
          </div>
        )}

        <input
          ref={searchRef}
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
          onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
        />

        {selected.size > 0 && (
          <div style={{ fontSize: 12, color: 'var(--brand-500)', fontWeight: 600, marginBottom: 8 }}>
            {selected.size} selected
          </div>
        )}

        <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--slate-200)', borderRadius: 8 }}>
          {usersLoading ? (
            <Spinner center />
          ) : filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>
              {search ? 'No users match your search.' : 'All organisation users are already in your team.'}
            </div>
          ) : (
            filtered.map((u, i) => {
              const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
              const isSel = selected.has(u.id)
              return (
                <div
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', cursor: 'pointer',
                    borderTop: i === 0 ? 'none' : '1px solid var(--slate-100)',
                    background: isSel ? '#FAFAFE' : 'var(--bg-surface)',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--slate-50)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-surface)' }}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleUser(u.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ accentColor: 'var(--brand-500)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <Avatar name={name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--slate-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{u.email}</div>
                  </div>
                  {u.last_assessed && (
                    <span style={{ fontSize: 11, color: 'var(--slate-400)', whiteSpace: 'nowrap' }}>
                      Last assessed {formatDate(u.last_assessed)}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 10 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" loading={loading} onClick={handleAddSelected} disabled={selected.size === 0}>
            Add {selected.size > 0 ? `${selected.size} ` : ''}member{selected.size !== 1 ? 's' : ''} →
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default AddTeamMemberModal
