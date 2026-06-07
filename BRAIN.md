# Screeno - Project Brain
Last updated: 2026-06-07

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
- [ ] Device check is intentionally permissive for now.
- [ ] Consent copy is intentionally unchanged for now.

### Interviewer
- [x] Dashboard and assigned human interview schedule.
- [x] Live room route with notes/guide persistence and server completion.
- [x] Scorecard assignment checks with decision, reason, evidence, author, and timestamps.
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
- Lint debt remains; skipped for now.
- Templates remain blocked; skipped for now.
- Calendar sync, no-show tracking, coding editor, Slack/Teams notifications, and evidence-linked rating scales are future roadmap items.

## File Map
frontend/src/components/shared/     -> Button, Card, Badge, Avatar, Modal, Input
frontend/src/components/layout/     -> App layout, sidebar, top bar
frontend/src/components/manager/    -> Schedule modal, candidate edit/add/compare
frontend/src/pages/manager/         -> Dashboard, Team, Member Profile, Schedule, Reports, Templates, Resume Analyzer
frontend/src/pages/candidate/       -> Landing, Device Check, Consent, AI Interview, Exam, Human Interview, Done
frontend/src/pages/interviewer/     -> Dashboard, Live Room, Scorecard, Profile
backend/src/routes/                 -> auth, team, schedule, interview, report, candidate, interviewer, exam, upload, profile
backend/src/services/               -> auth, schedule, interview, report jobs, email, LLM, transcription, PDF, storage
backend/src/repositories/           -> user, candidate, interview, attempt, answer, question, report, scorecard, notes, schedule records, email delivery
backend/src/db/                     -> connection factory and Supabase/SQL Server drivers

## Handoff Prompts

### 2026-06-07 - Audit hardening milestone
Continue by running setup-db, backend syntax checks, frontend build, and API/browser smoke tests. Then commit and push if verification passes.
