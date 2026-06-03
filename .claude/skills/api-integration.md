# SKILL: API Integration — Screeno

> How to replace every `window.V2` and `window.V2Store` mock with real backend API calls.
> Every screen in the prototype uses mock data. This file maps what to replace with what.

---

## The mock → real pattern

```js
// BEFORE (v2 prototype — mock data)
const { TEAM } = window.V2
const members = TEAM

// AFTER (production — real API)
const [members, setMembers] = useState([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

useEffect(() => {
  async function load() {
    setLoading(true)
    try {
      const res = await api.getTeam()
      setMembers(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  load()
}, [])
```

---

## API service setup

All API calls go through one file. Never call fetch/axios directly from a component.

```js
// frontend/src/services/api.js

import axios from 'axios'

// Create axios instance with base config
const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,  // sends HttpOnly cookie (refresh token)
})

// Add JWT token to every request automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 errors — try to refresh token
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/refresh`,
          {}, { withCredentials: true })
        localStorage.setItem('accessToken', res.data.data.accessToken)
        // Retry original request
        error.config.headers.Authorization = `Bearer ${res.data.data.accessToken}`
        return client(error.config)
      } catch {
        // Refresh failed — redirect to login
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── AUTH ──
export const login = (email, password) =>
  client.post('/api/auth/login', { email, password })

export const logout = () =>
  client.post('/api/auth/logout')

export const validateMagicLink = (token) =>
  client.post(`/api/auth/magic-link/${token}`)

// ── TEAM (Manager) ──
export const getTeam = () => client.get('/api/team')
export const addMember = (data) => client.post('/api/team/member', data)
export const updateMember = (id, data) => client.patch(`/api/team/member/${id}`, data)
export const deleteMember = (id) => client.delete(`/api/team/member/${id}`)
export const importCSV = (file) => {
  const form = new FormData()
  form.append('file', file)
  return client.post('/api/team/import', form)
}

// ── CANDIDATES ──
export const getCandidates = (jobId) => client.get(`/api/candidates?jobId=${jobId}`)
export const addCandidate = (data) => client.post('/api/candidates', data)

// ── SCHEDULE ──
export const scheduleInterview = (data) => client.post('/api/schedule', data)
export const getCalendarEvents = () => client.get('/api/schedule/calendar')

// ── INTERVIEWS ──
export const startInterview = (id) => client.post(`/api/interviews/${id}/start`)
export const saveAnswer = (id, data, audioBlob) => {
  const form = new FormData()
  form.append('audio', audioBlob, 'answer.webm')
  form.append('questionId', data.questionId)
  form.append('mode', data.mode)
  form.append('attemptNumber', data.attemptNumber)
  return client.post(`/api/interviews/${id}/answer`, form)
}
export const logProctoringEvent = (id, event) =>
  client.post(`/api/interviews/${id}/proctoring`, event)
export const completeInterview = (id) =>
  client.post(`/api/interviews/${id}/complete`)

// ── REPORTS ──
export const getTeamReports = () => client.get('/api/reports/team')
export const getCandidateReport = (id) => client.get(`/api/reports/candidate/${id}`)
```

---

## Screen-by-screen mock replacement map

### Manager — Team Overview

| Mock source | Replace with |
|---|---|
| `window.V2.JOBS` | `GET /api/team/jobs` (new endpoint needed) |
| `window.V2.ACTIVITY` | `GET /api/team/activity` (new endpoint needed) |
| Stats: "3 open roles", "42 candidates", "2 pending" | Aggregate from DB — query counts |

### Manager — My Team

| Mock source | Replace with |
|---|---|
| `window.V2.TEAM` | `GET /api/team` → `data.members` |
| AssessBadge status | Computed from `last_assessed` date in DB |
| Filter tabs (overdue/never) | Query param: `GET /api/team?filter=overdue` |

### Manager — Member Profile (all 5 tabs)

| Tab | Mock source | Replace with |
|---|---|---|
| Overview — CV | `V2_PROFILES.resumeUrl` | Cloudinary URL from DB `resume_url` |
| Overview — Notes | hardcoded notes | `GET /api/team/member/:id/notes` |
| Analysis — scores | `V2_REPORTS` scores | Latest report from `GET /api/reports/candidate/:id` |
| Transcript | `V2_TRANSCRIPT` | `GET /api/interviews/:id/transcript` |
| Exam | `V2_EXAM` results | `GET /api/interviews/:id/exam-results` |

### Manager — Calendar

| Mock source | Replace with |
|---|---|
| `window.V2.SCHEDULE_EVENTS` | `GET /api/schedule/calendar?week=...` |

### Manager — Reports

| Mock source | Replace with |
|---|---|
| `V2_REPORTS` | `GET /api/reports/team` |

### Schedule Modal

| Action | API call |
|---|---|
| Submit (step 4) | `POST /api/schedule` with full config |
| Template selection | Load from `GET /api/templates` (if templates feature is Phase 1) |

### Candidate — Dashboard

| Mock source | Replace with |
|---|---|
| `CAND_UPCOMING` | `GET /api/candidate/interviews` |
| `CAND_COMPLETED` | Same endpoint, filter by status |
| Stats (avg score etc.) | Computed server-side |

### Candidate — AI Interview

| Action | API call |
|---|---|
| Load questions | `POST /api/interviews/:id/start` → returns questions |
| Save each answer | `POST /api/interviews/:id/answer` with audio blob |
| Log proctoring event | `POST /api/interviews/:id/proctoring` |
| Complete interview | `POST /api/interviews/:id/complete` |

### Interviewer — Dashboard

| Mock source | Replace with |
|---|---|
| Today's interviews | `GET /api/interviewer/schedule?date=today` |
| Pending scorecards | `GET /api/interviewer/scorecards?status=pending` |

### Interviewer — Scorecard

| Mock source | Replace with |
|---|---|
| AI pre-filled scores | `GET /api/interviews/:id/scorecard` → returns ai_draft |
| Submit scorecard | `POST /api/interviews/:id/scorecard` with human_final |

---

## Auth flow (replace v2 role switcher)

```js
// frontend/src/hooks/useAuth.js

import { useState, useEffect } from 'react'
import { login, logout } from '../services/api'

function useAuth() {
  // State
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      // Decode JWT to get user info (don't hit API unnecessarily)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ id: payload.sub, role: payload.role, name: payload.name, companyId: payload.companyId })
      } catch {
        localStorage.removeItem('accessToken')
      }
    }
    setLoading(false)
  }, [])

  async function signIn(email, password) {
    const res = await login(email, password)
    const { accessToken, user: userData } = res.data.data
    localStorage.setItem('accessToken', accessToken)
    setUser(userData)
    return userData
  }

  async function signOut() {
    await logout()
    localStorage.removeItem('accessToken')
    setUser(null)
  }

  return { user, loading, signIn, signOut }
}

