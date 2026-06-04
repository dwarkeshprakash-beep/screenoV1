# Screeno — Project Brain
Last updated: 2026-06-03

## What is built (update this as features are completed)
- [x] All MD docs, CLAUDE.md, skills files
- [x] Supabase DB schema ready (run screeno_supabase.sql)
- [x] 141 employees CSV ready for seeding
- [x] Backend Express scaffold
- [x] Frontend React scaffold
- [x] Auth (login + magic link)
- [x] Everything else

### Infrastructure
- [x] Supabase DB — schema live, 11 tables, 141 employees seeded
- [x] SQL Server DB — identical schema + data, ready to activate via DB_TYPE=sqlserver
- [x] All MD files / CLAUDE.md / skills files set up
- [x] Express backend scaffold — server.js, DB layer, middleware, route stubs
- [x] React frontend scaffold — App.jsx router, shared components, layout, page stubs

### Auth
- [x] Login (email + password → JWT)
- [x] Magic link (candidate interview access)
- [x] JWT refresh token

### Manager
- [x] Team page (list, filter, bulk select)
- [x] Member profile (5 tabs — Overview with resume upload, Analysis, Transcript, Exam, Notes)
- [x] Schedule modal (4 steps)
- [x] Calendar view
- [x] Reports page
- [x] Templates page
- [x] Manager profile page (/manager/profile — view/edit name + password)
- [x] CSV import (POST /api/team/import — send CSV text body)
- [x] Member notes API (GET/POST /api/team/member/:id/notes)
- [x] Resume upload (Cloudinary, POST /api/upload/resume)

### Candidate
- [x] Device check
- [x] Consent screen
- [x] AI interview (simple mode)
- [x] AI interview (adaptive mode)
- [x] Exam runner (MCQ + open questions, timer, navigation, auto-submit)
- [x] Completion + tips
- [x] Candidate dashboard
- [x] Self-schedule slots (GET /api/schedule/slots/:token — public)

### Interviewer
- [x] Dashboard
- [x] Live room (LiveKit — real token generation + VideoConference component)
- [x] Scorecard form

## Active feature (what is being built RIGHT NOW)
Feature: Phase 2 in progress.

**Phase 2 tasks:**
1. [x] AI question generation — real LLM call (Groq → Gemini fallback) for AI voice interviews
2. [x] Email test — send a real magic link email via Resend
3. [x] Report PDF generation — generate PDF report and upload to Cloudinary
4. [x] Frontend integration test — PASSED (2026-06-04, Playwright + Chromium, 16/16 checks)

**Frontend test findings (2026-06-04):**
- Login → dashboard → team CRUD → schedule modal → candidate landing → device check — all pass
- `InterviewLandingPage.jsx:39` overwrites `localStorage.accessToken` with candidate session token.
  Not a production bug (different browsers per role) but breaks same-browser multi-role testing.
- Profile endpoint (`GET /api/profile`) works correctly with a fresh manager JWT.

## Test credentials (Supabase)
- Manager login: `manager@psspl.com` / `Test@1234`
- Company: PSSPL (id=1)
- DB aligned via `backend/setup-db.js` (safe to re-run)

## Key decisions made
- DB: Supabase (PostgreSQL) active, SQL Server ready (DB_TYPE=sqlserver to switch)
- Audio: never stored, transcribe on backend, discard
- STT: local Whisper.js (internal) or Groq API (external) — manager picks at scheduling
- TTS: browser.speechSynthesis — cross-browser, free
- No FK constraints — validated in backend code
- RETURNING * → automatically translated to OUTPUT INSERTED.* in sqlserver.connection.js

## SQL Server side-by-side strategy
All repositories write SQL once using @param style. The connection layer handles:
- Supabase: converts @name → $1, $2 positional params
- SQL Server: @name used natively by mssql; RETURNING * translated to OUTPUT INSERTED.*

