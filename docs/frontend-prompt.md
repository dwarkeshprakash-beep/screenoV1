# Frontend Prompt — Screeno

> Use this prompt when building any frontend code for Screeno.
> Reference: frontend/CLAUDE.md for folder structure, root CLAUDE.md for full stack context.

---

## Golden rules (read before writing a single line)

1. **JSX only** — no TypeScript, no `.tsx`, no type annotations anywhere
2. **Beginner-friendly** — every file should be readable by someone learning React
3. **Comments everywhere** — explain what and why, not just what
4. **Variables at top, render at bottom** — strict component structure
5. **Check shared/ first** — never build a new component without checking if one exists
6. **CSS variables only** — no hardcoded colors, all from `tokens.css`
7. **One component per file** — max ~150 lines, split if larger

---

## Component structure template

Every component must follow this structure exactly:

```jsx
// ─────────────────────────────────────────────
// ComponentName.jsx
// What this component does (one line description)
// Used by: which pages/roles use this
// ─────────────────────────────────────────────

import React, { useState, useEffect } from 'react'

// Import shared components — always prefer these over building new ones
import Button from '../shared/Button'
import Card from '../shared/Card'
import Spinner from '../shared/Spinner'

// Import the API service — never call fetch/axios directly
import { getCandidates } from '../../services/api'

function ComponentName({ prop1, prop2 }) {

  // ─── STATE ──────────────────────────────────
  // Declare all state at the very top
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ─── DERIVED VALUES ─────────────────────────
  // Values computed from state (no function calls)
  const hasCandidates = candidates.length > 0

  // ─── EFFECTS ────────────────────────────────
  // Fetch data, set up event listeners, etc.
  useEffect(() => {
    loadCandidates()
  }, []) // empty array = runs once when component mounts

  // ─── HANDLERS ───────────────────────────────
  // All event handler functions
  async function loadCandidates() {
    setLoading(true)
    setError(null)
    try {
      const data = await getCandidates()
      setCandidates(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(candidate) {
    // handle selection
  }

  // ─── EARLY RETURNS ──────────────────────────
  // Always handle loading, error, and empty states
  if (loading) return <Spinner />
  if (error) return <div style={{ color: 'red' }}>{error}</div>
  if (!hasCandidates) return <div>No candidates found</div>

  // ─── RENDER ─────────────────────────────────
  // Main render is always at the bottom
  return (
    <div style={{ padding: '24px' }}>
      <h2>Candidates</h2>
      {candidates.map(candidate => (
        <Card key={candidate.id} onClick={() => handleSelect(candidate)}>
          {candidate.first_name} {candidate.last_name}
        </Card>
      ))}
    </div>
  )
}

export default ComponentName
```

---

## Shared components to build first

These are used by ALL roles. Build these before any page-specific components.

### Button.jsx
```jsx
// frontend/src/components/shared/Button.jsx
// Reusable button — works for every role, every page
// Variants: primary, secondary, danger, ghost

import React from 'react'

function Button({ children, onClick, variant = 'primary', disabled = false, loading = false, fullWidth = false }) {

  // Styles for each variant using our design tokens
  const styles = {
    primary: {
      background: 'var(--brand-500)',
      color: 'var(--fg-on-brand)',
      border: 'none',
    },
    secondary: {
      background: 'var(--bg-surface)',
      color: 'var(--fg-body)',
      border: '1px solid var(--border-default)',
    },
    danger: {
      background: 'var(--danger-500)',
      color: '#fff',
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--brand-500)',
      border: 'none',
    },
  }

  const baseStyle = {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    transition: 'opacity 150ms',
    fontFamily: 'var(--font-sans)',
    ...styles[variant],
  }

  return (
    <button style={baseStyle} onClick={onClick} disabled={disabled || loading}>
      {loading ? 'Loading...' : children}
    </button>
  )
}

export default Button
```

### Card.jsx
```jsx
// frontend/src/components/shared/Card.jsx
// Reusable white card container — used everywhere

import React from 'react'

function Card({ children, padding = '24px', onClick, style = {} }) {

  const cardStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: '12px',
    padding: padding,
    boxShadow: 'var(--shadow-sm)',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  }

  return (
    <div style={cardStyle} onClick={onClick}>
      {children}
    </div>
  )
}

export default Card
```

