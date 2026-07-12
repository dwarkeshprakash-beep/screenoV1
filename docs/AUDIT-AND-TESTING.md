# Screeno V2 Audit And Testing

Last updated: 2026-07-10

## V2 Scope

Screeno V2 supports two active roles:

- Manager: manages internal employees and external candidates, schedules AI voice interviews, exams, configured human video interviews, client-mandate readiness checks, client-side outcome rounds, and monthly assessments.
- Candidate: opens assigned work from the dashboard or a single-use magic link, completes device/consent checks, and takes the interview or exam.

Human video scheduling currently supports Google Meet when the server is configured. Microsoft Teams is visible as an organization-setup-needed option and is blocked from submission until that integration is configured.

Live interviewer consoles and LiveKit room flows remain out of the active route tree.

## Database Decision

Migrations `001` through `019` are the current schema source of truth.

The active schema has 23 tables:

1. `companies`
2. `departments`
3. `users`
4. `team_members`
5. `external_candidates`
6. `client_templates`
7. `client_mandate_requirements`
8. `client_teams`
9. `client_interview_rounds`
10. `monthly_assessments`
11. `monthly_assessment_enrollments`
12. `monthly_assessment_occurrences`
13. `interviews`
14. `transcripts`
15. `scorecards`
16. `reports`
17. `report_jobs`
18. `email_deliveries`
19. `refresh_tokens`
20. `password_reset_tokens`
21. `assignment_requests`
22. `email_outbox_jobs`
23. `resume_assets`

Important choices:

- Resume URL, resume text, resume update time, current resume asset, and tags belong to internal `users`.
- External candidates retain their own resume fields and AI tags.
- `team_members` is a manager-to-user relationship and does not duplicate `company_id`.
- Client mandates use `client_templates`; role/year bands, role JD text, role tags, and role resume deadlines live in `client_mandate_requirements`.
- `client_teams` tracks candidates attached to mandates, JD delivery, submitted client-specific resumes, and status.
- Client-side outcomes are logged as multi-round history in `client_interview_rounds`; the legacy `client_interview_records` table was removed after migration `016`.
- Migration `017` removes runtime-unused interview/provider version columns and `companies.logo_url`.
- Migration `018` adds the clean-DB mandate role tag column, removes accidental FK constraints to match backend-enforced integrity, adds current hot-path indexes, and prunes expired operational token/request rows.
- Migration `019` finalizes the manual-mapping policy by removing any remaining FK constraints and moving business check enforcement fully into backend services/repositories.
- Monthly assessment assignment creates `monthly_assessment_enrollments`, monthly occurrence rows, assignment requests, and linked interview rows through occurrence links.
- `monthly_assessment_enrollments` no longer stores `interview_id` or `month_progress`; plan/progress views are derived from `monthly_assessment_occurrences`.
- `interviews` stores candidate reference, manager, type, lifecycle status, token hash/expiry, schedule time, duration, context ids, and final result.
- Scorecard owns numeric evaluation fields; report owns generated narrative and links to its scorecard.
- `report_jobs` and `email_outbox_jobs` remain because report/email generation is asynchronous and must survive request completion.

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
- Client mandates with JD extraction, requirement profiles, resume deadlines, tag/profile matching, JD delivery, scheduled AI/exam/human/offline interviews, and multi-round client outcome publishing.
- Monthly assessment subject library, scheduled assignment, linked exam or AI voice occurrence creation, plan view, yearly calendar, and enrollment cancellation.
- Reports, profile editing, password changes, notification preferences, and resume analyzer.

### Candidate

- Dashboard with overview, interviews, monthly assessments, client mandates, and profile.
- Client mandate JD/details view, client-specific resume submission, and published client-round feedback.
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
node --check backend/src/routes/monthly-assessment.routes.js
node --check backend/src/services/monthly-assessment.service.js
node --check backend/src/repositories/monthly-assessment.repository.js
```

## Current Non-Blocking Notes

- Browser smoke coverage should be made repeatable for login, team tabs, schedule wizard, client mandate dialog, monthly-assessment assignment, candidate launch, and candidate mandate resume submission.
- Google Meet scheduling requires Google Calendar service-account configuration.
- Microsoft Teams scheduling remains blocked until organization setup exists.