Switch DBs instantly: change `DB_TYPE=sqlserver` in `.env` — no code changes needed.
Migration files exist in pairs: `NNN_name.sql` (Supabase) and `NNN_name_sqlserver.sql` (SSMS).

## File map (update as files are created)

### Backend
backend/server.js                             ← Express entry point, all routes mounted
backend/src/db/connection.js                  ← DB factory (DB_TYPE env var switches)
backend/src/db/supabase.connection.js         ← PostgreSQL driver (current)
backend/src/db/sqlserver.connection.js        ← SQL Server driver (DB_TYPE=sqlserver)
backend/src/middleware/auth.js                ← JWT validation
backend/src/middleware/role.js                ← requireRole('manager') etc.
backend/src/middleware/upload.js              ← Multer for file uploads (memory storage)
backend/src/repositories/user.repository.js
backend/src/repositories/refresh-token.repository.js
backend/src/repositories/candidate.repository.js
backend/src/repositories/notes.repository.js  ← candidate notes CRUD
backend/src/repositories/interview.repository.js
backend/src/repositories/attempt.repository.js
backend/src/repositories/question.repository.js
backend/src/repositories/answer.repository.js
backend/src/repositories/report.repository.js
backend/src/services/auth.service.js
backend/src/services/team.service.js           ← includes importFromCSV, getNotes, addNote
backend/src/services/llm.service.js            ← Groq + Gemini fallback
backend/src/services/transcription.service.js
backend/src/services/email.service.js          ← Resend REST API
backend/src/services/schedule.service.js       ← includes getAvailableSlots
backend/src/services/interview.service.js
backend/src/services/storage.service.js        ← Cloudinary upload/delete
backend/src/routes/auth.routes.js
backend/src/routes/team.routes.js              ← includes notes + import endpoints
backend/src/routes/interview.routes.js
backend/src/routes/exam.routes.js              ← GET /api/exam/:token, POST submit
backend/src/routes/report.routes.js
backend/src/routes/schedule.routes.js          ← includes public slots endpoint
backend/src/routes/candidate.routes.js
backend/src/routes/interviewer.routes.js       ← includes LiveKit token endpoint
backend/src/routes/template.routes.js
backend/src/routes/upload.routes.js            ← POST /api/upload/resume
backend/src/routes/profile.routes.js           ← GET/PATCH /api/profile

### Frontend
frontend/src/App.jsx                          ← All routes wired (26 routes)
frontend/src/services/api.js                  ← Full API client (all endpoints)
frontend/src/hooks/useAuth.js
frontend/src/hooks/useInterview.js            ← Interview state machine
frontend/src/hooks/useProctoring.js           ← Tab switch detection
frontend/src/utils/helpers.js
frontend/src/components/shared/              → Button, Card, Modal, Input, Badge, Avatar, Spinner, EmptyState, ErrorMessage
frontend/src/components/layout/             → AppLayout, Sidebar (with Profile link), TopBar, CandidateLayout
frontend/src/components/manager/            → ScheduleModal, AddCandidateModal, EditMemberModal
frontend/src/pages/auth/LoginPage.jsx
frontend/src/pages/manager/DashboardPage.jsx
frontend/src/pages/manager/TeamPage.jsx
frontend/src/pages/manager/MemberProfilePage.jsx  ← resume upload (tab 0) + notes (tab 4) wired
frontend/src/pages/manager/SchedulePage.jsx
frontend/src/pages/manager/ReportsPage.jsx
frontend/src/pages/manager/TemplatesPage.jsx
frontend/src/pages/manager/ManagerProfilePage.jsx ← new: /manager/profile
frontend/src/pages/candidate/InterviewLandingPage.jsx
frontend/src/pages/candidate/DeviceCheckPage.jsx
frontend/src/pages/candidate/ConsentPage.jsx
frontend/src/pages/candidate/AIInterviewPage.jsx
frontend/src/pages/candidate/ExamPage.jsx         ← full rewrite: MCQ + timer + nav
frontend/src/pages/candidate/DonePage.jsx
frontend/src/pages/candidate/CandidateDashboardPage.jsx
frontend/src/pages/interviewer/InterviewerDashboard.jsx
frontend/src/pages/interviewer/LiveRoomPage.jsx   ← real LiveKit VideoConference
frontend/src/pages/interviewer/ScorecardPage.jsx

