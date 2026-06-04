// pages/manager/TemplatesPage.jsx
// Interview templates — list, create, edit, delete, and use.

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Button from '../../components/shared/Button'
import Modal from '../../components/shared/Modal'
import ScheduleModal from '../../components/manager/ScheduleModal'
import * as api from '../../services/api'

function TemplatesPage() {
  const [templates, setTemplates]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ name: '', description: '', attempts: 3 })
  const [saving, setSaving]         = useState(false)

  // Edit state
  const [editTemplate, setEditTemplate] = useState(null)
  const [editForm, setEditForm]         = useState({ name: '', description: '', attempts: 3 })
  const [editSaving, setEditSaving]     = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  // Use Template — opens ScheduleModal pre-filled
  const [useTemplate, setUseTemplate]   = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getTemplates()
      setTemplates(res.data || [])
    } catch (err) {
      setError('Could not load templates.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name) return
    setSaving(true)
    try {
      await api.createTemplate(form)
      setForm({ name: '', description: '', attempts: 3 })
      setShowForm(false)
      load()
    } catch (err) {
      alert('Could not create template.')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(t) {
    setEditTemplate(t)
    setEditForm({ name: t.name, description: t.description || '', attempts: t.attempts || 3 })
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (!editForm.name) return
    setEditSaving(true)
    try {
      await api.updateTemplate(editTemplate.id, editForm)
      setEditTemplate(null)
      load()
    } catch (err) {
      alert('Could not update template.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteTemplate(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch (err) {
      alert('Could not delete template.')
    } finally {
      setDeleting(false)
    }
  }

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Interview Templates</h1>
        <Button onClick={() => setShowForm(s => !s)}>
          <Plus size={14} /> New Template
        </Button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Template name *</label>
              <input style={inputStyle} placeholder="e.g. Senior .NET Developer Assessment" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Description / focus prompt</label>
              <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe what this template is for…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Attempts</label>
              <select style={inputStyle} value={form.attempts} onChange={e => setForm(f => ({ ...f, attempts: parseInt(e.target.value, 10) }))}>
                {[1, 2, 3, 5].map(n => <option key={n} value={n}>{n}</option>)}
                <option value={-1}>Unlimited</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save Template</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40 }}><Spinner /></div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : templates.length === 0 ? (
        <EmptyState message="No templates yet. Create one to reuse interview settings." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {templates.map(t => (
            <div key={t.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{t.name}</div>
              {t.type && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, background: 'var(--brand-50)', color: 'var(--brand-600)', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{t.type}</span>}
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 4px', lineHeight: 1.5, flex: 1 }}>{t.description || 'No description.'}</p>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>Max attempts: {t.attempts === -1 ? 'Unlimited' : t.attempts}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" onClick={() => setUseTemplate(t)}>Use Template</Button>
                <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>
                  <Pencil size={12} /> Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget(t)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={!!editTemplate} onClose={() => setEditTemplate(null)} title="Edit Template" size="sm">
        {editTemplate && (
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Template name *</label>
              <input style={inputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Description</label>
              <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Attempts</label>
              <select style={inputStyle} value={editForm.attempts} onChange={e => setEditForm(f => ({ ...f, attempts: parseInt(e.target.value, 10) }))}>
                {[1, 2, 3, 5].map(n => <option key={n} value={n}>{n}</option>)}
                <option value={-1}>Unlimited</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" type="button" onClick={() => setEditTemplate(null)}>Cancel</Button>
              <Button type="submit" loading={editSaving}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Template" size="sm">
        {deleteTarget && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--fg-body)', marginBottom: 20 }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Use Template — opens ScheduleModal with template pre-filled */}
      <ScheduleModal
        open={!!useTemplate}
        onClose={() => setUseTemplate(null)}
        template={useTemplate}
        onDone={() => setUseTemplate(null)}
      />
    </div>
  )
}

export default TemplatesPage
