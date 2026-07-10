# Screeno Implementation Gaps and Flow Test

Historical note: this handoff captured the July 9 state and is now superseded by `docs/open-issues.md` and current test results. Several failures listed here have since been fixed.

Date: 2026-07-09  
Branch: `dev`  
Baseline: `1ea936c`  
Scope: attached June audit, current unpushed worktree, July flow specification, manager/candidate/admin journeys.

## Release verdict

**Do not merge, deploy, or apply migrations `009` through `015` yet.**

The backend cannot start, the frontend production build fails, and several new frontend/backend contracts do not match. The application therefore cannot complete a real login-to-finish workflow in its current state.

## Verification results

| Check | Result | Evidence |
|---|---|---|
| Backend focused unit tests | PASS | 9/9, but only helper-level tests |
| Backend JavaScript syntax | FAIL | `client-team.repository.js:191` declares `async function delete(...)` |
| Backend startup/health | FAIL | Server exits on the syntax error above |
| Frontend lint | FAIL | 27 errors and 3 warnings |
| Frontend production build | FAIL | Four admin pages import a nonexistent default export from `services/api.js` |
| Browser smoke test | BLOCKED | Login renders, but manager demo sign-in ends with `Failed to fetch` because the backend cannot start |
| API regression | BLOCKED | Backend cannot start; the existing regression script is also stale for the new required scheduling fields |
| Full E2E flow | NOT POSSIBLE | Entry flow is blocked at login/backend startup |

## Required implementation list

| Priority | Problem | Correct implementation |
|---|---|---|
| P0 | **Backend does not start.** `backend/src/repositories/client-team.repository.js` uses reserved word `delete` as a function name. | Remove the unused function or rename it to `deleteById`; update exports/callers and add a startup test that loads `server.js`. |
| P0 | **Frontend does not build.** Admin pages default-import `api`, while `api.js` has named exports only. Lint also finds undefined `assessmentDate`, `OutcomeRoundsModal`, `setSelectedTemplateId`, `loadTemplates`, and `Ban`. | Use named API functions, implement/remove unresolved components and variables, then require both lint and production build to pass. |
| P0 | **Demo credentials regressed into the source bundle.** `LoginPage.jsx` contains plaintext fallback accounts. The environment flag hides the UI but does not remove those strings from the built JavaScript. | Delete all credential-bearing fallback constants. Load demo accounts only from a local, development-only mechanism that is absent from production builds. |
| P0 | **Client-mandate child authorization remains incomplete.** Legacy client-interview and outcome-round routes verify the parent mandate but do not consistently prove that `ctId`/`roundId` belongs to that mandate. | Use scoped repository methods such as `getByIdForMandate` for every child read/write and add cross-company/cross-mandate negative API tests. |
| P0 | **Migrations `009`-`015` are unsafe and not wired into setup.** `setup-db.js` stops at `008`; `010`, `011`, and `014` are not safely rerunnable; `015` references missing company columns, adds a role constraint incompatible with existing candidate values, and seeds a default admin credential. | Repair each migration for the actual schema, make it idempotent, remove credential seeding, provide ordered migration runners and rollback notes, then dry-run on a disposable database copy. |
| P1 | **Permanent mandate deletion is invalid.** The service uses pooled `BEGIN/COMMIT` calls and SQL columns that do not exist (`reports.report_url`, `reports.job_id`, several `context_type` fields). | Execute all database work through one `db.transaction(tx => ...)`, join through the real interview/client-template relationships, collect real storage paths first, and verify deletion/rollback with integration tests. |
| P1 | **Candidate-to-role assignment loses the selected role.** The frontend sends top-level `{ userIds, requirementId }`; the backend only reads a requirement from each `userIds` item. Capacity is displayed but not enforced. | Send `{ userId, requirementId }` per candidate or explicitly apply the top-level role to all candidates. Validate role ownership, experience rules if required, and headcount atomically on add/move. |
| P1 | **Outcome-round manager endpoints call repository methods with wrong signatures.** List/create/update/publish/unpublish omit `mandateId` and shift arguments; legacy single-record routes are still active and insufficiently scoped. | Align route/repository contracts, scope every round through mandate and client-team IDs, retire or make the legacy model read-only, and test publish/unpublish plus candidate-safe DTOs. |
| P1 | **Monthly assignment is broken at the API boundary.** The modal sends `available_from`/`due_at`; the service requires `assessment_date`, so assignment fails. The service still creates one enrollment and one interview, not one occurrence per month. | Accept the new window fields, create all monthly occurrences and interviews in one transaction, use the request key for idempotency, enqueue consolidated outbox delivery, and return occurrence results. |
| P1 | **Monthly candidate/cancellation flow is incomplete.** Candidate monthly SQL joins `companies.manager_id`, which does not exist. Cancellation only handles the legacy enrollment interview and does not revoke future occurrences. | Join company through the manager user's `company_id`; cancel future occurrences/interviews/tokens transactionally while preserving completed history and exposing a separate history view. |
| P1 | **Scheduling is only partially timezone/window safe.** The shared schedule modal serializes UTC correctly, but mandate scheduling sends raw `datetime-local`; backend accepts past/timezone-less timestamps. Calendar ignores its `week` argument. | Use the shared serializer everywhere, require ISO timestamps with offsets and an IANA timezone, reject past/invalid windows, query only the requested week, and store organization/display timezone policy. |
| P1 | **Interview availability and rescheduling use the wrong contract.** Launch checks derive the window from `scheduled_at + duration` instead of `available_from`/`due_at`; token expiry remains a fixed seven days; expired notification versioning is unused. | Make server `available_from`, `due_at`, `duration_minutes`, status, and `serverNow` authoritative. Bind token expiry to the allowed window and deduplicate expiry/reschedule notifications. |
| P1 | **Human interview join is only partly connected.** The join API now exists, but scheduling stores the provider URL in `location`, ignores `meeting_url`, and does not update/cancel provider events. Candidate pages lack one shared join/launch action. | Store structured meeting fields, return a candidate-safe join DTO, synchronize provider event create/update/cancel, and use one shared interview action component across candidate pages. |
| P1 | **Resume/report storage lifecycle is inconsistent.** Legacy upload routes call removed `storageService.uploadResume`; report generation stores a one-hour signed URL in `reports.pdf_url`; old assets are not consistently retired. | Use immutable asset paths everywhere, store paths—not signed URLs—in the database, sign on authorized reads, preserve mandate snapshots, and explicitly clean replaced/orphaned assets. |
| P1 | **Admin is scaffolding, not a usable feature.** Admin pages are declared but have no `/admin` routes; login has no admin redirect; build fails; admin pages use native alerts/confirms. | Add an admin route guard/layout and redirect, expose named API methods, replace native dialogs, and add authorization tests before enabling the role. |
| P1 | **Refresh/session work is incomplete.** Token families and a browser lock exist, but access-token bootstrap/expiry validation is missing, refresh lifetime is hardcoded, and no concurrency/reuse tests exist. | Add a startup auth state machine, use `REFRESH_EXPIRES_IN`, make cookie policy deployment-aware, and test simultaneous-tab rotation, logout, expiry, and reuse detection. |
| P2 | **Site-wide UX contracts are unfinished.** Confirmation behavior is mixed, admin still uses native dialogs, manager notification toggles are localStorage-only, and candidate/manager scroll ownership has not been verified. | Use shared accessible dialogs and notices, remove or persist false-signal settings, then visually test desktop/mobile focus, keyboard, and scroll behavior. |
| P2 | **June audit cleanup is incomplete.** Device permission guidance is generic rather than browser-specific; `finished` excludes speaker; `.then()` chains remain; route files still contain many `console.error` calls; parsing is still duplicated in `TeamPage` and ad hoc backend blocks. | Add Chrome/Edge/Firefox recovery steps, align speaker completion state, finish async/shared-parser refactors, and use one centralized error middleware/logger. |
| P2 | **Status and candidate-safe response rules remain distributed.** Only some routes use allowlists; status strings and transitions are repeated across services/pages. | Add central status enums/transition guards and explicit candidate DTO mappers for every domain. |
| P3 | **Regression coverage does not protect the new flows.** No browser suite covers the dirty-worktree features, and the existing API script does not match the new scheduling contract. | Update API fixtures and add E2E coverage for manager, candidate, admin, tenant isolation, archive/delete, role movement, monthly occurrences, outcomes, refresh races, files, and cancel/reschedule. |