### Migrations
backend/migrations/002_notes_csv.sql              ← Supabase: candidate_notes table
backend/migrations/002_notes_csv_sqlserver.sql    ← SSMS: same
backend/migrations/003_exam_questions.sql         ← Supabase: add MCQ columns to questions
backend/migrations/003_exam_questions_sqlserver.sql ← SSMS: same

## What needs to happen before running
1. Supabase: run the base schema (docs/database-schema.md), then 002 and 003 migrations
2. SQL Server: run the SSMS versions of 002 and 003
3. backend/.env: set LIVEKIT_URL (real URL from app.livekit.io)
4. Test auth flow end-to-end

## Handoff prompts (latest at top)

### 2026-06-04 — Phase 2 Task 3 complete: PDF report generation + Cloudinary upload

**New files:**
- `backend/src/services/pdf.service.js` — builds A4 PDF from report data using pdfkit (scores, bar charts, summary, strengths, tips, JD excerpt, footer)
- `backend/migrations/004_report_pdf_url.sql` — Supabase: `ALTER TABLE reports ADD COLUMN IF NOT EXISTS pdf_url TEXT`
- `backend/migrations/004_report_pdf_url_sqlserver.sql` — SSMS equivalent

**Changed files:**
- `backend/src/services/storage.service.js` — added `uploadReport(buffer, reportId)` to `screeno/reports` folder
- `backend/src/repositories/report.repository.js` — added `updatePdfUrl(id, pdfUrl)`
- `backend/src/services/interview.service.js` — after `reportRepository.create()`, chains `pdfService.generateReportPdf → storageService.uploadReport → reportRepository.updatePdfUrl` (all fire-and-forget, non-blocking)
- `backend/package.json` — added `pdfkit` dependency

**DB note:** `reports.pdf_url` column is already handled by `setup-db.js` (line 116). Run `node backend/setup-db.js` if the column doesn't exist yet.

**Phase 2 status:** All 4 tasks complete — AI questions ✅, email ✅, PDF ✅, frontend test ✅

### 2026-06-04 — Phase 2 Task 2 complete: magic link email via Resend

**Bugs fixed:**
- `interview.repository.js:getById` — added `LEFT JOIN users u ON u.id = i.manager_id` so `interview.manager_email` is now populated. `generateReport` in `interview.service.js` uses this to notify the manager when a report is ready.
- `.env` — removed leading space from `RESEND_API_KEY` (same class of bug as GROQ/GEMINI keys).
- `email.service.js` — added `.trim()` on `RESEND_API_KEY` read (defensive); replaced hardcoded `FROM = 'Screeno <noreply@screeno.app>'` with `process.env.RESEND_FROM || 'onboarding@resend.dev'`.

**Email flow (now functional end-to-end):**
`POST /api/schedule` → `scheduleService.createSchedule` → `emailService.sendMagicLink(candidate.email, …)` → Resend REST API → candidate inbox.

**Resend domain note:**  
`RESEND_FROM=onboarding@resend.dev` (set in `.env`) works without domain verification but Resend restricts delivery to the account owner's email in this mode. For full delivery to any candidate email, verify a domain in the Resend dashboard and change `RESEND_FROM` to `Screeno <noreply@yourdomain.com>`.

**Next:** Phase 2 Task 3 — Report PDF generation (generate PDF and upload to Cloudinary).

### 2026-06-04 — Phase 2 Task 1 complete: AI question generation wired
`interview.service.js` was already calling `llmService.generateQuestions` — the wiring was in place.
Two bugs blocking real API calls were fixed:

