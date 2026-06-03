// CandidateLayout — minimal layout for interview flow screens.

import { Outlet, useLocation } from 'react-router-dom'

const STEPS = ['device-check', 'consent', 'ai', 'exam', 'done']
const STEP_LABELS = ['Device Check', 'Consent', 'Interview', 'Exam', 'Done']

function StepIndicator({ currentStep }) {
  const idx = STEPS.indexOf(currentStep)
  if (idx < 0) return null

  return (
    <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 26, height: 26,
            borderRadius: '50%',
            border: `2px solid ${i <= idx ? 'var(--brand-500)' : 'var(--border-default)'}`,
            background: i < idx ? 'var(--brand-500)' : i === idx ? 'var(--brand-50)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: i <= idx ? 'var(--brand-500)' : 'var(--fg-muted)',
          }}>
            {i < idx ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 24, height: 2, background: i < idx ? 'var(--brand-500)' : 'var(--border-default)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function CandidateLayout() {
  const { pathname } = useLocation()
  const parts = pathname.split('/')
  const currentStep = parts[parts.length - 1]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        height: 60,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-500)' }}>Screeno</span>
        <StepIndicator currentStep={currentStep} />
        <div style={{ width: 80 }} />
      </header>

      {/* Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}

export default CandidateLayout