export default useAuth
```

---

## Route protection

```jsx
// frontend/src/App.jsx

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuth from './hooks/useAuth'

// Import pages
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/manager/DashboardPage'
// ... etc

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" />

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Manager routes */}
        <Route path="/manager/*" element={
          <ProtectedRoute allowedRoles={['manager']}>
            <Routes>
              <Route path="dashboard" element={<DashboardPage />} />
              {/* ... */}
            </Routes>
          </ProtectedRoute>
        } />

        {/* Candidate routes — magic link, no auth required */}
        <Route path="/i/:token/*" element={<Routes>{/* ... */}</Routes>} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

---

## New API endpoints needed (not in original list)

These are needed by the UI but weren't in the original endpoint list:

```
GET    /api/team/jobs              ← jobs for Team Overview stats
GET    /api/team/activity          ← hiring activity feed
GET    /api/team/member/:id/notes  ← notes for a team member
POST   /api/team/member/:id/notes  ← add a note
GET    /api/interviewer/schedule   ← interviewer's own schedule
GET    /api/interviewer/scorecards ← pending scorecards for interviewer
GET    /api/candidate/interviews   ← candidate's own interview list
GET    /api/templates              ← saved interview templates (if Phase 1)
POST   /api/templates              ← create template
GET    /api/interviews/:id/exam-results  ← exam results for member profile
```
