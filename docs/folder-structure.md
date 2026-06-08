# Folder Structure — Screeno

Actual structure as built (verified against the repo on `dev`). For full per-area detail and the live
route maps, see [`frontend/CLAUDE.md`](../frontend/CLAUDE.md) and [`backend/CLAUDE.md`](../backend/CLAUDE.md)
— this file is a high-level orientation map only, kept short so it doesn't drift again.

---

## Root layout

```
screeno/
├── frontend/                         ← React 19 (JSX) app — Vite, React Router v6
│   ├── CLAUDE.md
│   ├── src/
│   │   ├── components/
│   │   │   ├── shared/               ← CHECK HERE FIRST: Avatar, Badge, Button, Card, EmptyState,
│   │   │   │                            ErrorBoundary, ErrorMessage, Input, Modal, Spinner
│   │   │   ├── layout/               ← AppLayout, Sidebar, TopBar, CandidateLayout
│   │   │   └── manager/              ← AddCandidateModal, CompareModal, EditMemberModal, ScheduleModal
│   │   ├── pages/
│   │   │   ├── auth/                 ← LoginPage
│   │   │   ├── manager/              ← Dashboard, Team, MemberProfile, Schedule, Reports,
│   │   │   │                            Templates, ManagerProfile, ResumeAnalyzer
│   │   │   ├── candidate/            ← InterviewLanding, DeviceCheck, Consent, AIInterview,
│   │   │   │                            Exam, HumanInterview, Done, CandidateDashboard
│   │   │   └── interviewer/          ← InterviewerDashboard, LiveRoom, Scorecard, InterviewerProfile
│   │   │   (plus legacy/unused: screens/, layouts/, v2-*.jsx, ai-room.jsx, hr.jsx, etc. —
│   │   │    not imported by App.jsx; reference only, see frontend/CLAUDE.md)
│   │   ├── hooks/                    ← useAuth, useInterview (state-machine), useProctoring
│   │   ├── services/api.js           ← ALL backend calls (fetch-based client w/ JWT refresh)
│   │   ├── utils/helpers.js
│   │   ├── App.jsx                   ← real role-based router + RequireAuth guard
│   │   └── main.jsx
│   ├── package.json
│   └── .env
│
├── backend/                          ← Node.js 20 + Express 5 API
│   ├── CLAUDE.md
│   ├── src/
│   │   ├── routes/        ← HTTP only: auth, team, interview, interviewer, candidate,
│   │   │                     report, schedule, template, exam, upload, profile
│   │   ├── services/      ← business logic: auth, team, interview, schedule, llm,
│   │   │                     transcription, report-job, pdf, email, storage, judge (Piston code execution)
│   │   ├── repositories/  ← SQL only: user, candidate, interview, question, answer, attempt,
│   │   │                     scorecard, proctoring, notes, interview-note, schedule-record,
│   │   │                     email-delivery, refresh-token, report, report-job
│   │   ├── middleware/    ← auth, role, upload (multer), rate-limit
│   │   └── db/            ← connection.js factory + supabase/sqlserver connection files
│   ├── migrations/        ← paired NNN_name.sql (Postgres) + NNN_name_sqlserver.sql (SSMS),
│   │                          applied via setup-db.js's idempotent ALTER ... IF NOT EXISTS sections
│   ├── server.js          ← mounts routes, security headers, CORS, rate limits, report-job worker
│   ├── package.json
│   └── .env
│
├── .claude/
│   ├── settings.json
│   └── skills/                       ← db-access.md and other action skills (see docs/INDEX.md)
│
├── docs/                             ← see docs/INDEX.md for the full list + what each covers
│   ├── PRD.md, frontend-prompt.md, backend-prompt.md, database-schema.md,
│   │   folder-structure.md (this file), tech-stack.md, discussion.md, AUDIT-BACKLOG.md
│
├── skills/                           ← coding-standards.md, token-saving.md, git-standards.md,
│                                          naming-conventions.md, vibe-coding.md, rules.md
│
├── assets/
├── BRAIN.md                          ← what's built, in progress, and which files are involved (read first)
├── CLAUDE.md                         ← ROOT: Claude Code reads this first
├── .claudeignore
└── tokens.css                        ← design tokens, shared by all frontend styling
```

---

## Rules for adding new files

**New component:**
1. Ask: can this be used by more than one role?
   - YES → `frontend/src/components/shared/`
   - NO → role-specific folder (`manager/`, `candidate/`, `interviewer/`)
   - Interview-flow screens live directly in `pages/candidate/` — there is no `components/interview/` folder

**New API route:**
1. Add route definition to relevant `backend/src/routes/*.routes.js`
2. Add business logic to `backend/src/services/*.service.js`
3. Add SQL query to `backend/src/repositories/*.repository.js`
4. Never mix these three — keep them strictly separated

**New database table or column:**
- Add a paired migration to `backend/migrations/` (`NNN_name.sql` for Postgres with
  `ADD COLUMN IF NOT EXISTS`, `NNN_name_sqlserver.sql` for SSMS with `IF NOT EXISTS (SELECT 1 FROM sys.columns...)`)
- Add a matching idempotent `await run(...)` alignment call in `backend/setup-db.js`, then run
  `node setup-db.js` to apply it to the live Supabase DB
- Update `docs/database-schema.md` to reflect the new shape

**New documentation:**
- Project-wide docs → `docs/`
- Claude Code instructions → `skills/` or `CLAUDE.md` files
