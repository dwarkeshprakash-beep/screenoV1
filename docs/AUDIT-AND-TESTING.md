# Screeno V2 Audit and Testing

Last updated: 2026-07-08

## V2 Scope

Screeno V2 supports two active roles:

- Manager: manages internal employees and external candidates, schedules AI voice interviews, exams, configured human video interviews, client-mandate readiness checks, and monthly assessments.
- Candidate: opens assigned work from the dashboard or a single-use magic link, completes device/consent checks, and takes the interview or exam.

Human video scheduling currently supports Google Meet when the server is configured. Microsoft Teams is visible as an organization-setup-needed option and is blocked from submission until that integration is configured.

Live interviewer consoles and LiveKit room flows remain out of the active route tree.

## Database Decision

Migrations `001` through `008` are the current schema source of truth.

The active schema has 19 tables:

1. `companies`
2. `departments`
3. `users`
4. `team_members`
5. `external_candidates`
6. `client_templates`
7. `client_mandate_requirements`
8. `client_teams`
9. `client_interview_records`
10. `monthly_assessments`
11. `monthly_assessment_enrollments`
12. `interviews`
13. `transcripts`
14. `scorecards`
15. `reports`
16. `report_jobs`
17. `email_deliveries`
18. `refresh_tokens`
19. `password_reset_tokens`

Important choices:

- Resume URL, resume text, resume update time, and tags belong to internal `users`.
- External candidates retain their own resume fields and AI tags.
- `team_members` is a manager-to-user relationship and does not duplicate `company_id`.
- Client mandates use `client_templates`; optional role/year bands live in `client_mandate_requirements`.
- `client_teams` tracks candidates attached to mandates, JD delivery, and client-specific resumes.
- Real client-side outcomes are logged in `client_interview_records`.
- Monthly assessment assignment creates `monthly_assessment_enrollments` and a linked `interviews` row.
- `interviews` stores candidate reference, manager, type, lifecycle status, token hash/expiry, schedule time, duration, context ids, and final result.
- Scorecard owns numeric evaluation fields; report owns generated narrative and links to its scorecard.
- `report_jobs` remains because report generation is asynchronous and must survive request completion.

## Implemented Workflows

### Authentication

- Manager and candidate password login.
- JWT access token plus rotated HttpOnly refresh-token cookie.
- Forgot/reset password token storage.
- Single-use, time-bounded, hashed candidate magic links.
- Short-lived interview-scoped sessions for magic-link launches.
- Automatic frontend refresh and one retry after an expired dashboard access token.

### Manager

- Dashboard statistics.
- Internal team list, add existing organization users, manual member creation, editing, removal, and CSV import.
- Employee ID, department, position, location, availability, resume text/upload, and tags.
- External candidate creation with optional resume upload.
- Main schedule wizard for AI voice/exam with required scheduled datetime.
- Client mandates with JD extraction, requirement profiles, tag/profile matching, JD delivery, scheduled AI/exam/human/offline interviews, and client outcome logging.
- Monthly assessment subject library, scheduled assignment, linked exam interview creation, plan view, and yearly calendar.
- Reports, profile editing, password changes, and resume analyzer.

### Candidate

- Dashboard with overview, interviews, monthly assessments, client mandates, and profile.
- Client mandate JD/details view and client-specific resume submission.
- Fresh launch-token issuance for dashboard interview starts.
- Device checks for camera, microphone, speaker, network, and screen capability.
- Consent flow.
- Resumable AI voice interview with persisted transcript rows.
- AI exam with answer-key redaction, duration, local answer persistence, and clean timeout behavior.
- Completion page shows candidate-safe feedback/tips only.

## Automated Verification

Run from the repository root.

```powershell
cd backend
npm test
npm run test:api
npm run check

cd ..\frontend
npm run lint
npm run build

cd ..
git diff --check
```

Useful targeted checks:

```powershell
node --check backend/src/server.js
node --check backend/src/routes/client-template.routes.js
node --check backend/src/services/monthly-assessment.service.js
node --check backend/src/repositories/monthly-assessment.repository.js
```

## Current Non-Blocking Notes

- Browser smoke coverage should be made repeatable for login, team tabs, schedule wizard, client mandate dialog, monthly-assessment assignment, candidate launch, and candidate mandate resume submission.
- Google Meet scheduling requires Google Calendar service-account configuration.
- Microsoft Teams scheduling remains blocked until organization setup exists.