### Badge.jsx
```jsx
// frontend/src/components/shared/Badge.jsx
// Status pill — pass/fail/pending indicators
// Used in: team table, candidate pipeline, reports

import React from 'react'

function Badge({ label, type = 'default' }) {

  // Color mapping using design tokens
  const colors = {
    success:  { bg: 'var(--success-100)',  color: 'var(--success-700)'  },
    danger:   { bg: 'var(--danger-100)',   color: 'var(--danger-700)'   },
    warning:  { bg: 'var(--warning-100)',  color: 'var(--warning-700)'  },
    brand:    { bg: 'var(--brand-100)',    color: 'var(--brand-700)'    },
    default:  { bg: 'var(--slate-100)',    color: 'var(--slate-700)'    },
  }

  const { bg, color } = colors[type] || colors.default

  const style = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '600',
    background: bg,
    color: color,
  }

  return <span style={style}>{label}</span>
}

export default Badge
```

---

## Key screens to build

### 1. Manager — Team Page

Shows all team members with their assessment status.

```
Features needed:
- Table of team members (name, role, last assessed, status badge, actions)
- Bulk select + schedule button
- Filter by assessment status (up-to-date / overdue / never)
- Click member → go to member profile page
- Top right: Add member button, Import CSV button

Shared components used: Table, Badge, Button, Card, Avatar
```

### 2. Manager — Schedule Modal

4-step wizard for scheduling an interview.

```
Step 1: Interview type
  - Client mock interview OR Internal monthly assessment
  - Interview mode: Simple (10 questions) OR Adaptive (AI follows up)
  - Transcription mode: Local Whisper (internal) OR Groq API (external)

Step 2: Configure
  - Number of attempts: 3 / 5 / custom / unlimited
  - Cooldown between attempts (hours)
  - Window duration (days candidate has to complete)
  - If unlimited: generate report every N attempts
  - Report delivery: after each attempt OR after all attempts

Step 3: Questions
  - Upload JD (PDF, DOCX, or plain text) — optional
  - Focus areas (custom text for AI to focus on)
  - Difficulty: Easy / Medium / Hard

Step 4: Confirm
  - Summary of all settings
  - Send button

Shared components used: Modal, Button, Input, FileUpload
```

### 3. Candidate — AI Voice Interview Page

The most complex screen. Desktop only.

```
Layout:
- Top: timer ring showing time remaining
- Center: animated waveform (pulsing when AI speaks, different when listening)
- Below waveform: current question text (readable, not just audio)
- Candidate camera: small circle bottom-left
- Live transcript panel: toggleable, bottom of screen
- Start Answer / Stop Answer: large clear buttons at bottom
- Proctoring monitor: invisible background component

States to handle:
- 'loading'    → "AI is preparing your interview..."
- 'ai_speaking'  → waveform animating, start button disabled
- 'listening'  → "Your turn" indicator, start button enabled
- 'recording'  → recording indicator, stop button enabled
- 'processing' → "Processing your answer...", 1-2 sec wait
- 'ended'      → interview complete, redirect to done page
```

### 4. Interviewer — Live Room

Human video interview with side panel.

```
Layout: split screen
- Left (60%): LiveKit video call (candidate + interviewer)
- Right (40%): side panel with tabs
  - Tab 1: Questions (from question bank, click to mark as asked)
  - Tab 2: Notes (auto-saved text area)
  - Tab 3: AI Suggestions (appears after candidate answers, optional follow-ups)

Shared components used: Tabs, Button, Card
```

---

## AI interview implementation

### Audio capture (cross-browser with MediaRecorder)

