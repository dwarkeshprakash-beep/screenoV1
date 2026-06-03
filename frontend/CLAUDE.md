# CLAUDE.md — frontend/

> Claude Code reads this when working inside the frontend folder. Read root CLAUDE.md first for full project context.

---

## Frontend stack

- React 19 with JSX (no TypeScript, no `.tsx` files)
- Plain CSS with design tokens from `tokens.css`
- React Router v6 for navigation
- Axios for API calls
- No extra UI libraries — build components from scratch

---

## Folder structure

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── shared/           ← ALWAYS check here first before building anything
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Spinner.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   └── ErrorMessage.jsx
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx       ← sidebar + topbar for manager/interviewer
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TopBar.jsx
│   │   │   └── CandidateLayout.jsx ← minimal layout for interview screens
│   │   ├── manager/               ← components used only by manager
│   │   ├── candidate/             ← components used only by candidate
│   │   ├── interviewer/           ← components used only by interviewer
│   │   └── interview/             ← shared across interview modes
│   │       ├── AIVoiceRoom.jsx
│   │       ├── ExamRunner.jsx
│   │       ├── ProctoringMonitor.jsx
│   │       ├── DeviceCheck.jsx
│   │       └── ConsentScreen.jsx
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.jsx
│   │   ├── manager/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── TeamPage.jsx
│   │   │   ├── MemberProfilePage.jsx
│   │   │   ├── SchedulePage.jsx
│   │   │   └── ReportsPage.jsx
│   │   ├── candidate/
│   │   │   ├── InterviewLandingPage.jsx
│   │   │   ├── DeviceCheckPage.jsx
│   │   │   ├── ConsentPage.jsx
│   │   │   ├── AIInterviewPage.jsx
│   │   │   ├── ExamPage.jsx
│   │   │   └── DonePage.jsx
│   │   └── interviewer/
│   │       ├── InterviewerDashboard.jsx
│   │       ├── LiveRoomPage.jsx
│   │       └── ScorecardPage.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useInterview.js
│   │   └── useProctoring.js
│   ├── services/
│   │   └── api.js                  ← all backend API calls live here
│   ├── utils/
│   │   └── helpers.js
│   ├── styles/
│   │   └── globals.css
│   ├── App.jsx
│   └── index.jsx
├── CLAUDE.md                       ← THIS FILE
├── package.json
└── .env
```

---

## Component writing rules

Every JSX component MUST follow this pattern:

```jsx
// 1. Imports at the very top
import React, { useState, useEffect } from 'react'
import styles from './ComponentName.module.css'  // if using CSS modules

// 2. Component name matches file name exactly
function ComponentName({ prop1, prop2 }) {

  // 3. All state variables declared first
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 4. All derived values / constants
  const isReady = data !== null && !loading

  // 5. All useEffect hooks
  useEffect(() => {
    // fetch data, setup listeners, etc.
  }, [])

  // 6. All handler functions
  function handleClick() {
    // handle events
  }

  // 7. Early returns for special states
  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} />
  if (!data) return <EmptyState message="No data found" />

  // 8. Main render at the bottom — always last
  return (
    <div>
      {/* JSX here */}
    </div>
  )
}

// 9. Export at the very bottom
export default ComponentName
```

---

## Shared component rule

Before writing any new component, ask:
> "Will this component be used by more than one role or page?"

If YES → put it in `src/components/shared/`
If NO → put it in the role-specific folder (`manager/`, `candidate/`, `interviewer/`)

Examples:
- A button? → shared (every role uses buttons)
- A modal? → shared
- A team member table? → manager/ (only manager sees this)
- A device check screen? → interview/ (used by candidate flow)
- A scorecard form? → interviewer/ (only interviewers fill this)

---

## Design tokens usage

Always use CSS variables from `tokens.css`. Never hardcode colors.

```css
/* CORRECT */
color: var(--brand-500);
background: var(--bg-page);
border: 1px solid var(--border-default);

/* WRONG */
color: #5B4FE9;
background: #F8FAFC;
```

---

## API calls

All API calls go through `src/services/api.js`. Never call `fetch` or `axios` directly from a component.

```js
// src/services/api.js — add all API functions here
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,  // Vite: env vars must be prefixed VITE_
  withCredentials: true, // sends HttpOnly cookie for refresh token
})

export const getTeamMembers = () => client.get('/api/team')
export const scheduleInterview = (data) => client.post('/api/interviews', data)
export const saveAnswer = (interviewId, data) => client.post(`/api/interviews/${interviewId}/answer`, data)
```

---

## Interview pages are desktop only

Add this check to the top of every interview-related page:

```jsx
// Check if on mobile — interviews are desktop only
if (window.innerWidth < 768) {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Please use a desktop or laptop</h2>
      <p>Interviews require a larger screen for the best experience.</p>
    </div>
  )
}
```

---

## Routes (React Router v6)

```jsx
// App.jsx — role-based routing
/login                          → LoginPage
/manager/dashboard              → DashboardPage  (requires manager auth)
/manager/team                   → TeamPage
/manager/team/:id               → MemberProfilePage
/manager/schedule               → SchedulePage
/manager/reports                → ReportsPage
/interviewer/dashboard          → InterviewerDashboard
/interviewer/live/:id           → LiveRoomPage
/interviewer/scorecard/:id      → ScorecardPage
/interview/:token               → InterviewLandingPage  (candidate, no auth needed)
/interview/:token/device-check  → DeviceCheckPage
/interview/:token/consent       → ConsentPage
/interview/:token/ai            → AIInterviewPage
/interview/:token/exam          → ExamPage
/interview/:token/done          → DonePage
```
