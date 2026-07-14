import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import * as api from '../../services/api'

function matchesUser(user, query) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  const firstName = String(user.first_name || '')
  const lastName = String(user.last_name || '')
  const name = `${firstName} ${lastName}`.trim().toLowerCase()
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toLowerCase()
  return name.includes(normalized)
    || String(user.email || '').toLowerCase().includes(normalized)
    || initials.includes(normalized)
    || String(user.role || '').toLowerCase().includes(normalized)
}

function ReportRecipientsSelector({
  selectedIds,
  onChange,
  label = 'Report email recipients',
  help = 'When the interview report is ready, Screeno emails only these selected users. Leave empty to send no report email.',
}) {
  const [orgUsers, setOrgUsers] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const selectedSet = useMemo(() => new Set((selectedIds || []).map(Number)), [selectedIds])

  useEffect(() => {
    let active = true
    setLoading(true)
    api.getScheduleOrgUsers()
      .then(response => {
        if (active) setOrgUsers(response.data || [])
      })
      .catch(() => {
        if (active) setOrgUsers([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const selectedUsers = orgUsers.filter(user => selectedSet.has(Number(user.id)))
  const suggestions = orgUsers
    .filter(user => !selectedSet.has(Number(user.id)) && matchesUser(user, query))
    .slice(0, 8)

  function setNext(nextSet) {
    onChange?.([...nextSet])
  }

  function addUser(user) {
    const next = new Set(selectedSet)
    next.add(Number(user.id))
    setNext(next)
    setQuery('')
  }

  function removeUser(userId) {
    const next = new Set(selectedSet)
    next.delete(Number(userId))
    setNext(next)
  }

  return (
    <div className="form-field form-field--full">
      <span className="form-label">{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 30, marginBottom: 8 }}>
        {selectedUsers.length === 0 ? (
          <span className="form-help">No report emails will be sent.</span>
        ) : selectedUsers.map(user => (
          <span key={user.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 999, background: 'var(--bg-surface-alt)', color: 'var(--fg-body)', fontSize: 12, fontWeight: 600 }}>
            {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
            <button type="button" onClick={() => removeUser(user.id)} aria-label={`Remove ${user.email}`} style={{ border: 0, background: 'transparent', padding: 0, display: 'inline-flex', cursor: 'pointer', color: 'inherit' }}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 11px', background: 'var(--bg-surface)' }}>
          <Search size={14} color="var(--fg-subtle)" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={loading ? 'Loading organization users...' : 'Search users by name, initials, or email...'}
            style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13 }}
          />
        </div>
        {query.trim() && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20, maxHeight: 180, overflowY: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: '0 10px 24px rgba(15,23,42,0.12)' }}>
            {suggestions.length === 0 ? (
              <div style={{ padding: 10, fontSize: 12, color: 'var(--fg-muted)' }}>No organization users found.</div>
            ) : suggestions.map(user => (
              <button key={user.id} type="button" onClick={() => addUser(user)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 11px', border: 0, borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}</span>
                <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{user.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="form-help">{help}</span>
    </div>
  )
}

export default ReportRecipientsSelector
