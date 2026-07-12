# Screeno V2 Open Issues

Last reviewed: 2026-07-10

The current code builds, lints, passes backend unit tests, and passes the API regression suite against a fresh local backend. The items below are the remaining product and release-readiness gaps after the July cleanup.

## P1 - Before Public Production

### Run migrations 017-019 on existing databases

Migration `017_drop_unused_runtime_columns.sql` removes columns no longer used by the current app:

- `companies.logo_url`
- `interviews.schedule_version`
- `interviews.meeting_provider`
- `interviews.meeting_provider_event_id`
- `interviews.expired_notification_version`

Acceptance:

- Migrations run successfully on staging and production-like databases.
- `backend/src/db/schema.js` and `docs/database-schema.md` match the live schema after migration.
- `client_mandate_requirements.tags`, hot-path indexes, accidental-FK cleanup from migration 018, and manual-mapping policy cleanup from migration 019 are present.

### Real-device candidate matrix

Run the complete candidate flow on supported desktop Chrome and Edge with real camera, microphone, speakers, permission denial, device loss, and network interruption.

Acceptance:

- Device checks accurately report failures.
- Refresh resumes an interview without duplicating transcript rows.
- A repeated tab/fullscreen violation completes with `cheating_attempt`.

### Production delivery drill

Deploy to staging with production-equivalent database, SMTP/Brevo, AI, and storage configuration.

Acceptance:

- A real candidate receives a magic link.
- Magic-link preview and claim work once and reject replay.
- Failed email and report jobs are visible and retryable.

### Consent and AI policy review

Product/legal must approve consent wording, recording/transcription notice, data-retention expectations, and the statement that AI output is advisory.

### Server-side interview gate state

Device check and consent are enforced in the frontend today. Persist candidate device-check/consent completion server-side before public launch so interview APIs can reject skipped flows.

## P2 - Product Flow Gaps

### Monthly assessment occurrence actions

Managers can assign recurring monthly plans, but they still need per-occurrence controls.

Acceptance:

- Manager can resend an occurrence invite.
- Manager can reschedule one occurrence without changing the whole plan.
- Manager can cancel one future occurrence while preserving completed history.
- Candidate and manager views show delivery/status history clearly.

### Client mandate lifecycle clarity

Client mandates support role profiles, JD sends, resumes, interviews, and outcome rounds, but the manager workflow should present one clear lifecycle per candidate.

Acceptance:

- Each candidate row shows: added, JD sent, resume submitted, interview scheduled, latest round, final outcome.
- Manager can delete unused role profiles and move candidates between mandate role profiles with capacity errors surfaced.
- Candidate mandate and outcome views share the same source of truth.
- Outcome rounds are covered by browser regression tests.

### Admin workflow regression

Admin routes and pages exist, but admin repair flows need explicit regression coverage.

Acceptance:

- Admin login reaches `/admin/dashboard`.
- Mandate/interview force-status actions are tested against fixture data.
- Broken-state repair actions are covered by API or browser tests.

## P3 - Maintainability

### Browser regression automation

Add repeatable browser tests for login, team tabs, schedule wizard, client mandate dialog, monthly-assessment dialog, and candidate launch.

Acceptance:

- Tests run in CI against isolated fixtures.
- Failed tests retain screenshots/traces.
- Test cleanup does not remove non-fixture data.

### Legacy data model consolidation

Several legacy columns are still kept as compatibility fallbacks and should not be dropped until data is backfilled.

Candidates:

- `users.resume_url` and `client_teams.client_resume_url` after all rows use `resume_assets`.
- `client_templates.requirements`, `jd_text`, `tags`, `resume_deadline`, and `headcount` after all active UI/API paths use `client_mandate_requirements`.
