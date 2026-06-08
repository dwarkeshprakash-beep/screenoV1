# Screeno - Project Brain
Last updated: 2026-06-08

## What Is Built

### Infrastructure
- [x] Supabase DB schema alignment script and security workflow migration.
- [x] Express backend with layered routes, services, repositories, and DB factory.
- [x] React/Vite frontend with manager, candidate, and interviewer role areas.
- [x] JWT access token plus HttpOnly refresh cookie.
- [x] Backend report job queue, retries, scorecards, interview notes, schedule records, and email delivery records.

### Auth
- [x] Login with role-scoped JWT claims.
- [x] Candidate magic-link access.
- [x] Guarded refresh-and-retry frontend flow.
- [ ] Magic-link tokens are still stored raw. Deferred intentionally.

### Manager
- [x] Team page with freshness based on completed attempts or ready reports.
- [x] Schedule modal for AI voice, exam, and human interview appointment fields.
- [x] Reports page based on completed attempts, reports, and scorecard decisions.
- [x] Static internal email redirect for current test phase.
- [x] Invite delivery status records and resend API.
- [ ] Role/opening tracking is not modeled; openings panel is removed.

### Candidate
- [x] Device check, consent, AI interview, exam, human interview join, and done page.
- [x] AI interview finalization can complete or abandon attempts.
- [x] Manual answer fallback for failed transcription.
- [x] LeetCode-style coding questions in exams — CodeMirror editor, visible/hidden test cases,
      Piston-judged pass/fail fed into the same LLM report-scoring pipeline as MCQ/open answers.
- [x] One resume per candidate — re-upload overwrites the same Cloudinary asset (stable `public_id`).
- [ ] Device check is intentionally permissive for now.
- [ ] Consent copy is intentionally unchanged for now.

### Interviewer
- [x] Dashboard and assigned human interview schedule.
- [x] Live room route with notes/guide persistence and server completion.
- [x] Scorecard assignment checks with decision, reason, evidence, author, and timestamps.
- [x] LiveKit human-interview rooms now ship `@livekit/components-styles` and handle
      `onDisconnected` with a rejoin flow (candidate + interviewer sides).
- [ ] Requested schedule date filtering remains deferred.

