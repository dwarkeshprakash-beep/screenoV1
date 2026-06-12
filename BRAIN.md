# Screeno — Second Brain
Last updated: 2026-06-12

> Context for AI tools and developers. Tech stack + file maps are in the CLAUDE.md files
> (root, frontend/, backend/). This file covers: what the app does, who can do what,
> non-obvious relationships, critical flows, and current gaps.

---

## What Is Screeno

Internal AI interview platform for one company. Managers pre-screen team members before
client interviews. Three interview types run from a browser: AI voice interview, coding exam,
live human video call. No installs, no mobile (desktop only), no multi-tenant, no SSO.

Core flow: Manager schedules → candidate gets magic link email → takes interview →
AI generates report → manager reads and decides.

---

## Roles and What They Can Do

### Manager (JWT role='manager')
- Roster: view team members with assessment status and availability (bench / client_side)
- Schedule AI voice, coding exam, or human interview for any team member
- Calendar: all scheduled and completed interviews
- Member profile: resume, all past interview sessions, AI report history, transcripts, notes
- Reports page: all completed reports with scorecard decisions and scores
- CSV import: upsert team members into users table (match by email then emp_number)
- Resume analyzer: LLM match against a JD
- Templates: UI stub exists, backend not built — "Coming Soon" overlay is intentional

### Candidate (no account — magic link only)
- Receives one-time link in email (no login, no password needed for interview flow)
- Flow: device check → consent → AI interview or exam or human video → done page
- AI voice: hears questions via browser TTS, records answers via MediaRecorder
- Exam: MCQ + open-ended + LeetCode-style coding (CodeMirror editor, Piston judge)
- Done page shows improvement tips only — never sees scores or pass/fail result
- Also has a logged-in dashboard (password login, rare flow for internal candidates)

### Interviewer (JWT role='interviewer')
- Dashboard: assigned interviews for today and upcoming
- Pre-call: view candidate profile, resume, and past notes
- Live room: LiveKit video call, notes panel, AI question guide, rejoin flow on disconnect
- Post-call: fill scorecard (AI pre-fills from transcript, human reviews and submits)

---

## Non-Obvious Data Relationships

### team_members vs candidates — different ID namespaces
`team_members` = roster. Created when manager adds a person. Owns profile/resume/availability.
`candidates` = interview identity. Created lazily on first scheduling. Owns interview history.
They link via `user_id`. One person can have both a `team_members.id` AND a `candidates.id`
— these are **different numbers and are not interchangeable**.

Rule: all manager navigation uses `team_members.id`.
Route `/manager/team/:id` expects `team_members.id` — passing `candidates.id` causes "Could not load profile".
This bit us on 2026-06-09; now fixed in ReportsPage and SchedulePage.

### Report scores
Scores come from the backend as 1–10 integers. Frontend displays them as-is — never divide,
normalize, or convert to percentages. Score fields live on `scorecards`, not `reports`.
Any query displaying scores needs `LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id`.

---

## Critical Cross-Cutting Flows

### Auth — two completely separate paths
- Manager/Interviewer: `Authorization: Bearer <jwt>` → `auth.middleware.js` → `req.user`
- Candidate: `?token=xxx` query param → `magicLink.middleware.js` → `req.candidate` (not `req.user`)
Candidate routes never use auth.middleware. Mixing them breaks the flow entirely.

### AI Interview Loop
```
loading → ai_speaking → listening → recording → processing → ai_speaking (next question)
                                                            ↘ ended / error / paused
```
Managed by `hooks/useInterview.js`. AI speaks via `window.speechSynthesis`. Audio goes:
`MediaRecorder → backend → Groq Whisper → text saved to answers table → audio discarded`.
Adaptive mode: LLM generates the next question from all previous answers (Groq → Gemini fallback).

