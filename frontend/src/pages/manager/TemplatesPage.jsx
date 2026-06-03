// pages/manager/TemplatesPage.jsx
// Interview templates — list and create.

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Button from '../../components/shared/Button'
import * as api from '../../services/api'

function TemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ name: '', description: '', attempts: 3 })
  const [saving, setSaving]       = useState(false)

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
            <div key={t.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{t.name}</div>
              {t.type && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, background: 'var(--brand-50)', color: 'var(--brand-600)', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{t.type}</span>}
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>{t.description || 'No description.'}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm">Use Template</Button>
                <Button size="sm" variant="secondary">Edit</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TemplatesPage
