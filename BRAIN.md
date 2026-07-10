# Screeno V2 Second Brain

Last updated: 2026-07-07

## What Screeno Is

Screeno is a desktop-first AI assessment platform. Managers maintain internal and external candidate rosters, schedule AI voice interviews or AI exams, and review generated reports. Candidates can use a password dashboard or a single-use magic link.

V2 intentionally supports only manager and candidate roles. Human interviews, interviewer accounts, LiveKit video rooms, and notes are paused and removed from runtime.

## Roles

### Manager

- Password login using JWT access tokens and a rotated refresh-token cookie.
- Manage internal team members and company-owned external candidates.
- Store internal resume URL, resume update time, tags, availability, employee ID, department, position, and location.
- Schedule AI voice interviews, AI exams, and Google Meet-backed human interviews.
- Create client mandates and monthly assessments.
- View calendar events, report details, transcripts, scorecards, and candidate history.
- Update profile and password.

### Candidate

- Password dashboard for assigned work, resume, tags, and availability.
- Single-use magic-link launch for a specific interview.
- Device checks, consent, AI voice interview, or AI exam.
- The first tab switch warns; the second completes the interview as a cheating attempt.
- Candidate dashboard and completion UI expose feedback/tips only, not manager-only scores or hiring decisions.

## Identity Relationships

### Internal Candidate

An internal candidate is a `users` row. A `team_members` row links that user to a manager. The same organization user may belong to more than one manager's team.

- Manager navigation uses `team_members.id`.
- Interview identity uses `interviews.internal_user_id`, which points to `users.id`.
- Resume and tags belong to `users`.

### External Candidate

An external candidate is an `external_candidates` row owned by a company and does not require a login account.

- Interview identity uses `interviews.external_candidate_id`.
- External resume and tags remain on `external_candidates`.
- An interview must reference one internal or one external candidate, never both.

`candidate-identity.service.js` centralizes this distinction so repositories and services do not guess which ID namespace they received.

## Active Schema

The active schema includes the V2 core tables plus client mandate workflow tables and password reset token storage:

- `companies`
- `users`
- `departments`
- `team_members`
- `external_candidates`
- `interviews`
- `transcripts`
- `scorecards`
- `reports`
- `report_jobs`
- `email_deliveries`
- `refresh_tokens`
- `client_templates`
- `monthly_assessments`
- `monthly_assessment_enrollments`
- `monthly_assessment_occurrences`
- `client_mandate_requirements`
- `client_teams`
- `client_interview_rounds`
- `password_reset_tokens`
- `assignment_requests`
- `email_outbox_jobs`
- `resume_assets`

`backend/migrations/016_monthly_and_mandate_cleanup.sql` is the latest cleanup migration. `backend/src/db/schema.js`, `docs/database-schema.md`, and generated model references must agree with it.

## Critical Flows

### Authentication

- Manager/candidate dashboard: bearer access token plus HttpOnly refresh cookie.
- Candidate interview: magic link is hashed at rest, time-bounded, scoped to one interview, and consumed once.
- Frontend API calls go through `frontend/src/services/api.js`, which performs one refresh and retry on access-token expiry.

### Scheduling

1. Manager selects AI voice or AI exam.
2. Manager selects internal team-member IDs or external candidate IDs.
3. Backend verifies manager/company ownership.
4. One interview is created per selected candidate.
5. Email delivery is recorded.
6. Candidate launches with the scoped token.

### AI Voice Interview

1. Candidate completes device and consent checks.
2. Questions are generated and stored as transcript rows.
3. Each answer is transcribed and persisted.
4. Adaptive mode may request a bounded follow-up.
5. Completion queues report generation.

### AI Exam

1. Questions are generated and normalized.
2. Public responses remove MCQ answer keys, reference solutions, and hidden expected outputs.
3. Coding reference solutions are validated with Piston before use.
4. Submitted coding answers run visible and hidden cases through the server-side judge.
5. Submitted answers are stored in transcript rows.
6. Completion queues report generation. Blank timed-out exams complete cleanly with a ready failure report.

### Report Pipeline

1. Interview completion creates a `report_jobs` row.
2. The worker claims pending work and calls the LLM.
3. Evaluation fields are normalized and stored in `scorecards`.
4. Narrative output is stored in `reports`.
5. Delivery status is recorded in `email_deliveries`.
6. Graceful shutdown returns in-progress jobs to a retryable state.

External HTTP integrations use explicit timeouts. Groq is primary for LLM work, with Gemini fallback where supported.

## Deliberate V2 Decisions

- Keep `refresh_tokens`: rotation, revocation, and logout require server-side state.
- Keep `report_jobs`: reports are asynchronous and must survive the request lifecycle.
- Keep email delivery `kind`: one interview can produce multiple operational messages.
- Remove old attempts: V2 currently allows one interview lifecycle per scheduled record.
- Remove notes and proctoring-event tables: no active product workflow consumes them.
- Store tab-switch enforcement in interview result/scorecard rather than a separate event table.
- Do not store schedule timezone/window fields until a real scheduling-window workflow exists.

## Verification

The canonical acceptance record is `docs/AUDIT-AND-TESTING.md`. The database-backed regression suite is `backend/test/api-regression.js`.

## Current Non-Blocking Gaps

- Camera, microphone, speaker, and speech-recognition behavior still needs real-device coverage across supported browsers.
- Consent copy requires product/legal approval before public launch.
- Production deployment requires valid SMTP, AI, storage, database, and JWT secrets.
- Notification preferences (email/in-app) are stored in `localStorage` only; they are not persisted to the backend and reset when browser data is cleared.
- Migrations 009-016 must be applied on existing databases.
