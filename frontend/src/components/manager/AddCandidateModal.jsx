// AddCandidateModal — two ways to add team members:
//   Tab 1 "Find member"  — search existing users/candidates in the org and add multiples
//   Tab 2 "Add manually" — enter name, email, phone manually
// A user can belong to multiple managers' teams (manager_id is set per schedule, not per candidate).

import { useState, useEffect, useRef } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Spinner from '../shared/Spinner'
import Avatar from '../shared/Avatar'
import * as api from '../../services/api'

const TAB_FIND   = 'find'
const TAB_MANUAL = 'manual'

// ── tiny avatar ────────────────────────────────────────────────
function AddCandidateModal({ open, onClose, onDone }) {
  const [tab, setTab]           = useState(TAB_FIND)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)

  // ── Find tab state ────────────────────────────────────────────
  const [allUsers, setAllUsers]     = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState(new Set())  // ids
  const searchRef = useRef(null)

  // ── Manual tab state ──────────────────────────────────────────
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', employeeId: '', department: '', position: '', source: 'LinkedIn', type: 'internal' })
  const [resumeFile, setResumeFile] = useState(null)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

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
      setTab(TAB_FIND); setError(null); setSuccess(null)
      setSearch(''); setSelected(new Set())
      setForm({ firstName: '', lastName: '', email: '', phone: '', employeeId: '', department: '', position: '', source: 'LinkedIn', type: 'internal' })
      setResumeFile(null)
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
          phone:     u.phone      || '',
          type:      u.type       || 'internal',
          existingId: u.id,
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

  async function handleManualSubmit(e) {
    e.preventDefault()
    if (!form.firstName.trim()) return setError('First name is required.')
    if (!form.email.trim())     return setError('Email is required.')
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    if (!emailOk) return setError('Enter a valid email address.')

    setLoading(true); setError(null)
    try {
      if (form.type === 'external') {
        let resumeUrl = null
        let resumeText = null
        let tags = []
        if (resumeFile) {
          const res = await api.uploadResume(null, resumeFile)
          resumeUrl = res.data?.resumeUrl || null
          resumeText = res.data?.resumeText || null
          tags = Array.isArray(res.data?.tags) ? res.data.tags : []
        }
        await api.addExternalCandidate({
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim(),
          resumeUrl,
          resumeText,
          tags,
        })
      } else {
        await api.addMember({
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim(),
          phone:     form.phone.trim(),
          employeeId: form.employeeId.trim(),
          department: form.department.trim(),
          position:  form.position.trim(),
          type:      form.type,
        })
      }
      setSuccess(`${form.firstName} added${form.type === 'external' ? ' as an external candidate' : ' to your team'}.`)
      setTimeout(() => { onDone && onDone(); onClose() }, 1000)
    } catch (err) {
      setError(err.message || 'Could not add member.')
    } finally {
      setLoading(false)
    }
  }

  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      onClick={() => { setTab(id); setError(null) }}
      style={{
        flex: 1, padding: '9px 0', border: 'none', background: 'transparent',
        fontFamily: 'inherit', fontSize: 13, fontWeight: tab === id ? 600 : 500,
        color: tab === id ? 'var(--brand-500)' : 'var(--slate-500)',
        borderBottom: tab === id ? '2px solid var(--brand-500)' : '2px solid transparent',
        cursor: 'pointer', transition: 'all 120ms',
      }}
    >{label}</button>
  )

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 120ms, box-shadow 120ms',
  }
  const lbl = (text, optional) => (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 5 }}>
      {text} {optional && <span style={{ fontWeight: 400, color: 'var(--slate-400)' }}>(optional)</span>}
    </label>
  )

  return (
    <div style={{ position: 'relative', zIndex: 1050 }}>
      <Modal open={open} onClose={onClose} title="Add Team Member" size="md">
        {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--slate-200)', marginBottom: 20 }}>
        {tabBtn(TAB_FIND,   'Find in organisation')}
        {tabBtn(TAB_MANUAL, 'Add manually')}
      </div>

      {/* Success message */}
      {success && (
        <div style={{ padding: '10px 14px', background: 'var(--success-50)', border: '1px solid #A7F3D0', borderRadius: 8, fontSize: 13, color: 'var(--success-600)', marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}

      {/* ── FIND TAB ─────────────────────────────────────────── */}
      {tab === TAB_FIND && (
        <div>
          <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '0 0 14px' }}>
            Search your organisation's users and add one or more to your team. Members can appear in multiple managers' teams.
          </p>

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
                        Last assessed {new Date(u.last_assessed).toLocaleDateString()}
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
        </div>
      )}

      {/* ── MANUAL TAB ───────────────────────────────────────── */}
      {tab === TAB_MANUAL && (
        <form onSubmit={handleManualSubmit}>
          <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '0 0 16px' }}>
            Add someone who isn't in the system yet. They'll receive an invite email when you schedule their first interview.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                {lbl('First name')}
                <input
                  type="text"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={e => setF('firstName', e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div>
                {lbl('Last name', true)}
                <input
                  type="text"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={e => setF('lastName', e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            </div>

            <div>
              {lbl('Work email')}
              <input
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={e => setF('email', e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              {lbl('Phone', true)}
              <input
                type="tel"
                placeholder="Phone number"
                value={form.phone}
                onChange={e => setF('phone', e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                {lbl('Employee ID')}
                <input
                  type="text"
                  placeholder="EMP123"
                  value={form.employeeId}
                  onChange={e => setF('employeeId', e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div>
                {lbl('Department')}
                <input
                  type="text"
                  placeholder="Engineering"
                  value={form.department}
                  onChange={e => setF('department', e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            </div>

            <div>
              {lbl('Role / Position')}
              <input
                type="text"
                placeholder="Frontend Developer"
                value={form.position}
                onChange={e => setF('position', e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {form.type === 'external' && (
              <div>
                {lbl('Source')}
                <select
                  value={form.source}
                  onChange={e => setF('source', e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Naukri">Naukri</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            {form.type === 'external' && (
              <div>
                {lbl('Resume', true)}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={e => setResumeFile(e.target.files?.[0] || null)}
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              {lbl('Member type')}
              <div style={{ display: 'flex', gap: 8 }}>
                {['internal', 'external'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setF('type', t)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, fontFamily: 'inherit',
                      border: `1px solid ${form.type === t ? 'var(--brand-500)' : 'var(--slate-200)'}`,
                      background: form.type === t ? 'var(--brand-50)' : 'var(--bg-surface)',
                      color: form.type === t ? 'var(--brand-700)' : 'var(--slate-700)',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 120ms',
                      textTransform: 'capitalize',
                    }}
                  >{t}</button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '6px 0 0' }}>
                Internal = employee. External = freelancer or contractor.
              </p>
            </div>

            {error && <p style={{ fontSize: 12, color: '#EF4444', margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={loading}>Add to Team →</Button>
            </div>
          </div>
        </form>
      )}
      </Modal>
    </div>
  )
}

export default AddCandidateModal
