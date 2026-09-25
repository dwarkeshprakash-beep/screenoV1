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
- Human interviews use Google Meet or manager-provided meeting links; LiveKit is not part of the active V2 runtime
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
│   │   │   ├── Avatar, Badge, Button, ConfirmDialog, DataTable, EmptyState, ErrorBoundary,
│   │   │   │   ErrorMessage, FileUploadButton, FormActions, FormError, Input, Modal, MultiSelect,
│   │   │   │   Notice, Pagination, RowActions, Select, Spinner, ChangePasswordForm,
│   │   │   │   InterviewerAssignmentsPanel (.jsx)
│   │   │   └── tableStyles.js      ← shared table style objects for DataTable-based lists
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx       ← sidebar + topbar for /workspace and /admin
│   │   │   ├── Sidebar.jsx, TopBar.jsx
│   │   │   ├── RequireModule.jsx   ← route guard: redirects when the user lacks a module
│   │   │   └── CandidateLayout.jsx ← minimal layout for magic-link interview screens
│   │   ├── manager/                ← AddTeamMemberModal, CompareModal, DeleteMandateModal,
│   │   │   │                          EditMemberModal, InterviewFlowModal, InterviewHistoryPanel,
│   │   │   │                          MonthlyAssessmentAssignModal, MonthlyReports,
│   │   │   │                          ReportRecipientsSelector, RescheduleModal, ScheduleModal
│   │   │   ├── client-mandates/    ← everything behind ClientInterviewsPage: MandateDetail,
│   │   │   │                          MandateListView, CreateMandateModal, EditMandateModal,
│   │   │   │                          RequirementModal, RequirementProfilesEditor, AddProspectsModal,
│   │   │   │                          CandidateActionModal, SendJDModal, ScheduleClientTeamModal,
│   │   │   │                          OutcomeRoundsModal, MandateReportDetailModal,
│   │   │   │                          MandateListPagination, Field, mandateHelpers.js
│   │   │   └── monthly-assessments/ ← WizardModal, SubjectDetailModal, monthlyHelpers.js
│   │   ├── admin/                  ← admin tables, form modals and repair-tool pieces
│   │   │                              (AdminStatCard, BrokenStateIssue, MandatesAdminTable, ...)
│   │   └── candidate/              ← CodeAnswerEditor, MandateJdDetails, MandateResumeAction
│   ├── pages/
│   │   ├── auth/LoginPage.jsx
│   │   ├── manager/      DashboardPage, TeamPage, MemberProfilePage, SchedulePage, ReportsPage,
│   │   │                 ClientInterviewsPage, MonthlyAssessmentPage, ResumeAnalyzerPage
│   │   ├── workspace/    InterviewsPage, FeedbackPage, ClientOutcomesPage, ProfilePage
│   │   │                 (a user's own interviews/feedback/outcomes/profile)
│   │   ├── candidate/    InterviewLandingPage, DeviceCheckPage, ConsentPage, AIInterviewPage,
│   │   │                 ExamPage, DonePage   (magic-link interview flow)
│   │   └── admin/        AdminDashboardPage, AdminMandatesPage, AdminInterviewsPage,
│   │                     AdminBrokenStatesPage, AdminOrganizationsPage, AdminRolesPage,
│   │                     AdminUsersPage, AdminModulesPage, AdminAclsPage, AdminPermissionsPage
│   │                     + a *DetailPage for organizations, roles, users, ACLs, permissions
│   ├── context/
│   │   ├── AccessContext.jsx ← provider: loads GET /api/auth/me/access once per session
│   │   └── access-context.js ← the React context object
│   ├── hooks/
│   │   ├── useAccess.js      ← hasModule(moduleKey, permission) and the loaded access context
│   │   ├── useInterview.js   ← AI-interview state machine (phases: loading|ai_speaking|listening|
│   │   │                        recording|processing|paused|ended|error); MediaRecorder + speechSynthesis
│   │   └── useProctoring.js
│   ├── services/
│   │   └── api.js            ← ALL backend calls live here (fetch-based, JWT + refresh handling)
│   ├── utils/helpers.js, utils/password-policy.js
│   ├── config/app.config.js  ← APP_NAME and other build-time settings
│   ├── App.jsx               ← router (RequireAuth / RequireModule guards + route tree)
│   ├── main.jsx
│   └── index.css / App.css
├── CLAUDE.md                       ← THIS FILE
├── package.json
└── .env
```

Legacy prototype screens, old layouts, and loose v2 page dumps have been removed. There is no
`components/interview/` folder; the interview UI lives directly in `pages/candidate/` + `hooks/useInterview.js`.

When a page grows past a few hundred lines, move its modals and sections into a folder under
`components/<area>/<feature>/` (as `client-mandates/` and `monthly-assessments/` do) and keep the
page file for data loading and layout.

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
If NO → put it in the role-specific folder (`manager/`, `candidate/`, `admin/`)

Examples:
- A button? → shared (every role uses buttons)
- A modal? → shared
- A team member table? → manager/ (only manager sees this)
- A device check screen? → candidate/ (used by candidate interview flow — there is no `components/interview/`)
- An admin repair table? → admin/ (only admin users see this)

---

## Design tokens — hex is banned

Never hardcode color hex values. Every color in the codebase must use a `tokens.css` variable.
This is widely violated — when touching any file, replace hardcoded hex as you go.

```css
/* CORRECT */                           /* WRONG */
color: var(--brand-500);                color: #5B4FE9;
background: var(--bg-page);             background: #F8FAFC;
border: 1px solid var(--border-default); border: 1px solid #E2E8F0;
```

**Quick hex → token reference:**

| Hex | Token |
|---|---|
| `#0F172A` | `var(--fg-primary)` |
| `#374151` | `var(--fg-body)` |
| `#6B7280` / `#64748B` | `var(--fg-muted)` |
| `#94A3B8` | `var(--fg-subtle)` |
| `#5B4FE9` | `var(--brand-500)` |
| `#4A3FCE` | `var(--brand-600)` |
| `#3A31A3` | `var(--brand-700)` |
| `#EFEDFD` | `var(--brand-50)` |
| `#FFFFFF` / `#FFF` | `var(--bg-surface)` |
| `#F8FAFC` | `var(--bg-page)` |
| `#F1F5F9` | `var(--bg-surface-alt)` |
| `#E2E8F0` | `var(--border-default)` |
| `#CBD5E1` | `var(--border-strong)` |
| `#059669` | `var(--success-500)` |
| `#047857` | `var(--success-600)` |
| `#ECFDF5` | `var(--success-50)` |
| `#D97706` | `var(--warning-500)` |
| `#B45309` | `var(--warning-600)` |
| `#FFFBEB` | `var(--warning-50)` |
| `#EF4444` / `#DC2626` | `var(--danger-500)` |
| `#B53618` | `var(--danger-700)` |
| `#FEF2F2` | `var(--danger-50)` |

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
- Named exports per resource (`login`, `getTeam`, `saveAnswer`, `uploadResume`, `getCandidateClientMandates`, ...)
  — these are what components actually import

The app's display name (shown in the topbar, login screen, browser tab, and interview copy) comes from
`src/config/app.config.js`, which reads `VITE_APP_NAME` from `.env` (default `'Screeno'` if unset). Rebrand
the whole frontend by changing that one env var; never hardcode the name in a component.

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

There are only two signed-in shells: `/workspace` for every regular user and `/admin` for platform
admins. What a workspace user sees is decided by their modules (RBAC), not by a role: each route is
wrapped in `RequireModule moduleKey="..."`, which sends users without that module to their profile.

```jsx
/login                          → LoginPage                    (public)

// Workspace - AppLayout role="workspace", RequireAuth (any signed-in non-admin)
/workspace                      → redirect to dashboard
/workspace/dashboard            → DashboardPage
/workspace/team                 → TeamPage                     module: team
/workspace/team/:id             → MemberProfilePage            module: team
/workspace/organization/:userId → MemberProfilePage            module: team
/workspace/monthly              → MonthlyAssessmentPage        module: monthly_assessments
/workspace/monthly/plan         → redirect to /workspace/monthly
/workspace/clients              → ClientInterviewsPage         module: client_mandates
/workspace/clients/:mandateId   → ClientInterviewsPage (detail) module: client_mandates
/workspace/schedule             → SchedulePage                 module: schedule
/workspace/reports              → ReportsPage                  module: reports
/workspace/interviews           → InterviewsPage               module: interviews
/workspace/feedback             → FeedbackPage                 module: feedback
/workspace/outcomes             → ClientOutcomesPage           module: outcomes
/workspace/resume-analyzer      → ResumeAnalyzerPage           module: resume_analyzer
/workspace/interview-complete   → DonePage (inside the shell)
/workspace/profile              → ProfilePage

// Admin - AppLayout role="admin", RequireAuth adminOnly
/admin                          → redirect to dashboard
/admin/dashboard                → AdminDashboardPage
/admin/mandates                 → AdminMandatesPage
/admin/interviews               → AdminInterviewsPage
/admin/broken-states            → AdminBrokenStatesPage
/admin/organizations[/:id]      → AdminOrganizationsPage / OrganizationDetailPage
/admin/roles[/:id]              → AdminRolesPage / RoleDetailPage
/admin/users[/:id]              → AdminUsersPage / UserDetailPage
/admin/modules                  → AdminModulesPage
/admin/acls[/:id]               → AdminAclsPage / AclDetailPage
/admin/permissions[/:id]        → AdminPermissionsPage / PermissionDetailPage
/admin/profile                  → ProfilePage

// Candidate interview flow — CandidateLayout, no auth (magic-link token validates on landing)
/interview/:token               → InterviewLandingPage
/interview/:token/device-check  → DeviceCheckPage
/interview/:token/consent       → ConsentPage
/interview/:token/ai            → AIInterviewPage
/interview/:token/exam          → ExamPage
/interview/:token/done          → DonePage (a signed-in user is sent to /workspace/interview-complete)

/  and  *                       → HomeRedirect (admin → /admin/dashboard, user → /workspace/dashboard, else /login)
```

`RequireAuth` checks `localStorage.accessToken` and the cached `localStorage.user.role`
(`'admin'` or `'user'` only), sending signed-out users to `/login` (remembering the deep link) and
the wrong shell to its own home.