**Bugs fixed:**
- `.env` — `GROQ_API_KEY` and `GEMINI_API_KEY` had leading spaces (`= gsk_...`). dotenv preserves whitespace, so `Bearer  gsk_...` (double space) caused 401s on every call. Removed the spaces.
- `llm.service.js` — added `.trim()` to both env var reads (`GROQ_API_KEY`, `GEMINI_API_KEY`) as a defensive guard.
- `setup-db.js` — added `candidates.resume_text TEXT` migration (column is in the official schema docs but was missing from the `ALTER TABLE` alignment block).

**Full question generation flow (now functional):**
`POST /api/interviews/:id/start` → `interview.routes.js` → `interviewService.startInterview` → `llmService.generateQuestions` (Groq Llama 3.3 70B → Gemini 2.0 Flash fallback) → `questionRepository.createMany` → returns `{ interviewId, attemptId, questions, firstQuestion, mode, transcriptionMode }`

**Next:** Phase 2 Task 2 — send real magic link email via Resend. Note: `interview.service.js:generateReport` uses `interview.manager_email` which is undefined — `getById` doesn't join the users table. Fix `interview.repository.js:getById` to include manager email before the email phase.

### 2026-06-03 — End-to-end testing complete
All backend APIs tested and passing (22 endpoints). Three bugs found and fixed:

**Bugs fixed:**
- `candidate.repository.js` — `CASE WHEN @resume_url IS NOT NULL` needed `::text` cast (PostgreSQL type inference error)
- `candidate.repository.js` — `create()` now uses `ON CONFLICT DO UPDATE SET deleted=NULL` to reactivate soft-deleted records
- `interview.repository.js` — INSERT now includes `scheduled_by` (NOT NULL column from HRMS schema)
- `interview.repository.js` — added `getByCandidate(candidateId)` function
- `candidate.routes.js` — fixed `GET /api/candidate/interviews` placeholder that used `getByCompany(0)`

**DB alignment done (run `node backend/setup-db.js` — idempotent):**
- Created: `companies`, `templates`, `candidate_notes` tables
- Added columns: `users.company_id`, `users.deleted`, `refresh_tokens.revoked`, all missing interview/candidate/report columns
- Seeded: PSSPL company (id=1), test manager user (see credentials above)
- Made `users.emp_number` nullable (so Screeno users without emp numbers can be inserted)

**Next:** Phase 2 — AI question generation, email send, report PDF, frontend UI test.

### 2026-06-03 — Phase 1 feature gaps filled
All missing Phase 1 features implemented. Build passes (948KB, includes LiveKit).

**New backend files:**
- notes.repository.js, storage.service.js, exam.routes.js, upload.routes.js, profile.routes.js
- team.service.js extended: getNotes, addNote, importFromCSV
- schedule.service.js extended: getAvailableSlots
- interviewer.routes.js extended: POST /api/interviewer/livekit-token
- schedule.routes.js extended: GET /api/schedule/slots/:token (public)
- sqlserver.connection.js: activated mssql, auto-translates RETURNING * → OUTPUT INSERTED.*

**New frontend files:**
- ManagerProfilePage.jsx (/manager/profile)
- ExamPage.jsx (full rewrite — MCQ + timer)

**Updated frontend files:**
- MemberProfilePage.jsx — resume upload (tab 0), real notes (tab 4)
- LiveRoomPage.jsx — real LiveKit VideoConference
- Sidebar.jsx — Profile link added
- App.jsx — manager/profile route added
- api.js — getExam, submitExam, getLiveKitToken, getAvailableSlots, uploadResume, getManagerProfile, updateManagerProfile

**New migrations:**
- 002_notes_csv.sql + 002_notes_csv_sqlserver.sql
- 003_exam_questions.sql + 003_exam_questions_sqlserver.sql

**Next:** Test auth → team CRUD → candidate interview → exam end-to-end.
Then Phase 2: real AI question generation, email sending test, report PDF generation.

## Commands

End of session — paste this to get the next handoff prompt:
> Generate a handoff prompt for my next chat. Under 200 words.
> Cover what was built, files changed, and what to build next.
> Only include what the next session needs.