### Report Pipeline
1. Interview completes → `report_jobs` row inserted (status: pending)
2. `reportJobService` worker polls → calls `llm.service.js generateReport`
3. Results saved to `reports` + `scorecards` → status: ready → email sent
4. Email currently routes to STATIC_RECIPIENTS (3 internal addresses) — intentional test-phase setting
5. Manager sees results via `GET /api/reports` — query needs scorecard LEFT JOIN for decision/scores

---

## Feature Impact Map

When a feature request comes in, these are all the places that change:

| Change | Layers affected |
|---|---|
| New DB column | migration SQL + repository query + service (if logic changes) |
| New API endpoint | repository → service → route → `api.js` named export → page component |
| New manager page | `pages/manager/` + `App.jsx` route + `Sidebar.jsx` nav link + `api.js` |
| New candidate step | `pages/candidate/` + `App.jsx` under magic-link guard (not RequireAuth) |
| Report content/scoring change | `llm.service.js` prompt + `reports` table + `report.repository.js` + `MemberProfilePage` |
| Scorecard field change | `scorecards` table + migration + `interviewer.routes.js` + `ScorecardPage.jsx` + **both** `getReportsByManager` and `getHistoryByUser` in `report.repository.js` |
| Schedule flow change | `ScheduleModal.jsx` + `schedule.service.js` + `schedule.routes.js` + `scheduleRecord.repository.js` |
| Exam question format | `llm.service.js generateExamQuestions` + `questions` table + `ExamPage.jsx` |
| Auth/token change | `auth.service.js` + `auth.middleware.js` + `api.js` refresh logic + `useAuth.js` |
| Email content change | `email.service.js` — all templates are inline functions in this one file |

---

## Current Gaps (user-visible issues right now)

**Fixed this session (2026-06-12):**
- ✅ `ReportsPage` + `MemberProfilePage` scores — `sc.overall_score` → `sc.overall AS overall_score` in report.repository.js
- ✅ Schedule creation — `voiceMode` → `interviewMode` in ScheduleModal payload
- ✅ Monthly assessment creation — field normalization added to route (subject→subject_name, jd_text→ai_generated_jd)
- ✅ `ClientInterviewsPage` — now wired to real API, no more MOCK_TEMPLATES
- ✅ `getCalendarEvents` — was passing `companyId` instead of `managerId` to service
- ✅ `send-jd` cross-company email — ownership check via team membership added
- ✅ `profile.routes.js` raw SQL — moved to `userRepository.getByIdWithPassword`

**Still open:**
- `shared/Avatar.jsx` has 5 remaining local copies across TeamPage, MemberProfilePage, ManagerProfilePage, InterviewerDashboard, CandidateDashboardPage
- `MonthlyAssessmentPage.jsx` step 4: no guard against zero-selected-candidates submission
- `ScheduleModal.jsx` step 3/4: candidate validation fires too late (Step 4 not Step 3)
- `ScheduleModal.jsx` useEffect uses `.then().catch()` — should be `async/await`
- `team_member_ids` in monthly assessment enrollment not ownership-checked against manager
- `getEmailDeliveries` + `resendMagicLink` in schedule.service.js: `companyId` param unused (interview ownership not verified)
- No SIGTERM handler — report job worker hard-killed on restart, jobs stay stuck in `started` state
- `/health` endpoint has no DB liveness check

Full prioritized issue list: `docs/open-issues.md`

---

## Intentional Deferrals

| Item | Why deferred |
|---|---|
| Magic-link tokens stored raw | Hash before external/real-candidate use |
| Email to STATIC_RECIPIENTS | Test phase — rewire before production |
| Templates page stub | Phase 2 |
| Device check permissive | Will tighten before production |
| Consent copy unchanged | Pending legal review (C-07) |
| Bundle splitting | Future — route-level lazy loading + remove prototype files |
| HR role, Super Admin, mobile, dark mode, ATS | Phase 2 |
| Piston judge has no SLA | Submissions stored as "not_evaluated" if down, graded narratively |
