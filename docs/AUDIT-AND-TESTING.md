# Screeno V2 Audit and Testing

Last verified: 2026-06-12

## V2 Scope

Screeno V2 supports two roles:

- Manager: manages internal employees and external candidates, schedules AI voice interviews or AI exams, and reviews reports.
- Candidate: opens assigned work from the dashboard or a single-use magic link, completes device and consent checks, and takes the interview or exam.

Human interviews, interviewer accounts, LiveKit rooms, member/interview notes, reusable interview templates, and repeated attempt scheduling are intentionally paused. Their routes, pages, packages, and obsolete schema have been removed rather than left as non-functional UI.

## Database Decision

Migration `backend/migrations/004_v2_schema_cleanup.sql` is the source of truth for the V2 cleanup.

The active schema has 15 tables:

1. `companies`
2. `users`
3. `departments`
4. `team_members`
5. `external_candidates`
6. `interviews`
7. `transcripts`
8. `scorecards`
9. `reports`
10. `report_jobs`
11. `email_deliveries`
12. `refresh_tokens`
13. `client_templates`
14. `monthly_assessments`
15. `monthly_assessment_enrollments`

Important choices:

- Resume URL, resume update time, and tags belong to internal `users`.
- External candidates retain their own resume fields and AI tags because they do not have a `users` row.
- `team_members` is a manager-to-user relationship and no longer duplicates `company_id`.
- `interviews` stores the candidate reference, manager, type, lifecycle status, token hash/expiry, and final result.
- Transcript rows store one question and answer per interview.
- Scorecard owns evaluation fields; report owns the generated narrative and links to its scorecard.
- `refresh_tokens` remains because refresh-token rotation, revocation, and logout need server-side state.
- `report_jobs` remains because report generation is asynchronous and must survive request completion.
- `email_deliveries.kind` remains useful for operational history when one interview sends different message types.
- Candidate/interview notes, attempts, files, proctoring events, old questions/answers, scheduling records, and legacy templates were removed.

## Implemented Workflows

### Authentication

- Manager and candidate password login.
- JWT access token plus rotated HttpOnly refresh-token cookie.
- Single-use, time-bounded, hashed candidate magic links.
- Automatic frontend refresh and one retry after an expired access token.
- Configured test-account shortcuts are hidden unless `VITE_SHOW_DEMO_ACCOUNTS=true` is provided.

### Manager

- Dashboard statistics.
- Internal team list, add existing organization users, manual member creation, editing, removal, and CSV import.
- Employee ID, department, position, location, availability, resume, and tags.
- External candidate creation with optional resume upload.
- AI voice and AI exam scheduling for internal or external candidates.
- Client mandates, tag extraction, candidate matching, JD delivery, and scheduling.
- Monthly assessment creation with ownership validation and calendar data.
- Schedule calendar, reports, profile editing, password changes, and resume analyzer.

### Candidate

- Dashboard with resume upload, availability, tags, and assigned work.
- Fresh launch-token issuance so old magic links do not need to be stored in the browser.
- Device checks for camera, microphone, speaker, network, and screen capability.
- Consent flow.
- Resumable AI voice interview with persisted question/answer transcript rows.
- AI exam with answer-key redaction.
- First tab-visibility violation warns; the next violation completes the interview as a cheating attempt and records a zero scorecard.
- Completion page does not promise report content that is unavailable to the candidate.

## Automated Verification

Run from the repository root.

```powershell
cd backend
npm test
npm run test:api
npm run check
node run-migration-004.js
node dump-schema.js
node create_models.js

cd ..\frontend
npm run lint
npm run build

cd ..
npm audit --prefix backend
npm audit --prefix frontend
git diff --check
```

Verified results on 2026-06-12:

- Backend unit tests: 7 passed, 0 failed.
- API regression: passed auth, refresh, team metadata, external candidates, templates, monthly assessments, ownership rejection, internal/external schedules, reports, profile, candidate launch, magic links, and email-delivery isolation.
- Backend syntax check: passed.
- Migration verification: passed against the configured PostgreSQL database.
- Schema dump/model generation: 15 tables generated successfully.
- Frontend ESLint: passed with no findings.
- Frontend production build: passed. Vite reported only the advisory large-chunk warning.
- Backend npm audit: 0 vulnerabilities.
- Frontend npm audit: 0 vulnerabilities.
- Git whitespace validation: passed; Windows line-ending notices are informational.
- External AI, transcription, and code-judge calls have explicit request timeouts.
- Resume/text routes accept document MIME types only; answer recording accepts audio MIME types only.

The API regression suite creates uniquely named fixtures and removes them in a transaction-safe cleanup phase.

## Browser Verification

Verified in the in-app browser against frontend `http://127.0.0.1:5173` and backend `http://localhost:4010`:

- Invalid manager credentials show an inline error.
- Configured test-account shortcuts sign in only when local environment variables provide those accounts.
- Dashboard loads live statistics.
- Internal team list and organization-member modal load.
- External candidates tab loads and exposes scheduling.
- Schedule calendar loads and the V2 assessment wizard offers only AI Voice Interview and AI Assessment Exam.
- Reports page loads its empty state and filters.
- Client mandate page and new-mandate dialog load.
- Monthly assessment list and creation wizard load.
- Resume analyzer and manager profile load.
- No browser console error was observed during the workflow checks.

Browser screenshot capture timed out in the desktop browser bridge, but DOM and interaction verification completed successfully.

## Production Configuration

Required secrets must be provided by deployment environment variables and must never be committed:

- Database connection variables
- `JWT_SECRET`
- SMTP settings, or an explicitly selected delivery transport
- Groq/Gemini credentials when AI generation is enabled
- Supabase storage credentials when remote resume storage is enabled
- `FRONTEND_URL`

`EMAIL_TRANSPORT=console` is for automated/local testing only. Production must use a real delivery transport.

## Known Non-Blocking Risk

The frontend production bundle is approximately 1 MB before gzip and Vite emits a chunk-size advisory. This does not break deployment, but route-level code splitting is recommended before substantial new UI is added.
