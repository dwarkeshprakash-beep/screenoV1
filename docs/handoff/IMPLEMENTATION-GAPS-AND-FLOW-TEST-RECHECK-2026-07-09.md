# Screeno Implementation Gaps and Flow Test — Recheck

Historical note: this handoff captured the July 9 state and is now superseded by `docs/open-issues.md` and current test results. Several failures listed here have since been fixed.

Date: 2026-07-09  
Branch: `dev`  
Baseline: `1ea936c` plus the current dirty worktree  
Compared with: `IMPLEMENTATION-GAPS-AND-FLOW-TEST-2026-07-09.md`

## Release verdict

**Do not merge or deploy yet.**

The project now builds and starts, which is substantial progress. However, candidate magic links return HTTP 500, monthly assessment cancellation fails against the database, and several core manager/candidate contracts remain incompatible.

## Fresh verification results

| Check | Result | Notes |
|---|---|---|
| Backend JavaScript syntax | PASS | 90/90 files |
| Backend focused unit tests | PASS | 9/9; still helper-level coverage |
| Backend startup and `/health` | PASS | Server and outbox worker start |
| Frontend production build | PASS | Vite build completes |
| Frontend lint | FAIL | 23 errors, 2 warnings |
| Integrated API regression | FAIL | Reaches monthly cancellation, then receives 500 instead of 200 |
| Browser manager login | PASS | Demo manager reaches `/manager/dashboard` |
| Magic-link preview | FAIL | HTTP 500 |
| Magic-link claim | FAIL | HTTP 500 |
| Full manager/candidate E2E | FAIL / incomplete | Critical flows below prevent completion |

The API regression cleanup completed successfully. Email delivery was suppressed with the console test transport.

## Fixed since the previous report

- Backend reserved-word syntax failure is fixed.
- Backend starts and health check succeeds.
- Frontend production build succeeds.
- Hardcoded fallback demo credentials were removed from `LoginPage.jsx`.
- Legacy resume upload compatibility was restored.
- The most obvious unresolved frontend symbols were removed.
- Legacy client-interview record routes now verify that the client-team row belongs to the mandate.
- Setup now includes migrations `009` through `014`; several schema statements were made more rerunnable.
- Monthly assignment now uses a database transaction and has outbox/occurrence scaffolding.

## Remaining implementation list

| Priority | Problem | Correct implementation |
|---|---|---|
| P0 | **All emailed candidate magic links are broken.** Auth routes call `authService.previewMagicLink()` and `claimMagicLink()`, but neither function exists or is exported. Both endpoints return 500. | Implement a read-only preview that validates token/expiry/window without consuming it, and a claim operation that atomically consumes the email token and issues the scoped session/launch token. Add replay and concurrent-claim tests. |
| P0 | **Monthly modal and service still disagree.** The modal sends `available_from` and `due_at`; the service only reads `assessment_date` or `scheduledAt`. Real UI assignment therefore returns “Assessment date is required.” | Accept the documented window fields, validate `due_at > available_from`, preserve timezone, and use the same DTO in frontend, route, service, tests, and email payloads. |
| P0 | **Monthly occurrence creation is logically incorrect.** A multi-month plan creates only one occurrence/interview. The raw interview insert writes `team_members.id` into `interviews.internal_user_id` instead of the candidate `users.id`. | Loop once per plan month, use `member.user_id`, create one occurrence and one interview per month, and verify that each interview appears for the correct candidate. |
| P0 | **Monthly outbox token generation uses nonexistent columns.** The worker updates `magic_token_hash` and `magic_token_expires`, while the interview schema/repository use `token` and `token_expires`. | Use the existing token columns/repository method consistently, hash the raw token once, bind expiry to the occurrence window, and integration-test worker delivery. |
| P0 | **Monthly cancellation fails transactionally.** Cancellation writes outbox status `cancelled`, but the database constraint allows only `pending`, `claimed`, `finished`, and `failed`. The API regression receives HTTP 500. | Either add a supported `cancelled` state in a migration and worker logic or mark cancelled jobs as a permitted terminal state. Test cancellation of pending, claimed, completed, and future occurrence jobs. |
| P0 | **Candidate-to-role assignment still has a frontend/backend payload mismatch.** Backend now correctly requires per-user role objects and checks headcount; frontend still sends primitive IDs plus one top-level `requirementId`. | Send `userIds: [{ userId, requirementId }]` from both add-candidate paths, or define a new explicit bulk DTO. Add API/UI tests for capacity, invalid role, duplicate candidate, and move-role capacity. |
| P0 | **Outcome rounds remain nonfunctional.** Routes still omit required `mandateId` arguments when calling repository list/create/update/publish/unpublish. The manager “Rounds” button only sets unused state and renders no modal. | Align every route signature, scope through mandate and client-team IDs, render the rounds modal, and test create/edit/publish/unpublish plus the candidate-safe view. |
| P0 | **Permanent mandate delete still queries nonexistent schema.** It now uses `db.transaction`, but still references `reports.report_url`, `reports.job_id`, and several `context_type/context_id` columns that are absent. | Rewrite deletion and impact queries around `interviews.client_template_id`, `reports.interview_id`, `report_jobs.interview_id`, and `reports.pdf_url`; test rollback, impact counts, and storage cleanup. |
| P1 | **Candidate monthly page uses invalid company SQL.** It joins `companies.manager_id`, but `companies` has no such column. | Join `team_members.manager_id -> users.id -> users.company_id -> companies.id`, and add an authenticated candidate API test. |
| P1 | **Human interview join is broken in the frontend contract.** The API returns `{ data: { meetingUrl } }`, but the overview reads `response.meetingUrl`. It also requests the endpoint with interview-session auth even when launched from the normal candidate dashboard. | Use normal candidate auth for dashboard join, read `response.data.meetingUrl`, enforce server window/status checks, and share the join action across overview/interview pages. |
| P1 | **Scheduling window logic still ignores the new authoritative fields.** Frontend and backend helpers derive availability from `scheduled_at + duration`; mandate scheduling sends raw `datetime-local`; past dates are accepted; calendar ignores its `week` argument. | Make `available_from`, `due_at`, `duration_minutes`, status, and server time authoritative; serialize UTC everywhere; reject past windows; query only the requested week. |
| P1 | **Report URLs will expire permanently.** Report generation stores a one-hour signed URL in `reports.pdf_url`. | Store the stable storage path in the database and generate a fresh signed URL only in authorized response DTOs. |
| P1 | **Migrations are improved but still unsafe to rerun/deploy.** Migration `010` duplicates backfilled assets; `014` recreates its index without `IF NOT EXISTS`; the latest-migration runner splits SQL text manually, runs outside one transaction, and ignores some schema errors. | Add guarded backfills/unique constraints, make every index idempotent, and use a migration ledger plus one transaction per migration without swallowing errors. |
| P1 | **Admin remains unreachable.** Admin pages build, but `App.jsx` defines no admin routes, login rejects roles other than manager/candidate, and lint reports all admin lazy imports unused. | Add an authenticated `/admin` layout and redirect, define the role migration safely, and add admin authorization/navigation tests before exposing the pages. |
| P1 | **Refresh/session lifecycle remains partial.** Browser locking/families exist, but route bootstrap does not validate access-token expiry, refresh lifetime is hardcoded, and concurrency/reuse cases lack tests. | Add an auth bootstrap state machine, use `REFRESH_EXPIRES_IN`, and test multi-tab rotation, expiry, logout, and reuse detection. |
| P2 | **Frontend lint still fails.** Remaining errors include unused admin pages/icons/state and an async Promise executor in `api.js`. | Reach zero lint errors/warnings and refactor refresh coordination without `new Promise(async ...)`. |
| P2 | **Original June cleanup remains incomplete.** Device instructions are not browser-specific; `finished` still excludes speaker; promise chains remain; route files contain many `console.error` calls; `TeamPage` still duplicates array parsing. | Finish the original audit items using shared helpers, centralized logging/error middleware, and browser-specific recovery copy. |
| P2 | **Site-wide UX/test coverage is incomplete.** Admin still uses native dialogs, manager notification switches remain local-only, shared interview cards/status transitions are not centralized, and no browser regression suite exists. | Use shared accessible dialogs/notices, remove false-signal settings, centralize status/DTO contracts, and add manager/candidate/admin browser tests. |
| P3 | **Repository hygiene is not clean.** Visual Studio state and `frontend/lint.txt` are present in the dirty worktree. | Remove generated/IDE artifacts from the intended patch and update `.gitignore` where appropriate. |

