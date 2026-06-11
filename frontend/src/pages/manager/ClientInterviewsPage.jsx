import { useState } from 'react'
import { Plus, LayoutTemplate, Sparkles, Download } from 'lucide-react'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'

const MOCK_TEMPLATES = [
  { id: 1, client: 'Acme Corp', role: 'Frontend Engineer', headcount: 3, tags: ['React', 'TypeScript', 'Redux'], matchCount: 5 },
  { id: 2, client: 'Globex', role: 'Backend Developer', headcount: 2, tags: ['Node.js', 'Express', 'PostgreSQL'], matchCount: 8 },
]

function WizardModal({ open, onClose }) {
  const [step, setStep] = useState(1)
  
  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={step === 1 ? 'Client Details' : 'AI Tag Extraction'} size="md">
      <div style={{ padding: '10px 0' }}>
        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Client Name" style={{ padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13 }} />
            <input type="text" placeholder="Role Required" style={{ padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13 }} />
            <input type="number" placeholder="Headcount" style={{ padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13 }} />
            <textarea placeholder="Paste Client JD here..." style={{ height: 120, padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <Sparkles size={32} color="#5B4FE9" />
            <p style={{ fontSize: 13, color: '#374151', textAlign: 'center' }}>AI has analyzed the JD and extracted the following key tags for team matching:</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['React', 'Vite', 'GraphQL', 'AWS'].map(t => (
                <span key={t} style={{ padding: '4px 10px', background: '#EFEDFD', color: '#5B4FE9', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#64748B' }}>5 candidates match these requirements.</p>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <Button variant="secondary" onClick={() => step === 1 ? onClose() : setStep(1)}>Back</Button>
        <Button onClick={() => step === 1 ? setStep(2) : onClose()}>{step === 1 ? 'Extract Tags ✨' : 'Save Template'}</Button>
      </div>
    </Modal>
  )
}

function ClientInterviewsPage() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [tab, setTab] = useState('overview')

  if (selectedTemplate) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setSelectedTemplate(null)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#64748B', fontWeight: 600 }}>← Back</button>
          <h2 style={{ fontSize: 20, margin: 0, color: '#0F172A' }}>{selectedTemplate.client} - {selectedTemplate.role}</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
          {['overview', 'jd', 'candidates', 'reports'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: 'transparent', border: 0, padding: '5px 10px', fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? '#5B4FE9' : '#64748B', borderBottom: tab === t ? '2px solid #5B4FE9' : '2px solid transparent', cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, color: '#475569' }}>Content for {tab} goes here...</p>
          {tab === 'candidates' && (
            <div style={{ display: 'flex', gap: 15, marginTop: 15 }}>
              <div style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 8, padding: 15, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Sarah Connor</p>
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>95% Match</p>
                </div>
                <Button>Invite to Interview</Button>
              </div>
            </div>
          )}
          {tab === 'reports' && (
             <Button variant="secondary" style={{ marginTop: 10 }}><Download size={13} style={{ marginRight: 6 }}/> Export Filters</Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => setWizardOpen(true)}><Plus size={13} style={{ marginRight: 6 }}/> New Template</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1rem' }}>
        {MOCK_TEMPLATES.map(t => (
          <div key={t.id} onClick={() => setSelectedTemplate(t)} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'box-shadow 120ms', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFEDFD', color: '#5B4FE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LayoutTemplate size={18} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: 999, height: 20, display: 'inline-flex', alignItems: 'center' }}>{t.matchCount} Matches</span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>{t.role}</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 12px' }}>{t.client} • {t.headcount} needed</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {t.tags.map(tag => (
                <span key={tag} style={{ fontSize: 11, background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <WizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  )
}

export default ClientInterviewsPage
