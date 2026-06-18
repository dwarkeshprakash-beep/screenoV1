# Screeno V2 Open Issues

Last reviewed: 2026-06-18

All blocking items from the V2 database and workflow audit are implemented and covered by `docs/AUDIT-AND-TESTING.md`.

## P1 - Before Public Production

### Real-device candidate matrix

Run the complete candidate flow on supported desktop Chrome and Edge with real camera, microphone, speakers, speech recognition, permission denial, device loss, and network interruption.

Acceptance:

- Device checks accurately report failures.
- ✓ Fixed 2026-06-18: Permission denial now shows actionable recovery copy (browser icon + specific steps for mic/network/screen in `DeviceCheckPage.jsx`).
- A refresh resumes the same interview without duplicating transcript rows.
- The second tab-visibility violation completes with `cheating_attempt`.

### Production delivery drill

Deploy to a staging environment using production-equivalent database, SMTP/Brevo, AI, and storage configuration.

Acceptance:

- A real candidate receives a magic link.
- ✓ Fixed 2026-06-18: Magic link is now truly single-use — token hash is nullified in DB on first validation (`auth.service.js`). Exam token expiry is now mandatory (null `token_expires` is rejected).
- ✓ Fixed 2026-06-18: Completing an interview now creates exactly one scorecard, one report, and one report job (all three upserts converted to `INSERT … ON CONFLICT DO UPDATE`).
- Failed email and report jobs are visible and retryable.

### Run migration 006 on existing databases

Migration `006_missing_indexes.sql` adds four indexes identified during the 2026-06-18 audit as causing sequential scans on hot paths (`users.email`, `users.company_id`, `refresh_tokens.token_hash`, `transcripts.interview_id`).

Acceptance:

- `node backend/run-migration-006.js` runs without error.
- Output confirms 4/4 indexes verified.
- New databases created via `setup-db.js` already include the indexes.

### External candidate report detail page

Managers can see external-candidate reports in the reports list but cannot view the full scorecard (no `team_member_id` → no link to a member profile page). There is also no `/manager/reports/:id` detail route for any report type.

Acceptance:

- A dedicated report detail page or slide-over shows scorecard, summary, strengths, and PDF link.
- The "View" action on `ReportsPage` works for both internal and external candidates.

### Password reset flow

No self-service password reset exists. Locked-out accounts require direct DB access.

Acceptance:

- A "Forgot password?" link on the login page triggers an email with a time-bounded reset link.
- The reset link is single-use and hashed at rest (same pattern as magic links).

### Consent and AI policy review

Product/legal must approve the consent wording, recording/transcription notice, data retention expectations, and the statement that AI output is advisory.

## P2 - Performance and Automation

### Frontend route-level code splitting

The production bundle is approximately 1 MB before gzip and triggers Vite's 500 kB chunk advisory.

Acceptance:

- Manager and candidate route groups are lazy-loaded.
- Initial bundle no longer triggers the chunk warning, or the remaining warning is documented with measured justification.

### Browser regression automation

The current browser smoke test is interactive and the API regression is automated. Add repeatable browser tests for login, team tabs, schedule wizard, client mandate dialog, monthly-assessment dialog, and candidate launch.

Acceptance:

- Tests run in CI against isolated fixtures.
- Failed tests retain screenshots/traces.
- Test cleanup does not remove non-fixture data.

## P3 - Maintainability

### Remove unused prototype pages

`frontend/src/pages/v2-app.jsx` and `frontend/src/pages/v2-manager.jsx` are not imported by the active application and still describe prototype behavior.

Acceptance:

- Confirm no design reference still depends on them.
- Remove them in a dedicated cleanup commit.

## Closed in the V2 Audit

- Compact 15-table schema and migration verification.
- Manager/candidate-only role surface.
- LiveKit and interviewer route/page/package removal.
- Internal and external candidate identity handling.
- Resume URL/update time and tags on internal users.
- Ownership checks for monthly assessments and delivery history.
- Refresh-token rotation and server-side storage.
- Health database liveness check.
- Graceful report-worker shutdown.
- Central frontend token refresh.
- AI exam answer-key redaction.
- Tab-switch warning and cheating completion.
- External provider request timeouts.
- Unit, API, lint, build, security audit, and browser smoke coverage.