## July flow status recheck

| IDs | Status |
|---|---|
| SCR-FLOW-001 | Partial; legacy child scoping improved, outcome routes still broken |
| SCR-FLOW-002 | Broken |
| SCR-FLOW-003 | Broken frontend/backend contract |
| SCR-FLOW-004 | Implemented; manager login smoke-tested |
| SCR-FLOW-005 | Partial |
| SCR-FLOW-006 | Broken join contract |
| SCR-FLOW-007 | Partial |
| SCR-FLOW-008 | Broken |
| SCR-FLOW-009 | Partial |
| SCR-FLOW-010 | Broken; one occurrence only |
| SCR-FLOW-011 | Broken DTO contract |
| SCR-FLOW-012 | Broken; cancellation returns 500 |
| SCR-FLOW-013 | Partial scaffolding; idempotency/consolidation incomplete |
| SCR-FLOW-014 | Partial |
| SCR-FLOW-015 | Partial |
| SCR-FLOW-016 | Partial |
| SCR-FLOW-017 | Pending |
| SCR-FLOW-018 | Partial, not fully visually verified |
| SCR-FLOW-019 | Partial; availability still uses legacy derivation |
| SCR-FLOW-020 | Broken/partial |
| SCR-FLOW-021 | Partial |
| SCR-FLOW-022 | Broken/partial |
| SCR-FLOW-023 | Pending |
| SCR-FLOW-024 | Partial test scaffolding, but regression suite fails |

## June audit recheck

Still correctly implemented: fail-closed interview scope, mandatory token expiry, atomic upserts, pending-job limit, LLM caps/fallback, stable report object path, storage deletion error handling, external-report label, context title, exam confirmation/configured timer, consent expiry check, AI retry state, Done-page guidance, response status fixes, cosmetic 2FA removal, migration `006`, and `.env.example`.

Now fixed: source-bundled fallback demo credentials.

Still incomplete: device permission/speaker state, route logging cleanup, promise-chain cleanup, and full shared parsing. The newer preview/claim refactor also regressed the otherwise-correct magic-link flow.

## User-flow result

- **Manager:** Can sign in and reach the dashboard. Client role assignment, outcome rounds, permanent delete, and monthly assignment/cancellation are not reliable.
- **Candidate:** Email links cannot be previewed or claimed. Monthly plans query an invalid company column, generated interview ownership is wrong, and human join uses the wrong response/auth contract.
- **Admin:** Pages compile but there is no reachable authenticated admin application.

## Recommended repair order

1. Restore preview/claim magic-link service methods and tests.
2. Repair the complete monthly transaction, occurrence loop, token/outbox, and cancellation contract.
3. Align role-assignment and outcome-round frontend/backend DTOs.
4. Rewrite mandate deletion using the real schema.
5. Fix candidate monthly and human-join APIs.
6. Finish scheduling/storage/migration/session correctness.
7. Reach zero lint errors and add passing API/browser regression suites.
