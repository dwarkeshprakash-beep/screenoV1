# CLAUDE.md — frontend/

> Claude Code reads this when working inside the frontend folder. Read root CLAUDE.md first for full project context.

---

## Frontend stack

- React 19 with JSX (no TypeScript, no `.tsx` files)
- Plain CSS with design tokens from `tokens.css`
- React Router v6 for navigation
- `fetch()` for API calls — all requests go through `src/services/api.js` (no axios dependency; a hand-rolled
  client handles JWT bearer headers, HttpOnly refresh cookies, 401 refresh-and-retry, and redirect-to-login)
- `lucide-react` for icons
- LiveKit (`@livekit/components-react`, `@livekit/components-styles`, `livekit-client`) for human-interview video rooms
- `@uiw/react-codemirror` + `@codemirror/lang-javascript` / `@codemirror/lang-python` — code editor for
  LeetCode-style coding questions in `ExamPage.jsx` (the one sanctioned exception to "build from scratch",
  since a syntax-highlighting editor is impractical to hand-roll)
- No other UI libraries beyond the above — build everything else from scratch

---

## Folder structure (actual, as of current `dev` — see `App.jsx` for the live route map)

```
frontend/
├── src/
│   ├── components/
│   │   ├── shared/           ← ALWAYS check here first before building anything
│   │   │   ├── Avatar.jsx, Badge.jsx, Button.jsx, Card.jsx, EmptyState.jsx,
│   │   │   │   ErrorBoundary.jsx, ErrorMessage.jsx, Input.jsx, Modal.jsx, Spinner.jsx
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx       ← sidebar + topbar for manager/interviewer
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TopBar.jsx
│   │   │   └── CandidateLayout.jsx ← minimal layout for candidate/interview screens
│   │   └── manager/                ← AddCandidateModal, CompareModal, EditMemberModal, ScheduleModal
│   ├── pages/
│   │   ├── auth/LoginPage.jsx
│   │   ├── manager/      DashboardPage, TeamPage, MemberProfilePage, SchedulePage, ReportsPage,
│   │   │                 TemplatesPage, ManagerProfilePage, ResumeAnalyzerPage
│   │   ├── candidate/    InterviewLandingPage, DeviceCheckPage, ConsentPage, AIInterviewPage,
│   │   │                 ExamPage, HumanInterviewPage, DonePage, CandidateDashboardPage
│   │   └── interviewer/  InterviewerDashboard, LiveRoomPage, ScorecardPage, InterviewerProfilePage
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useInterview.js   ← AI-interview state machine (phases: loading|ai_speaking|listening|
│   │   │                        recording|processing|paused|ended|error); MediaRecorder + speechSynthesis
│   │   └── useProctoring.js
│   ├── services/
│   │   └── api.js            ← ALL backend calls live here (fetch-based, JWT + refresh handling)
│   ├── utils/helpers.js
│   ├── App.jsx               ← real role-based router (RequireAuth guard + route tree)
│   ├── main.jsx
│   └── index.css / App.css
├── CLAUDE.md                       ← THIS FILE
├── package.json
└── .env
```

**Legacy/unused — do not extend or import:** `src/screens/`, `src/layouts/`, `src/data.jsx`, `src/shared.jsx`,
and loose `src/pages/*.jsx` files (`v2-*.jsx`, `ai-room.jsx`, `candidate-flow.jsx`, `exam-runner.jsx`,
`helpers.jsx`, `hr.jsx`, `interviewer.jsx`). These are earlier-iteration prototypes kept for visual/behavioral
reference only — `App.jsx` does not import any of them. There is no `components/interview/` folder; the
interview UI lives directly in `pages/candidate/` + `hooks/useInterview.js`.

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
- A device check screen? → candidate/ (used by candidate interview flow — there is no `components/interview/`)
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

All API calls go through `src/services/api.js`. Never call `fetch` or `axios` directly from a component
(there is no axios dependency — `api.js` wraps the browser `fetch` API).

The module exposes three layers:
- `request(endpoint, options)` — JSON requests; attaches the bearer token, sends cookies
  (`credentials: 'include'`), and on a 401 transparently calls `/api/auth/refresh`, retries once,
  then redirects to `/login` and clears `localStorage` if that also fails
- `authFetch(endpoint, options)` — same refresh-and-retry/redirect behavior but for raw `fetch`
  calls that need to send `FormData` (multipart uploads) without a `Content-Type` header
- Named exports per resource (`login`, `getTeam`, `saveAnswer`, `uploadResume`, `getInterviewerSchedule`, …)
  — these are what components actually import

```js
// src/services/api.js — add new endpoints as named exports here
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'  // Vite: env vars must be prefixed VITE_

export const getTeam = (filter = 'all') => request(`/api/team?filter=${filter}`)
export const createSchedule = (data) => request('/api/schedule', { method: 'POST', body: JSON.stringify(data) })
export const saveAnswer = (id, formData) => authFetch(`/api/interviews/${id}/answer`, { method: 'POST', body: formData })
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

## Routes (React Router v6 — actual, from `App.jsx`)

```jsx
/login                          → LoginPage                    (public)

// Manager — AppLayout, RequireAuth role="manager"
/manager                        → redirect to dashboard
/manager/dashboard              → DashboardPage
/manager/team                   → TeamPage
/manager/team/:id               → MemberProfilePage
/manager/schedule               → SchedulePage
/manager/reports                → ReportsPage
/manager/templates              → TemplatesPage
/manager/resume-analyzer        → ResumeAnalyzerPage
/manager/profile                → ManagerProfilePage

// Candidate dashboard — CandidateLayout, RequireAuth role="candidate"
/candidate                      → redirect to dashboard
/candidate/dashboard            → CandidateDashboardPage

// Interviewer — AppLayout, RequireAuth role="interviewer"
/interviewer                    → redirect to dashboard
/interviewer/dashboard          → InterviewerDashboard
/interviewer/scorecard          → InterviewerDashboard
/interviewer/scorecard/:id      → ScorecardPage
/interviewer/profile            → InterviewerProfilePage
/interviewer/live/:id           → LiveRoomPage              (full-screen, no sidebar)

// Candidate interview flow — CandidateLayout, no auth (magic-link token validates on landing)
/interview/:token               → InterviewLandingPage
/interview/:token/device-check  → DeviceCheckPage
/interview/:token/consent       → ConsentPage
/interview/:token/ai            → AIInterviewPage
/interview/:token/exam          → ExamPage
/interview/:token/human         → HumanInterviewPage
/interview/:token/done          → DonePage

/                               → redirect to /login
*                               → redirect to /login
```

`RequireAuth` checks `localStorage.accessToken` and (when a `role` prop is given) the cached
`localStorage.user.role`, redirecting to `/login` on any mismatch or parse failure.