## July specification status

| IDs | Current status |
|---|---|
| SCR-FLOW-001 | Broken |
| SCR-FLOW-002 | Broken / partial |
| SCR-FLOW-003 | Broken |
| SCR-FLOW-004 | Implemented but unverified end to end |
| SCR-FLOW-005 | Partial |
| SCR-FLOW-006 | Partial |
| SCR-FLOW-007 | Partial |
| SCR-FLOW-008 | Broken |
| SCR-FLOW-009 | Partial / migration unsafe |
| SCR-FLOW-010 | Schema only |
| SCR-FLOW-011 | Broken |
| SCR-FLOW-012 | Broken / partial |
| SCR-FLOW-013 | Schema/worker only |
| SCR-FLOW-014 | Partial |
| SCR-FLOW-015 | Partial |
| SCR-FLOW-016 | Partial |
| SCR-FLOW-017 | Pending |
| SCR-FLOW-018 | Partial, not visually verified |
| SCR-FLOW-019 | Pending |
| SCR-FLOW-020 | Broken / partial |
| SCR-FLOW-021 | Partial |
| SCR-FLOW-022 | Broken / partial |
| SCR-FLOW-023 | Pending |
| SCR-FLOW-024 | Pending |

## June audit recheck

Verified present in code: magic-link consumption and mandatory expiry, fail-closed interview scope, atomic report/scorecard/job upserts, pending-job limit, LLM prompt caps/fallback, stable report path, deletion error handling, external-report label, context title, exam confirmation/timer, consent expiry check, AI retry state, Done-page close guidance, report 404, resend failure status, removal of cosmetic 2FA, migration `006`, and `backend/.env.example`.

Still wrong or regressed: source-bundled demo credentials, incomplete device permission guidance/state, remaining promise chains, remaining route `console.error` usage, and incomplete shared parsing.

## User-flow perspective

- **New visitor:** Login page renders, but a demo-account click cannot pass authentication because the backend fails during startup.
- **Manager:** Even after startup is repaired, client role assignment, outcome rounds, monthly assignment, permanent delete, cancel/reschedule UI, and some storage paths are not reliable.
- **Candidate:** Monthly assessment loading uses invalid SQL; occurrence availability is not generated; launch windows do not consistently use the new server contract; join actions are fragmented.
- **Admin:** No usable frontend route or login redirect exists, and the admin bundle/API contract is broken.

## Recommended repair order

1. Restore backend startup and frontend build/lint.
2. Remove source credentials and repair tenant-scoped child authorization.
3. Repair and dry-run migrations.
4. Fix mandate delete, role assignment, outcome-round contracts, and storage paths.
5. Implement monthly occurrences/outbox/idempotency as one coherent transaction.
6. Finish scheduling/window/join/session contracts.
7. Add API and browser regression tests before visual polish.