```jsx
// hooks/useInterview.js
// Handles audio recording for candidate answers

import { useState, useRef } from 'react'

function useInterview(interviewId) {

  // State for the interview session
  const [phase, setPhase] = useState('loading')  // loading/ai_speaking/listening/recording/processing
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [transcript, setTranscript] = useState([])  // running log of Q&A

  // Refs for audio (refs don't cause re-renders)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Start recording candidate's answer
  async function startRecording() {
    // Ask browser for microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // MediaRecorder works in all browsers (Chrome, Firefox, Safari, Edge)
    mediaRecorderRef.current = new MediaRecorder(stream)
    audioChunksRef.current = []

    // Collect audio data as it comes in
    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data)
    }

    mediaRecorderRef.current.start()
    setPhase('recording')
  }

  // Stop recording and send for transcription
  async function stopRecording() {
    setPhase('processing')

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        // Combine all audio chunks into one blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        // Send to backend for transcription
        const formData = new FormData()
        formData.append('audio', audioBlob, 'answer.webm')
        formData.append('questionId', currentQuestion.id)
        formData.append('interviewId', interviewId)

        const response = await fetch(`/api/interviews/${interviewId}/answer`, {
          method: 'POST',
          body: formData,
        })
        const result = await response.json()

        // Add to transcript log
        setTranscript(prev => [...prev, {
          question: currentQuestion.text,
          answer: result.data.transcribedText,
        }])

        resolve(result.data)
      }
      mediaRecorderRef.current.stop()
    })
  }

  // AI speaks using browser built-in TTS
  function speakQuestion(text) {
    setPhase('ai_speaking')

    // browser.speechSynthesis — works in all browsers, completely free
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'   // Indian English voice
    utterance.rate = 0.95      // slightly slower for clarity

    utterance.onend = () => {
      // AI finished speaking — candidate's turn
      setPhase('listening')
    }

    window.speechSynthesis.speak(utterance)
  }

  return { phase, currentQuestion, transcript, startRecording, stopRecording, speakQuestion, setPhase, setCurrentQuestion }
}

export default useInterview
```

---

## Proctoring monitor (background component)

```jsx
// components/interview/ProctoringMonitor.jsx
// Runs invisibly during all interview types
// Captures: tab switches, fullscreen exits, face absence
// Does NOT block the interview — only logs events

import React, { useEffect } from 'react'

function ProctoringMonitor({ interviewId, onViolation }) {

  useEffect(() => {
    // ── TAB SWITCH DETECTION ──
    function handleVisibilityChange() {
      if (document.hidden) {
        logEvent('tab_switch', 'medium')
        onViolation('You switched tabs. This has been recorded.')
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // ── FULLSCREEN EXIT DETECTION ──
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        logEvent('fullscreen_exit', 'low')
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    // ── CLEANUP: remove listeners when component unmounts ──
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Send event to backend
  async function logEvent(type, severity) {
    await fetch(`/api/interviews/${interviewId}/proctoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, severity, timestamp: new Date().toISOString() }),
    })
  }

  // This component renders nothing — it's invisible
  return null
}

export default ProctoringMonitor
```

---

## Responsive + desktop-only interview gate

```jsx
// Add to top of ALL interview pages (AIInterviewPage, ExamPage)
import React, { useState, useEffect } from 'react'

function DesktopOnlyGate({ children }) {

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check screen width
    function checkScreen() {
      setIsMobile(window.innerWidth < 768)
    }
    checkScreen()
    window.addEventListener('resize', checkScreen)
    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  if (isMobile) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--fg-primary)' }}>Use a Desktop or Laptop</h2>
        <p style={{ color: 'var(--fg-muted)', marginTop: '12px' }}>
          Interviews require a larger screen, camera, and microphone.
          Please switch to a desktop or laptop to continue.
        </p>
      </div>
    )
  }

  return children
}

export default DesktopOnlyGate
```

---

## Improvements suggested over the v2 prototype

1. Replace `window.lucide.createIcons()` with proper `lucide-react` imports — no global namespace pollution
2. Replace all inline styles with CSS variables — use `tokens.css` throughout
3. Add skeleton loading states instead of spinners — feels faster
4. Add `localStorage` backup for interview answers — protects against browser crashes
5. Debounce search inputs (300ms) — don't fire API call on every keystroke
6. Separate each interview phase into its own state machine — easier to debug
7. Add retry logic on transcription API failure — don't just fail silently
8. Show live transcript on screen so candidate can see what the AI heard — helps catch transcription errors
