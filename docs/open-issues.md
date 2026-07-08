# Screeno V2 Open Issues

Last reviewed: 2026-07-08

Blocking database/runtime items from the V2 audit are mostly implemented, but several UI workflow items still need end-to-end verification before a public handoff.

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
- Fixed: Magic link validation now swaps the emailed token for a short-lived launch token, so the original email link cannot be replayed. Exam token expiry is mandatory.
- ✓ Fixed 2026-06-18: Completing an interview now creates exactly one scorecard, one report, and one report job (all three upserts converted to `INSERT … ON CONFLICT DO UPDATE`).
- Failed email and report jobs are visible and retryable from manager UI.

### Run migrations 006-008 on existing databases

Migrations `006_missing_indexes.sql`, `007_client_teams.sql`, and `008_state_flow_fixes.sql` add the current indexes, client-team tables, password reset token storage, exam duration, and resume text fields.

Acceptance:

- Pending migrations run without error.
- New databases created via `setup-db.js` already include migrations 001-008.

### Consent and AI policy review

Product/legal must approve the consent wording, recording/transcription notice, data retention expectations, and the statement that AI output is advisory.

## P2 - Performance and Automation

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

## Implemented / Needs Regression Verification

- Compact 15-table schema and migration verification.
- Manager/candidate-only role surface.
- LiveKit and interviewer route/page/package removal.
- Report detail modal for internal and external candidates.
- Report-ready email query handling for `/manager/reports?interview=...`.
- Forgot-password and reset-password flow with hashed single-use reset tokens.
- Candidate feedback/tips views without candidate-visible scores.
- Backend-configured exam/AI duration and blank-timeout completion.
- Route-level lazy loading.
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

## Still Open / Partial

- Exam answer autosave needs a browser regression test.
- Server-side coding submission judge is still not wired as the primary candidate-code grading path.
- Monthly assessment and client-mandate scheduling need real-device candidate launch verification with specific start/end windows.
- Prototype/backup folders still need a dedicated cleanup pass before handoff.