## Active Feature
Feature: Audit hardening milestone
Status: Implemented and ready for verification
Files involved:
- `backend/src/repositories/candidate.repository.js`
- `backend/src/repositories/report.repository.js`
- `backend/src/repositories/schedule-record.repository.js`
- `backend/src/repositories/email-delivery.repository.js`
- `backend/src/services/schedule.service.js`
- `backend/src/services/interview.service.js`
- `backend/src/services/email.service.js`
- `backend/src/services/llm.service.js`
- `backend/src/middleware/rate-limit.js`
- `backend/server.js`
- `frontend/src/services/api.js`
- `frontend/src/pages/manager/ReportsPage.jsx`
- `frontend/src/pages/manager/DashboardPage.jsx`
- `frontend/src/pages/manager/TeamPage.jsx`
- `frontend/src/components/layout/TopBar.jsx`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/components/manager/ScheduleModal.jsx`

## Key Decisions
- Screeno is currently internal, single-company focused.
- AI is advisory only; humans make final decisions.
- Audio is never stored.
- Report scores use a 1-10 backend contract. Frontend must not divide scores.
- Email delivery is redirected to three static internal recipients during this phase.
- Frontend bundle splitting is deferred; future fix is route-level lazy loading and removing prototype/demo code from production imports.

## Current Limitations
- No automated CI suite yet; skipped by request.
- Lint debt remains; skipped for now (pre-existing unused-var/impure-effect warnings in
  `ExamPage.jsx`, `MemberProfilePage.jsx`, `api.js` — not introduced by recent work).
- Templates remain blocked; skipped for now.
- Calendar sync, no-show tracking, Slack/Teams notifications, and evidence-linked rating scales
  are future roadmap items. (Coding editor shipped 2026-06-08 — see below.)
- Coding-question judge depends on the free hosted Piston API (`emkc.org`) — no API key, no SLA;
  if it goes down, coding submissions are stored as "not evaluated" and graded narratively only.

## File Map
frontend/src/components/shared/     -> Button, Card, Badge, Avatar, Modal, Input, ErrorBoundary, Spinner
frontend/src/components/layout/     -> App layout, sidebar, top bar (logo click -> role dashboard)
frontend/src/components/manager/    -> Schedule modal, candidate edit/add/compare
frontend/src/pages/manager/         -> Dashboard, Team, Member Profile, Schedule, Reports, Templates, Resume Analyzer
frontend/src/pages/candidate/       -> Landing, Device Check, Consent, AI Interview, Exam (now with code editor), Human Interview, Done
frontend/src/pages/interviewer/     -> Dashboard, Live Room, Scorecard, Profile
backend/src/routes/                 -> auth, team, schedule, interview, report, candidate, interviewer, exam, upload, profile
backend/src/services/               -> auth, schedule, interview, report jobs, email, LLM, transcription, PDF, storage, judge (Piston)
backend/src/repositories/           -> user, candidate, interview, attempt, answer, question, report, scorecard, notes, schedule records, email delivery
backend/src/db/                     -> connection factory and Supabase/SQL Server drivers
backend/migrations/                 -> 006_question_count, 007_coding_questions (paired Postgres + SQL Server files)

## Handoff Prompts

### 2026-06-08 - Resume/transcript/scheduling/UX/coding-assessment sweep
Ten-item audit pass (one big user request). All implemented and verified (build + health check):
1. **Resume upload** — `storage.service.js uploadResume` now keys Cloudinary on a stable
   `resume_candidate_${candidateId}` public_id with `overwrite: true`, so re-uploading replaces
   the existing asset instead of creating duplicates (one resume per candidate).
2. **AI transcripts per interview** — `MemberProfilePage.jsx` Transcript tab now lists every
   completed `ai_voice` session in a dropdown (newest first) instead of showing only the latest.
3. **Schedule recipients from user table** — added `userRepository.getByCompany`,
   `scheduleService.getOrgUsers`, `GET /api/schedule/org-users`; `ScheduleModal.jsx` report-recipient
   chips now suggest from the company's `users` table, not just team/candidate records.
4. **Email routing verified** — `email.service.js STATIC_RECIPIENTS` already redirects all mail to
   exactly the three requested addresses; no change needed.
5. **Loader centering** — replaced bare `<Spinner />` / padded-div wrappers with `<Spinner center />`
   across Human Interview, Interviewer Profile, Manager Profile, Scorecard, Member Profile, Reports,
   Templates pages.
6. **Crash protection** — new `frontend/src/components/shared/ErrorBoundary.jsx` wraps `<App />` in
   `main.jsx`; added a global `unhandledrejection` listener.
7. **Logo redirect** — `AppLayout.jsx`/`CandidateLayout.jsx` logo now navigates to
   `/${role}/dashboard` (manager/interviewer) or `/candidate/dashboard` only when logged in
   (preserves the magic-link interview flow).
8. **Human interview bugs** — root cause of the broken/unstyled video room was a missing
   `@livekit/components-styles` import (now installed + imported in `main.jsx`); rewrote
   `HumanInterviewPage.jsx` and `LiveRoomPage.jsx` to handle `onDisconnected` with a rejoin UI.
9. **Coding assessment (LeetCode-style)** — new `backend/migrations/007_coding_questions` adds
   `language`/`starter_code`/`test_cases` to `questions`; new `judge.service.js` runs code via the
   free Piston API; `llm.service.js generateExamQuestions` now produces 5 MCQ + 3 open + 2 coding
   questions and **validates every coding question by executing its reference solution through the
   judge** (never trusts LLM-hallucinated `expected_output`); `exam.routes.js` submit handler grades
   candidate code against test cases and folds pass/fail into the existing LLM report-scoring flow;
   frontend `ExamPage.jsx` ships a CodeMirror editor (`@uiw/react-codemirror`) with a test-case panel.
10. **Date-wise analysis history** — added `reportRepository.getHistoryByCandidate`,
    `GET /api/reports/candidate/:id/history`; `MemberProfilePage.jsx` Analysis tab now shows a
    session-picker dropdown over full report history instead of only the latest report.

Verification done: `node setup-db.js` applied migration 007 to live Supabase; all touched backend
modules `require()` cleanly; `npm run build` succeeds; backend boots and `/health` returns 200.
No automated test suite exists for backend or frontend (by design — see Current Limitations).

### 2026-06-07 - Audit hardening milestone
Continue by running setup-db, backend syntax checks, frontend build, and API/browser smoke tests. Then commit and push if verification passes.

### 2026-06-08 - Post-merge bug sweep
Fixed three confirmed bugs found during a doc/code review pass:
- `backend/src/services/email.service.js` — transporter read `process.env.SMTP_PASS`, but `.env` defines
  `SMTP_PASSWORD`. All transactional mail (magic links, schedule notices, report-ready) was failing SMTP
  auth silently. Fixed to read `SMTP_PASSWORD`.
- `frontend/src/services/api.js` — `authFetch` (used by `saveAnswer` audio uploads and `uploadResume`) did
  not redirect to `/login` / clear `localStorage` on a persistent 401 the way `request()` does. Wrapped its
  refresh-and-retry in try/catch to match `request()`'s behavior.
- `backend/src/services/llm.service.js` — `getAdaptiveQuestion` returned `null` (prematurely ending the
  candidate's adaptive interview) on any Groq failure, unlike `generateQuestions`/`generateReport` which
  fall back to Gemini. Added the same Groq → Gemini fallback.
Also refreshed root/backend/frontend `CLAUDE.md` and `docs/folder-structure.md`, which still described the
pre-build planning state (claimed `backend/src` didn't exist, frontend was the Vite placeholder, listed
Axios/Resend/SDK-based LLM calls that were never actually used).
