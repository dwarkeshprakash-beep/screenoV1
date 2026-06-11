import { useState } from 'react'
import { Plus, Download, AlertCircle } from 'lucide-react'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'

// Mock Data
const MOCK_SUBJECTS = [
  { id: 1, name: 'React Frontend', difficulty: 'Medium', topics: 12, enrolled: 4, duration: '3 months', status: 'Active' },
  { id: 2, name: 'Node.js Backend', difficulty: 'Hard', topics: 8, enrolled: 2, duration: '6 months', status: 'Pending' },
]
const MOCK_CALENDAR = [
  { member: 'Rahul Sharma', months: ['completed', 'scheduled', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'] }
]

function WizardModal({ open, onClose }) {
  const [step, setStep] = useState(1)
  const steps = ['Subject details', 'Sub-topics', 'AI Study Material', 'Assign Candidates']
  
  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`Create Assessment - Step ${step}: ${steps[step-1]}`} size="lg">
      <div style={{ padding: '10px 0' }}>
        {step === 1 && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Subject Name</label>
            <input type="text" placeholder="e.g. Advanced React" style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
              {['Easy', 'Medium', 'Hard'].map(d => (
                <button key={d} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF', fontSize: 12, cursor: 'pointer' }}>{d}</button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 15 }}>Add sub-topics manually or use AI to generate them.</p>
            <Button variant="secondary">Generate with AI ✨</Button>
            <textarea placeholder="Sub-topics..." style={{ width: '100%', height: 100, padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, marginTop: 10, fontFamily: 'inherit' }} />
          </div>
        )}
        {step === 3 && (
          <div style={{ display: 'flex', gap: 15 }}>
            <div style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 8, padding: 15, background: '#F8FAFC' }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>Generated JD / Study Material</p>
              <div style={{ fontSize: 12, color: '#475569', whiteSpace: 'pre-wrap' }}>Mock AI Generated Content...</div>
            </div>
            <div style={{ width: 250, display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 5px' }}>Chat to modify</p>
              <input type="text" placeholder="Make it harder..." style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 12 }} />
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Enforced Rules</p>
            <div style={{ background: '#FEF2F2', padding: 12, borderRadius: 8, border: '1px solid #FECACA', display: 'flex', gap: 8, marginBottom: 15 }}>
              <AlertCircle size={16} color="#EF4444" />
              <div style={{ fontSize: 12, color: '#991B1B' }}>
                - Cannot be rescheduled.<br/>
                - 1 time link, must complete once started.<br/>
                - Tab switching results in warning, then termination.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input type="number" placeholder="Duration (months)" style={{ flex: 1, padding: '8px', border: '1px solid #CBD5E1', borderRadius: 6 }} />
              <select style={{ flex: 1, padding: '8px', border: '1px solid #CBD5E1', borderRadius: 6 }}>
                <option>Month-end dates</option>
                <option>Custom dates</option>
              </select>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <Button variant="secondary" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>Back</Button>
        <Button onClick={() => step < 4 ? setStep(step + 1) : onClose()}>{step === 4 ? 'Create Assessment' : 'Next Step →'}</Button>
      </div>
    </Modal>
  )
}

function MonthlyAssessmentPage() {
  const [tab, setTab] = useState('subjects')
  const [wizardOpen, setWizardOpen] = useState(false)

  const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#94A3B8', borderBottom: '1px solid #E2E8F0', textTransform: 'uppercase' }
  const tdStyle = { padding: '14px 16px', borderBottom: '1px solid #F1F5F9', fontSize: 13, color: '#374151' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('subjects')} style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${tab === 'subjects' ? '#5B4FE9' : '#E2E8F0'}`, background: '#FFF', color: tab === 'subjects' ? '#5B4FE9' : '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Subjects</button>
          <button onClick={() => setTab('calendar')} style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${tab === 'calendar' ? '#5B4FE9' : '#E2E8F0'}`, background: '#FFF', color: tab === 'calendar' ? '#5B4FE9' : '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Year Calendar</button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {tab === 'calendar' && (
            <Button variant="secondary"><Download size={13} style={{ marginRight: 6 }}/> Export</Button>
          )}
          <Button onClick={() => setWizardOpen(true)}><Plus size={13} style={{ marginRight: 6 }}/> New Assessment</Button>
        </div>
      </div>

      {tab === 'subjects' ? (
        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={thStyle}>Subject</th>
                <th style={thStyle}>Difficulty</th>
                <th style={thStyle}>Topics</th>
                <th style={thStyle}>Enrolled</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SUBJECTS.map(s => (
                <tr key={s.id} style={{ background: '#FFF', cursor: 'pointer' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#0F172A' }}>{s.name}</td>
                  <td style={tdStyle}><span style={{ padding: '3px 8px', borderRadius: 999, background: '#F1F5F9', fontSize: 11, fontWeight: 600 }}>{s.difficulty}</span></td>
                  <td style={tdStyle}>{s.topics} sub-topics</td>
                  <td style={tdStyle}>{s.enrolled} candidates</td>
                  <td style={tdStyle}>{s.duration}</td>
                  <td style={tdStyle}><span style={{ padding: '3px 8px', borderRadius: 999, background: s.status === 'Active' ? '#ECFDF5' : '#FFFBEB', color: s.status === 'Active' ? '#059669' : '#D97706', fontSize: 11, fontWeight: 600 }}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, background: '#F8FAFC' }}>Member</th>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                  <th key={m} style={{ ...thStyle, background: '#F8FAFC', textAlign: 'center' }}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_CALENDAR.map((c, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#0F172A' }}>{c.member}</td>
                  {c.months.map((st, j) => {
                    let bg = '#F1F5F9'
                    if (st === 'completed') bg = '#10B981'
                    if (st === 'scheduled') bg = '#3B82F6'
                    if (st === 'cancelled') bg = '#EF4444'
                    return (
                      <td key={j} style={{ padding: 4, borderBottom: '1px solid #F1F5F9' }}>
                        <div style={{ height: 24, borderRadius: 4, background: bg, opacity: st === 'pending' ? 0.3 : 1 }} title={st} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 15, marginTop: 15, fontSize: 12, color: '#64748B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#3B82F6' }}/> Scheduled</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#10B981' }}/> Completed</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#EF4444' }}/> Failed/Cancelled</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#F1F5F9' }}/> Pending</span>
          </div>
        </div>
      )}

      <WizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  )
}

export default MonthlyAssessmentPage
