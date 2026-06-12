# Screeno V2 Implementation Handoff

Updated: 2026-06-12

## Current State

The V2 database simplification and manager/candidate workflow repair are implemented. The authoritative implementation and verification record is `docs/AUDIT-AND-TESTING.md`.

Key entry points:

- Schema migration: `backend/migrations/004_v2_schema_cleanup.sql`
- Migration verifier: `backend/run-migration-004.js`
- Runtime schema: `backend/src/db/schema.js`
- API regression: `backend/test/api-regression.js`
- Service unit tests: `backend/test/v2-services.test.js`
- Frontend routes: `frontend/src/App.jsx`
- Frontend API client: `frontend/src/services/api.js`

## Deliberate V2 Boundaries

- Active roles: manager and candidate.
- Active assessment types: AI voice and AI exam.
- Human interview and interviewer functionality is paused and removed from runtime.
- Internal employee profile data is stored on `users`.
- External candidates remain company-owned records because they are not organization users.
- Refresh tokens and report jobs are retained because they support active authentication and asynchronous report workflows.

## Verification

Before deployment, run the command list in `docs/AUDIT-AND-TESTING.md`. Do not use the older V1 test instructions in historical docs as acceptance criteria for V2.

The latest completed verification includes unit tests, database-backed API regression, migration verification, generated-schema checks, lint, production build, npm security audits, and browser smoke testing.
