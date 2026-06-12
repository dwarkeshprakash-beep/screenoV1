# Screeno V2 Open Issues

Last reviewed: 2026-06-12

All blocking items from the V2 database and workflow audit are implemented and covered by `docs/AUDIT-AND-TESTING.md`.

## P1 - Before Public Production

### Real-device candidate matrix

Run the complete candidate flow on supported desktop Chrome and Edge with real camera, microphone, speakers, speech recognition, permission denial, device loss, and network interruption.

Acceptance:

- Device checks accurately report failures.
- Permission denial has actionable recovery copy.
- A refresh resumes the same interview without duplicating transcript rows.
- The second tab-visibility violation completes with `cheating_attempt`.

### Production delivery drill

Deploy to a staging environment using production-equivalent database, SMTP/Brevo, AI, and storage configuration.

Acceptance:

- A real candidate receives a magic link.
- The link is single-use and expires correctly.
- Completing an interview creates one scorecard, one report, and a completed report job.
- Failed email and report jobs are visible and retryable.

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
