# Screeno Flow Audit and Implementation Specification

Date: 2026-07-09  
Baseline commit: `1ea936c` (`dev`)  
Implementation review: current dirty worktree on `dev` after the Phase 1-3 handoff attempts  
Scope: manager portal, candidate portal, client mandates, monthly assessments, scheduling, resumes, authentication, and shared UI behavior.

This is an implementation handoff and a review of the attempted fixes. The original issue sections remain the acceptance contract. The status audit below is authoritative for what is currently complete, partial, broken, or pending. Product code was not changed during this review; only this handoff document was updated.

## Current Implementation Review

### Release decision

**Do not merge, deploy, or run migrations `009` through `015` in production in the current state.**

The attempted implementation contains useful scaffolding, but the frontend does not compile and several core backend flows call missing methods or use incompatible function signatures. A JavaScript syntax pass is not sufficient because these failures occur at runtime.

### Verification snapshot

| Check | Result | Notes |
|---|---|---|
| Backend unit tests | PASS | `9/9`; these are the pre-existing focused unit tests and do not cover the new flows |
| Backend JavaScript syntax | PASS | `78` files parsed with `node --check` |
| Frontend lint | FAIL | `28` errors and `3` warnings |
| Frontend production build | FAIL | Parse error in `CandidateProfilePage.jsx:104` |
| API regression | NOT RUN | Requires a migrated test database and running backend |
| Browser/E2E regression | NOT RUN | Frontend cannot build; no browser suite exists |
| Migration dry run | NOT RUN | Migrations contain known blockers listed below |

Commands used:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' test
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run lint
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run build
```

### Immediate release blockers

1. **Frontend source is syntactically broken.** `frontend/src/pages/candidate/CandidateProfilePage.jsx` contains a duplicated import/component body beginning around line 104. Vite stops there.
2. **Mandate candidate add/update/delete routes call repository methods that do not exist.** `client-template.routes.js` calls `clientTeamRepo.getByUserAndMandate`, `create`, `update`, and `delete`; `client-team.repository.js` exports `add`, `updateRequirement`, and `remove` instead.
3. **Selected mandate role is discarded.** The frontend submits `{ userIds, requirementId }`, while the backend reads `requirement_id` only from objects inside `userIds`. Even after the missing-method crash is fixed, candidates would remain unassigned.
4. **The advertised move-role endpoint is missing.** The frontend calls `PATCH /:id/team/:ctId/requirement`, but no backend route implements it.
5. **Human interview join is still broken.** `ConsentPage.jsx` calls `api.joinCandidateInterview`, but no such API client function or backend endpoint exists.
6. **Client outcome round routes and repository signatures disagree.** For example, `create()` expects `(clientTeamId, mandateId, managerId, data)` but the route passes `(ctId, managerId, body)`. List, update, publish, and unpublish have similar mismatches.
7. **Monthly occurrences are not created.** Migration/repository/UI scaffolding exists, but `monthly-assessment.service.js` still creates one enrollment and one interview for the whole plan.
8. **Permanent mandate delete uses SQL columns that do not exist and is not transactional.** `mandate-lifecycle.service.js` queries fields such as `reports.report_url`, `reports.job_id`, `report_jobs.context_type`, and `email_deliveries.context_type`. The current schema is interview-ID based. It also issues `BEGIN`/`COMMIT` through pooled `db.query`, so statements are not guaranteed to share one connection; use `db.transaction(...)`.
9. **Report PDF generation was regressed.** `interview.service.js` still calls `storageService.uploadReport(...)`, but `storage.service.js` now exports `uploadReportAsset(...)`.
10. **Frontend mandate and monthly pages contain unresolved symbols.** Current lint failures include `OutcomeRoundsModal`, `setSelectedTemplateId`, `loadTemplates`, and `Ban`.
11. **New migrations are not production-safe.** See the migration review below.
12. **No tests were added for any new cross-portal behavior.** The passing backend tests do not exercise archive/delete, roles, monthly occurrences, outcome rounds, refresh rotation, resume snapshots, or scheduling windows.

### Status definitions

- **Implemented:** code matches the acceptance contract; still requires final integrated regression testing.
- **Partial:** useful pieces exist, but one or more acceptance criteria are missing.
- **Broken:** an attempted path cannot execute correctly because of compile, contract, schema, or runtime errors.
- **Pending:** the requested behavior has not been implemented.

## Recommended Product Decisions

The implementation should use these decisions unless product explicitly overrides them:

1. A manager may view the basic profile and current resume of any user in the same organization. Interview transcripts, reports, and private notes remain visible only when that manager owns the interview.
2. A candidate belongs to one requirement profile at a time within a mandate. Moving the candidate to another role is supported. Adding one candidate to several roles would require a separate junction table and is out of scope.
3. Candidate-facing client outcomes contain only published outcome and feedback fields. Manager notes are private.
4. Monthly assessment subjects are reusable templates. A multi-month plan creates one occurrence per month, and each occurrence owns one interview.
5. Assessment availability and assessment duration are different concepts:
   - `available_from`: when the candidate may start.
   - `due_at`: latest time the candidate may start.
   - `duration_minutes`: time allowed after starting.
6. Store timestamps as UTC. Send an ISO timestamp with an offset from the browser and preserve an IANA timezone such as `Asia/Kolkata` for display.
7. A mandate can be archived normally and permanently deleted through an explicit destructive confirmation. Permanent deletion removes mandate-owned data but never deletes a candidate's main profile resume.
8. Cancelled monthly plans disappear from active plan/calendar views. Completed history remains available in a history view.

## Priority Summary

| ID | Priority | Current status | Issue / exact remaining work |
|---|---|---|---|
| SCR-FLOW-001 | P0 | **Broken** | Scoped helpers were started, but legacy outcome routes remain unscoped and team/round routes call incompatible repository methods. Fix every parent-child lookup and add cross-company API tests before any feature work. |
| SCR-FLOW-002 | P1 | **Broken / partial** | Archive/restore and delete UI scaffolding exist. Permanent-delete SQL and transaction handling are invalid; impact counts are incomplete; storage cleanup is unverified. |
| SCR-FLOW-003 | P1 | **Broken** | Role selectors exist, but the payload contract discards the role, backend methods are missing, move-role route is absent, and capacity is not enforced. |
| SCR-FLOW-004 | P1 | **Implemented, unverified** | Company-scoped profile routes and `/manager/organization/:userId` exist. Browse can navigate to same-company profiles and interview history remains manager-scoped. Add API tests and browser coverage. |
| SCR-FLOW-005 | P1 | **Partial** | Shared serialization is used in the main and monthly modals, but mandate scheduling still sends raw `datetime-local`; backend accepts timezone-less/past timestamps; no organization timezone exists; email formatting is not consistently explicit. |
| SCR-FLOW-006 | P1 | **Broken** | `meeting_url` schema scaffolding exists, but mandate scheduling still stores the Meet URL in `location`, candidate DTOs omit it, and `joinCandidateInterview` has no client/backend implementation. No shared action exists across all candidate pages. |
| SCR-FLOW-007 | P1 | **Partial** | Preview/claim separation, window columns, and reschedule backend scaffolding exist. Token expiry is still hardcoded to seven days, expired notification dedupe is incomplete, Schedule page does not deep-link/reschedule, and provider events are not updated/cancelled. |
| SCR-FLOW-008 | P1 | **Broken** | Round schema, candidate page, and manager UI shell exist. Manager round endpoints cannot call the repository correctly; old single-record endpoints remain unsafe; explicit-null clearing still uses `COALESCE` in the legacy repository. |
| SCR-FLOW-009 | P1 | **Broken / partial** | Versioned resume assets and signed URLs were started. Candidate Profile currently breaks the build; candidate mandate links can still receive raw storage paths; migrations backfill public URLs as storage paths; manager/candidate history and replacement rules are incomplete. |
| SCR-FLOW-010 | P1 | **Schema/UI only** | Occurrence table and repository helpers exist, but assignment service never creates occurrences or one interview per month. Duplicate repository function definitions must be removed. |
| SCR-FLOW-011 | P1 | **Broken / partial** | Manager inputs and candidate occurrence display exist, but occurrence data is never generated. The modal has an undefined `assessmentDate` dependency, and due/start enforcement is not integrated end to end. |
| SCR-FLOW-012 | P1 | **Broken / partial** | Cancel/history UI was started, but cancellation still targets the legacy enrollment interview only. Future occurrences are not revoked, historical consistency is not guaranteed, and `MonthlyAssessmentPage.jsx` references undefined `Ban`. |
| SCR-FLOW-013 | P1 | **Schema/worker only** | Idempotency and outbox tables plus a worker exist, but assignment does not use a transaction, request keys, occurrence creation, or outbox jobs. The old split guidance path remains active. |
| SCR-FLOW-014 | P1 | **Partial** | Refresh token families, rotation, a cross-tab lock, and logout without access middleware exist. There is no bootstrap auth state machine; expiry remains hardcoded; cookie policy is not deployment-aware; `REFRESH_EXPIRES_IN` is unused; no concurrency tests exist. |
| SCR-FLOW-015 | P2 | **Partial** | `ApiError` and some scoped notices exist, but mutation behavior is inconsistent and several pages still replace valid content with global error/loading states. Full-page refresh/redirect paths need a repository-wide audit after auth is stable. |
| SCR-FLOW-016 | P2 | **Partial** | `ConfirmDialog` and improved `Modal` exist for some manager paths. It is not site-wide; newly added admin pages still use `window.confirm` and `alert`; accessibility has not been tested. |
| SCR-FLOW-017 | P2 | **Pending** | Manager Team Overview viewport ownership was not implemented or visually verified. |
| SCR-FLOW-018 | P2 | **Partial** | Candidate shell heights were adjusted, but nested `minHeight`/body scrolling remains and the horizontal tab scrollbar is still visible. Build failure prevented desktop/mobile verification. |
| SCR-FLOW-019 | P2 | **Pending** | No shared candidate interview card/action component exists. Availability still derives from `scheduled_at + duration` in some pages instead of server `available_from`, `due_at`, and `serverNow`. |
| SCR-FLOW-020 | P2 | **Partial** | Create/edit role profiles and duplicate/min-max validation exist. Candidate add/move/capacity is broken, deleting the final profile leaves stale mandate summary/headcount, and status-to-capacity rules are not implemented. |
| SCR-FLOW-021 | P2 | **Partial** | Backend cancel/reschedule endpoints exist. Past and timezone-less dates are accepted; duplicate submission protection is absent; Schedule page has no cancel/reschedule/deep-link controls; calendar ignores the requested week; Google event sync and candidate cancellation notices are missing. |
| SCR-FLOW-022 | P2 | **Broken / partial** | Signed URL helpers and immutable paths exist, but bucket privacy is not enforced in code, report upload now calls a removed method, report downloads are not consistently signed, cleanup is best-effort only, and migration backfills are unsafe. |
| SCR-FLOW-023 | P2 | **Pending** | No central status enum/transition module or candidate DTO allowlist exists across domains. Status strings and safe-field selection remain distributed across routes and pages. |
| SCR-FLOW-024 | P3 | **Pending** | No Playwright/browser suite or new integration tests were added. Existing `9/9` tests do not cover these flows. |

## Migration Review

The new files are untracked and their numbering implies an all-at-once rollout. They must be repaired and tested on a disposable copy of the current schema before deployment.

| Migration | Review status | Required correction |
|---|---|---|
| `009_flow_integrity.sql` | Partial | Validate existing orphan data, constraints, and rollback behavior. The application routes still do not consistently honor the new relationship. |
| `010_resume_assets_and_delete.sql` | Unsafe | Add `IF NOT EXISTS`, foreign keys/indexes, and deterministic backfill guards. Do not store an existing public URL in `storage_path`; migrate/copy the object or mark it as legacy URL metadata. |
| `011_interview_windows_and_locations.sql` | Unsafe to rerun | Make the check constraint idempotent and define the compatibility/backfill rule for `scheduled_at`, `available_from`, and `due_at`. |
| `012_monthly_occurrences.sql` | Unused by service | Keep only after assignment/cancel/outbox services use it transactionally. Scope idempotency keys appropriately and define retry semantics. |
| `013_client_outcome_rounds.sql` | Runtime integration broken | Repair route/repository contracts, parent scoping, first-round migration, and uniqueness/concurrency behavior before applying. |
| `014_refresh_families.sql` | Unsafe to rerun | Add idempotent column/index changes and test rotation against existing refresh-token rows. |
| `015_admin_role_support.sql` | **Out of scope and invalid** | Remove from this flow branch or redesign separately. It inserts nonexistent `companies.industry`/`website` columns, embeds default credentials, contains a questionable password hash, and adds backend admin APIs while frontend routes are not mounted. |

## Required Repair Order

Follow this order so later testing is meaningful:

1. **Restore a green baseline.**
   - Remove the duplicated `CandidateProfilePage` body.
   - Resolve every frontend lint error and undefined symbol.
   - Restore the report storage method contract.
   - Remove temporary root scripts (`fix*.js`, `apply_routes_fix.js`) after confirming no required changes are stranded in them.
   - Quarantine the unrelated admin implementation and migration from this flow branch.
2. **Close P0 authorization and data-contract regressions.**
   - Normalize client-team repository names and route calls.
   - Scope all team, outcome, round, resume, and requirement access by mandate and company.
   - Add two-company negative API tests.
3. **Finish mandate lifecycle and role assignment.**
   - Rewrite permanent deletion around `db.transaction(tx => ...)` and the real schema.
   - Standardize the add payload, implement move-role, validate company/role/capacity, and preserve selected role.
4. **Finish scheduling and human join.**
   - Use strict ISO timestamps everywhere, store/display timezone, reject past dates, calculate token expiry from `due_at`, expose candidate-safe `meeting_url`, and implement the join endpoint/action.
   - Add provider event update/cancel behavior.
5. **Implement monthly occurrences as the source of truth.**
   - Assignment transaction creates enrollment, occurrences, interviews, and outbox jobs.
   - Cancellation revokes future occurrences/interviews but preserves completed history.
   - Candidate and manager views read occurrences, not derived `month_progress`.
6. **Repair outcomes and resumes.**
   - Fix round signatures and explicit-null updates.
   - Verify candidate DTO privacy.
   - Complete immutable resume snapshots, metadata/history UI, signed manager/candidate downloads, and report PDF lifecycle.
7. **Stabilize auth, UI refresh, dialogs, and layout.**
   - Add auth bootstrap state, configurable expiry/cookies, refresh concurrency tests, scoped mutation state, shared dialogs, and viewport ownership.
8. **Add regression coverage before calling any item complete.**
   - Repository/API integration tests for destructive and cross-tenant paths.
   - Browser tests for manager-to-candidate flows, time windows, monthly cancellation, outcome publication, resume snapshots, and refresh expiry.
   - Run lint, build, backend tests, API regression, migration dry run, and desktop/mobile browser checks.

---

## SCR-FLOW-001 [P0] Client-Mandate Child Authorization Gaps

### Observed behavior

Several client-mandate routes verify that the manager owns the mandate but do not verify that the child row belongs to that mandate:

- `PATCH /api/templates/client/:id/team/:ctId` updates a client-team row by `ctId` only.
- `GET /api/templates/client/:id/team/:ctId/client-interview` reads a client outcome by `ctId` only.
- `POST /api/templates/client/:id/team/:ctId/client-interview` reads or updates by `ctId` without checking its mandate.
- `POST /api/templates/client/:id/team` accepts a `requirementId` without confirming that it belongs to `:id`.

A manager who owns any mandate could use a guessed child ID from another mandate to read or update data.

### Evidence

- `backend/src/routes/client-template.routes.js:440-469`
- `backend/src/routes/client-template.routes.js:472-484`
- `backend/src/routes/client-template.routes.js:667-703`
- `backend/src/repositories/client-team.repository.js:50-63`
- `backend/src/repositories/client-interview-records.repository.js:32-60`

### Required implementation

1. Add repository methods scoped by both parent and child:
   - `getByIdForMandate(clientTeamId, mandateId)`
   - `updateStatusForMandate(clientTeamId, mandateId, ...)`
   - `getOutcomeForMandate(clientTeamId, mandateId)`
   - `updateOutcomeForMandate(recordId, clientTeamId, mandateId, ...)`
2. Before every child operation, verify:
   - mandate belongs to `req.user.id`;
   - client-team row belongs to mandate;
   - user on the client-team row belongs to `req.user.companyId`;
   - requirement belongs to the same mandate.
3. Return `404` for an inaccessible parent/child combination. Do not reveal whether a foreign child ID exists.
4. Add database foreign keys where migration safety allows it. At minimum, add indexes and application-level guards.

### Affected files

- `backend/src/routes/client-template.routes.js`
- `backend/src/repositories/client-team.repository.js`
- `backend/src/repositories/client-interview-records.repository.js`
- `backend/src/repositories/client-mandate-requirements.repository.js`
- new migration, recommended `backend/migrations/009_flow_integrity.sql`

### Acceptance criteria

- A manager cannot read or mutate a client-team row from another mandate or organization.
- A requirement ID from another mandate is rejected.
- All valid existing manager flows still succeed.

### Tests

- API test with two companies, two managers, two mandates, and different `ctId` values.
- Attempt each child read/write using the other manager's IDs; expect `404`.
- Submit a foreign `requirementId`; expect `400` or `404` and no row mutation.
- Verify legitimate same-mandate operations still return `2xx`.

---

## SCR-FLOW-002 [P1] Safe Mandate Archive and Permanent Delete

### Observed behavior

There is no mandate delete route, repository method, API client method, or UI action. The database intentionally has no foreign keys, so deleting only `client_templates` would leave orphaned requirement profiles, client-team rows, outcomes, interviews, reports, transcripts, jobs, and email-delivery rows.

### Evidence

- `backend/src/repositories/client-template.repository.js:4-70`
- `backend/src/routes/client-template.routes.js:160-253`
- `frontend/src/services/api.js:256-295`
- `frontend/src/pages/manager/ClientInterviewsPage.jsx:1217-1228`
- `backend/migrations/001_initial_schema.sql`
- `backend/migrations/007_client_teams.sql`

### Required implementation

1. Add `archived_at` to `client_templates`. Default mandate lists exclude archived rows; add an Archived filter.
2. Add `POST /api/templates/client/:id/archive` and restore support.
3. Add `DELETE /api/templates/client/:id` for permanent deletion.
4. Before deletion, calculate and return an impact preview:
   - assigned candidates;
   - scheduled/in-progress/completed interviews;
   - reports and report jobs;
   - client outcome records;
   - mandate-specific resume assets.
5. Block permanent deletion while an interview or report job is `in_progress`. Offer archive/cancel first.
6. Use a database transaction and delete in dependency order:
   - lock/select mandate and scoped interview IDs;
   - delete email deliveries;
   - delete transcripts;
   - delete reports;
   - delete scorecards;
   - delete report jobs;
   - delete interviews;
   - delete client interview records;
   - delete client-team rows;
   - delete requirement profiles;
   - delete the mandate.
7. Queue storage cleanup after the transaction for report PDFs and mandate-specific resume objects. Never delete a main profile resume merely because its URL was previously selected for a mandate.
8. Add a custom confirmation dialog showing impact counts. Permanent delete requires typing the client/mandate name.

### Affected files

- `backend/src/routes/client-template.routes.js`
- `backend/src/repositories/client-template.repository.js`
- related report/interview/email repositories
- `backend/src/services/storage.service.js`
- `frontend/src/services/api.js`
- `frontend/src/pages/manager/ClientInterviewsPage.jsx`
- `frontend/src/components/shared/ConfirmDialog.jsx` (new)
- migration `009_flow_integrity.sql`

### Acceptance criteria

- Archive hides the mandate from active lists without deleting history.
- Restore returns it to the active list.
- Permanent delete cannot occur without explicit confirmation.
- Permanent delete leaves no mandate-owned database rows or storage objects.
- Main candidate profiles and main resumes remain intact.
- Existing emailed links for deleted interviews fail cleanly as unavailable.

### Tests

- Repository integration test creates a fully populated mandate graph, deletes it, and asserts zero child rows.
- Test deletion rollback by forcing a failure in the middle of the transaction.
- Test that shared/main resume assets remain.
- E2E test confirmation cancel, wrong typed name, correct typed name, and archived filter.

---

## SCR-FLOW-003 [P1] Explicit Candidate-to-Role Assignment

### Observed behavior

The browse-candidate action modal shows a suggested role but has no role selector. Adding a candidate silently uses `candidate.matching_requirements[0]`, otherwise `requirements[0]`. This is the reported "always adds to the first role" bug.

Bulk Add Prospects has one optional role for every selected candidate and permits no profile at all. The backend also permits a null or foreign requirement and does not enforce headcount.

### Evidence

- `frontend/src/pages/manager/ClientInterviewsPage.jsx:626-659`
- `frontend/src/pages/manager/ClientInterviewsPage.jsx:1181-1190`
- `frontend/src/pages/manager/ClientInterviewsPage.jsx:498-565`
- `backend/src/routes/client-template.routes.js:440-469`
- `backend/src/repositories/client-team.repository.js:4-13`

### Required implementation

1. Pass mandate requirements into `CandidateActionModal`.
2. If a mandate has:
   - zero profiles: allow an unassigned candidate;
   - one profile: preselect it and show it clearly;
   - multiple profiles: require the manager to choose a role before Add is enabled.
3. Mark AI matching as a suggestion only. Never submit the first suggestion automatically.
4. Show each role's experience band and capacity: `filled / headcount`.
5. Validate on the backend that the requirement belongs to the mandate and has capacity.
6. Add `PATCH /:id/team/:ctId/requirement` so a manager can move a candidate to another role without removing them.
7. Decide which statuses consume capacity. Recommended: `prospect`, `shortlisted`, and `interviewing` consume capacity; `rejected`, `withdrawn`, and `hired` do not.
8. For bulk add, require one selected role for the entire batch or provide a per-candidate mapping step. Reject batches larger than remaining capacity.

### Acceptance criteria

- A multi-role mandate never adds a candidate until a role is selected.
- The selected role is visible in manager and candidate portals.
- A manager can reassign the candidate to another role.
- Foreign, full, or deleted role IDs cannot be submitted.

### Tests

- Component test: Add disabled with two roles and no selection.
- API test: valid role, foreign role, full role, deleted role, and null role.
- E2E: create two roles, add candidate to the second, verify both portals show the second.

---

## SCR-FLOW-004 [P1] Same-Organization Profile Access

### Observed behavior

`MemberProfilePage` is keyed by `team_members.id`, and backend profile methods require `manager_id`. Candidate browse results outside the manager's team have no `team_member_id`, so View profile is disabled even when the user belongs to the same company.

### Evidence

- `frontend/src/pages/manager/ClientInterviewsPage.jsx:652-657`
- `frontend/src/pages/manager/ClientInterviewsPage.jsx:1176-1179`
- `frontend/src/App.jsx:60-61`
- `backend/src/routes/team.routes.js:67-75`
- `backend/src/services/team.service.js:13-17`
- `backend/src/repositories/team-member.repository.js:37-45`

### Required implementation

1. Add a company-scoped endpoint keyed by user ID, for example:
   - `GET /api/team/organization-users/:userId`
   - `GET /api/team/organization-users/:userId/interviews`
2. The profile endpoint must require `users.company_id = req.user.companyId`.
3. Return basic organization profile, resume metadata, tags, availability, and whether the user is currently in the manager's team.
4. By default, interview history returns only interviews owned by the requesting manager. Do not expose another manager's transcripts/reports without a separate organization-wide permission.
5. Add route `/manager/organization/:userId` and reuse profile presentation with a user-ID data source.
6. Candidate browse cards always enable View profile for same-company users.
7. If appropriate, offer Add to my team as a separate action. Viewing a profile must not silently alter team membership.

### Acceptance criteria

- A manager can view any non-deleted same-company user's basic profile.
- A manager cannot view a user in another company.
- Private reports owned by another manager are not exposed.
- Browse Candidate can open the profile before adding the user to the manager's team.

### Tests

- API same-company and cross-company access tests.
- E2E from Client Mandate > Candidates > Other organization members > View profile.
- Verify no team-member row is created by viewing.

---

## SCR-FLOW-005 [P1] Timezone-Safe Scheduling

### Observed behavior

All three scheduling surfaces send the raw value from `<input type="datetime-local">`. That value has no offset. The backend calls `new Date(value)`, so the server's timezone can change the intended instant. Emails format dates in the server timezone, while manager and candidate portals format them in each browser timezone.

This explains a manager/email time matching while a candidate portal displays another time, or a link opening earlier/later than expected.

### Evidence

- `frontend/src/pages/manager/ClientInterviewsPage.jsx:927-929`
- `frontend/src/components/manager/MonthlyAssessmentAssignModal.jsx:166-170`
- `frontend/src/components/manager/ScheduleModal.jsx:333`
- `backend/src/routes/client-template.routes.js:553-559`
- `backend/src/services/monthly-assessment.service.js:111-114`
- `backend/src/services/schedule.service.js:51-54`
- `backend/src/services/email.service.js:199-203`
- `backend/src/services/email.service.js:253-261`
- `frontend/src/utils/helpers.js:23-29`

### Required implementation

1. Add a shared frontend serializer:
   - input: `datetime-local` string;
   - output: `new Date(localValue).toISOString()`;
   - include `timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone`.
2. Backend accepts only ISO timestamps with `Z` or an explicit offset. Reject timezone-less values.
3. Store UTC in `TIMESTAMPTZ`.
4. Add an organization timezone setting, with browser timezone as a user-level display fallback.
5. Emails must use `Intl.DateTimeFormat`/`toLocaleString` with an explicit `timeZone`.
6. Display timezone abbreviation or name next to manager-entered and candidate-visible times.
7. Return `serverNow`, `availableFrom`, and `dueAt` in candidate scheduling responses so link state does not depend solely on the candidate device clock.

### Acceptance criteria

- A schedule created for 10:00 AM Asia/Kolkata represents the same instant in DB, email, manager portal, and candidate portal.
- A candidate in another timezone sees the correctly converted local time with timezone labeling.
- Timezone-less API payloads are rejected.

### Tests

- Backend unit tests under `TZ=UTC` and `TZ=Asia/Kolkata`.
- API test posts `2026-07-10T10:00:00+05:30` and asserts stored UTC.
- Playwright contexts with Kolkata and New York timezones.
- Email renderer test asserts the configured timezone text.

---

## SCR-FLOW-006 [P1] Complete Candidate Join Flow for Mandate Interviews

### Observed behavior

The candidate Mandates page lists scheduled interviews but never renders a Start or Join action. The general Interviews page launches AI/exam interviews, but the Mandates view is display-only.

Human interviews store the Google Meet URL in `interviews.location`. Candidate pages render it as plain text or a map-pin label. The general Interviews page also says the interviewer will share a link by email. The scheduling service sends a Screeno magic-link email even for human interviews, but the Screeno candidate flow does not implement a human interview room.

### Evidence

- `frontend/src/pages/candidate/CandidateMandatesPage.jsx:196-229`
- `frontend/src/pages/candidate/CandidateInterviewsPage.jsx:19-20`
- `frontend/src/pages/candidate/CandidateInterviewsPage.jsx:43-46`
- `frontend/src/pages/candidate/CandidateOverviewPage.jsx:229-232`
- `backend/src/routes/client-template.routes.js:608-655`
- `backend/src/services/schedule.service.js:110-167`

### Required implementation

1. Stop overloading `location`. Add:
   - `meeting_url` for online human interviews;
   - `location` for offline interviews.
2. Add a shared candidate action:
   - AI voice/exam: Start/Resume through `/candidate/interviews/:id/launch`;
   - human: Join meeting through `meeting_url` during the allowed window;
   - offline: show location and instructions only.
3. Use this action in Candidate Overview, Interviews, Monthly, and Mandates.
4. Human invite emails should link directly to the candidate portal detail or meeting URL, not to the Screeno device-check AI flow.
5. In the mandate scheduling request, pass the real client/role context into `scheduleService`; current fallback emails can say `Your company` and `Assessment`.
6. Candidate Mandates should show a clear upcoming, open, expired, completed, or cancelled state.

### Acceptance criteria

- An AI/exam scheduled through a mandate can be started from both Interviews and Mandates.
- A Google Meet interview has a clickable Join meeting action in the portal and email.
- An offline interview never shows a Screeno start button.
- Client name and selected role are correct in emails and portal.

### Tests

- E2E for AI, exam, Google Meet, and offline mandate schedules.
- Assert action is hidden before `available_from`, enabled in the window, and expired after `due_at`.
- Verify the Meet URL is an anchor with safe `target`/`rel` attributes.

---

## SCR-FLOW-007 [P1] Token, Window, and Reschedule Lifecycle

### Observed behavior

Magic-link tokens expire seven days after creation regardless of the scheduled date. A schedule more than seven days in the future can have an expired token before it opens.

The landing endpoint enforces the start window immediately, so opening an email early shows an error page rather than assessment details and a countdown. After expiry, every access can send another manager email. The reschedule email opens the generic schedule page, which has no reschedule action or query handling.

### Evidence

- `backend/src/services/schedule.service.js:105-108`
- `backend/src/services/schedule.service.js:222-237`
- `backend/src/services/auth.service.js:104-121`
- `backend/src/services/auth.service.js:248-271`
- `backend/src/services/email.service.js:383-425`
- `frontend/src/pages/candidate/InterviewLandingPage.jsx:16-63`
- `frontend/src/pages/manager/SchedulePage.jsx:242-285`
- `backend/src/routes/schedule.routes.js`

### Required implementation

1. Add `available_from` and `due_at` to interviews. `scheduled_at` may remain an alias during migration but should not define both open and close.
2. Token expiration must be at least `due_at + grace period`.
3. Separate link inspection from starting:
   - email link may display candidate-safe assessment details before opening;
   - Start endpoint enforces `available_from`/`due_at`.
4. Deduplicate expired-access notifications by interview and current schedule version.
5. Add a real reschedule endpoint that:
   - updates times and timezone;
   - increments `schedule_version`;
   - rotates the magic token;
   - clears the prior expiry-notification marker;
   - sends an updated invite;
   - preserves completed attempts.
6. Reschedule email should link to `/manager/schedule?interview=:id&action=reschedule`.
7. Schedule page must read that query, open the event, and show Reschedule.

### Acceptance criteria

- A future interview's token cannot expire before its due time.
- Opening a link early shows details and a countdown, not "Invalid Link."
- Repeated expired access sends one manager notification per schedule version.
- Rescheduling creates a working new invite and invalidates the old token.

### Tests

- Fake-clock unit tests before open, at open, before due, at due, and after due.
- Schedule 30 days ahead and assert token validity extends beyond due date.
- E2E early-link page and manager reschedule deep link.
- Email-delivery assertion verifies one reschedule notification.

---

## SCR-FLOW-008 [P1] Client Outcome Persistence and Candidate Outcome Page

### Observed behavior

The first save of a client outcome loses `outcome` and `feedback`: repository `create()` inserts only date and notes. A second save updates those fields. The API does not validate outcome values.

The candidate endpoint returns the entire outcome row, including manager `notes`, although the UI currently renders only `feedback`. Only the latest record is returned. The current UI places outcomes inline inside Mandates; there is no dedicated outcome/history page.

### Evidence

- `backend/src/repositories/client-interview-records.repository.js:4-17`
- `backend/src/repositories/client-interview-records.repository.js:42-60`
- `backend/src/routes/client-template.routes.js:681-703`
- `backend/src/routes/candidate.routes.js:93-113`
- `frontend/src/pages/candidate/CandidateMandatesPage.jsx:163-173`
- `frontend/src/pages/manager/ClientInterviewsPage.jsx:998-1050`

### Required implementation

1. Insert `outcome` and `feedback` on the first save.
2. Validate a shared outcome enum, for example `pending`, `passed`, `failed`, `on_hold`, `withdrawn`.
3. Support clearing editable values; do not use `COALESCE` where an explicit null should clear a field.
4. Model multiple client interview rounds. Recommended columns:
   - `round_number`;
   - `interview_at TIMESTAMPTZ`;
   - `outcome`;
   - `feedback`;
   - `manager_notes`;
   - `candidate_visible`;
   - `published_at`.
5. Add a unique constraint suitable for a round, and prevent concurrent duplicate first records.
6. Candidate API returns only published, candidate-safe fields. Never return `manager_notes`.
7. Add `/candidate/client-outcomes` and a Candidate navigation tab. Show client, role, date, outcome, and published feedback history.
8. Add a Client Outcomes tab in mandate detail where managers can draft, publish/unpublish, and add later rounds.

### Acceptance criteria

- First save persists the chosen outcome and feedback.
- Private notes are never present in candidate API JSON.
- Candidates see only published outcomes.
- Multiple client rounds appear in chronological history.

### Tests

- Repository test for first insert, update, clear, and concurrent create.
- API snapshot test proving `manager_notes` is absent.
- E2E manager draft is hidden, publish becomes visible, unpublish hides it.

---

## SCR-FLOW-009 [P1] Resume Metadata and Mandate-Specific Snapshots

### Observed behavior

Candidate Profile does not show the current filename, upload date, or a View action. The schema has `users.resume_updated`, but profile upload does not set it and `userRepository.getById()` does not return it.

Client-specific resume rows store URL and update time but no filename/MIME metadata. "Use My Main Resume" copies the current profile URL. Main resumes use a stable storage path with `upsert`, so a later profile replacement can silently change the file previously submitted to a mandate. Candidate Mandates hides resume actions after submission and offers no view/replace/history UI.

### Evidence

- `backend/src/routes/profile.routes.js:60-86`
- `backend/src/repositories/user.repository.js:15-55`
- `backend/src/services/storage.service.js:12-39`
- `backend/src/services/storage.service.js:70-90`
- `backend/src/repositories/client-team.repository.js:74-81`
- `frontend/src/pages/candidate/CandidateProfilePage.jsx:104-121`
- `frontend/src/pages/candidate/CandidateMandatesPage.jsx:175-194`
- `frontend/src/pages/manager/ClientInterviewsPage.jsx:1443-1445`

### Required implementation

1. Introduce a `resume_assets` table or equivalent metadata model:
   - owner user ID;
   - purpose (`profile`, `mandate_submission`);
   - mandate/client-team ID when applicable;
   - original filename;
   - MIME type;
   - size;
   - storage path;
   - created/uploaded time;
   - superseded/deleted time.
2. `users.current_resume_asset_id` points to the active main resume.
3. `client_teams.submitted_resume_asset_id` points to an immutable mandate snapshot.
4. "Use My Main Resume" must copy the object or create a versioned immutable reference, not reuse a mutable stable URL.
5. Candidate Profile shows filename, last updated, file type, View/Download, and Replace.
6. Candidate Mandates adds a Submitted Resume section/tab with filename, submitted date, View, and Replace before any configured deadline.
7. Manager Client Team shows the exact submitted asset, filename, and date.
8. Update `resume_updated` whenever the active main resume changes.
9. Preserve older mandate submissions for audit/history unless the mandate is permanently deleted.

### Acceptance criteria

- Candidate can see and open the current main resume and its upload date.
- Replacing the main resume does not change a prior mandate submission.
- Candidate and manager open the same mandate-submitted file.
- File metadata survives page refresh and is returned by APIs.

### Tests

- Upload `main-v1.pdf`, submit it to a mandate, replace with `main-v2.pdf`, and verify the mandate still opens v1.
- Upload a custom mandate resume and verify filename/date in both portals.
- API tests for ownership and cross-company denial.

---

## SCR-FLOW-010 [P1] Monthly Plan Requires Per-Month Occurrences

### Observed behavior

A subject can have `duration_months > 1`, but assigning it creates one enrollment and one interview at the start time. The yearly calendar repeats that single interview status across each month. `month_progress` is initialized but never updated.

For example, completing the first interview can make all months appear completed even though no later monthly interviews exist.

### Evidence

- `backend/src/services/monthly-assessment.service.js:123-163`
- `backend/src/services/monthly-assessment.service.js:195-241`
- `backend/src/repositories/monthly-assessment.repository.js:106-159`
- `frontend/src/pages/manager/MonthlyAssessmentPage.jsx:495-529`
- `backend/migrations/002_new_feature_tables.sql:27-49`

### Required implementation

1. Keep `monthly_assessments` as the reusable subject/template.
2. Keep `monthly_assessment_enrollments` as the candidate plan.
3. Add `monthly_assessment_occurrences`:
   - `id`;
   - `enrollment_id`;
   - `period_month` (`YYYY-MM-01`);
   - `available_from`;
   - `due_at`;
   - `interview_id`;
   - `status`;
   - timestamps.
4. Create one occurrence and one interview for each month in the plan.
5. Generate the yearly calendar from occurrences, not inferred array indexes.
6. Derive plan progress from occurrence rows. Deprecate `month_progress` after migration.
7. Candidate Monthly API returns the plan plus occurrences and their exact interview links/statuses.

### Acceptance criteria

- A three-month plan has three occurrence rows and three interview rows.
- Completing month one does not change month two or three.
- Each occurrence has its own start window, deadline, duration, status, and report.
- Manager and candidate views show the same occurrence count/status.

### Tests

- Integration test creates 1-, 3-, and 12-month plans across year boundaries.
- Complete only the first occurrence and assert later ones remain scheduled.
- E2E yearly calendar verifies separate month statuses.

---

## SCR-FLOW-011 [P1] Monthly Availability, Deadline, and Short Test Window

### Observed behavior

Monthly assignment captures one date/time and exam duration. The general launch-window service treats `scheduled_at + duration_minutes` as the final start deadline. This does not support "available in five minutes, complete within two days." The enrollment `end_date` represents plan months, not the assessment completion deadline.

Candidate Monthly shows title, focus tags, time, and duration, but not full study material/reference content or a true due date.

### Evidence

- `frontend/src/components/manager/MonthlyAssessmentAssignModal.jsx:122-147`
- `backend/src/services/monthly-assessment.service.js:111-151`
- `backend/src/services/interview-window.service.js:13-37`
- `frontend/src/pages/candidate/CandidateMonthlyPage.jsx:78-123`
- `backend/src/repositories/interview.repository.js:20-22`

### Required implementation

1. Assignment UI asks for:
   - first `available_from`;
   - completion deadline or window length;
   - exam `duration_minutes`;
   - recurrence rule for later months.
2. For the requested short test, support:
   - available from `now + 5 minutes`;
   - due at `now + 2 days`;
   - configurable exam duration, for example 60 minutes.
3. Starting is blocked before `available_from` and after `due_at`.
4. Once started, the candidate receives `duration_minutes`, independent of due time.
5. Candidate Monthly detail shows:
   - subject;
   - description/study material;
   - topics/subtopics;
   - references/links;
   - available time;
   - due time;
   - duration;
   - status and Start/Resume.
6. Use a dedicated candidate monthly endpoint rather than filtering generic interviews.

### Acceptance criteria

- The link is disabled five minutes before opening and enabled at opening.
- It remains startable until the two-day deadline.
- Starting with ten minutes left still grants the configured exam duration, subject to the chosen product policy.
- All preparation content is visible before start.

### Tests

- Fake-clock service tests for the short-window scenario.
- E2E with browser time mocked around open and due boundaries.
- Candidate API contract test for topics, study material, references, and deadline.

---

## SCR-FLOW-012 [P1] Monthly Cancellation Consistency

### Observed behavior

The Delete control actually soft-cancels an enrollment. The monthly plan filters cancelled rows, but the yearly calendar explicitly renders the cancelled plan across every month. Subject detail retains a stale selected assessment object after refresh and can continue showing the old status until reopened.

The backend cancels only an interview in `scheduled` state. It does not define what happens to future monthly occurrences because they do not yet exist.

### Evidence

- `frontend/src/pages/manager/MonthlyAssessmentPage.jsx:464-480`
- `frontend/src/pages/manager/MonthlyAssessmentPage.jsx:519-525`
- `frontend/src/pages/manager/MonthlyAssessmentPage.jsx:308-399`
- `backend/src/repositories/monthly-assessment.repository.js:233-267`

### Required implementation

1. Rename the action to Cancel plan unless permanent deletion is genuinely intended.
2. On cancellation:
   - set plan status to `cancelled`;
   - cancel future scheduled occurrences/interviews;
   - preserve completed occurrences and reports;
   - revoke future magic links;
   - notify the candidate when appropriate.
3. Active Monthly Plan and Yearly Calendar exclude cancelled future occurrences by default.
4. Add Show cancelled/history toggle for audit.
5. Refresh or close selected detail state after cancellation.
6. Use a custom confirmation dialog with the affected future occurrence count.

### Acceptance criteria

- Cancelling a plan removes it from active monthly and yearly views immediately.
- Completed historical occurrences remain in history.
- Candidate no longer sees future cancelled links.
- No stale detail modal contradicts the refreshed page.

### Tests

- Cancel before first occurrence, between occurrences, and after all complete.
- Assert active views, history views, candidate portal, and interview rows agree.
- E2E verifies immediate state update without page reload.

---

## SCR-FLOW-013 [P1] Atomic Monthly Assignment and Consolidated Delivery

### Observed behavior

Enrollment rows are created in one transaction, then interviews are created one by one outside that transaction. A failure after the first candidate can leave a partially assigned batch. `scheduleService` also starts magic-link email delivery asynchronously before the enrollment is linked to the interview.

Candidates receive one generic magic-link email and a separate monthly guidance email. The guidance email says to use a link sent separately, creating ordering and delivery ambiguity.

### Evidence

- `backend/src/services/monthly-assessment.service.js:123-175`
- `backend/src/services/schedule.service.js:110-180`
- `backend/src/services/email.service.js:244-340`
- `backend/src/repositories/monthly-assessment.repository.js:106-159`

### Required implementation

1. Make assignment idempotent with a client request ID or unique occurrence constraint.
2. Create enrollment, occurrences, interviews, and delivery-outbox rows in one transaction.
3. A background worker sends a single consolidated occurrence email containing:
   - subject and description;
   - topics/references;
   - available/due times;
   - duration;
   - secure portal/link action.
4. Store per-candidate assignment result and delivery status.
5. For a batch failure, either roll back all candidates or return explicit per-candidate successes/failures. Recommended default: atomic per candidate, batch returns a result list.
6. Manager UI shows failed assignments/deliveries and retry controls.

### Acceptance criteria

- Retrying an interrupted request does not create duplicate enrollments/interviews.
- Every successful occurrence has exactly one interview and at least one delivery row.
- Candidate receives one coherent email.
- Partial batch results are visible and actionable.

### Tests

- Inject failure on the second candidate and verify defined rollback/result behavior.
- Retry the same idempotency key and assert no duplicates.
- Email snapshot test verifies all required content and one link.

---

## SCR-FLOW-014 [P1] Stable Session and Refresh-Token Lifecycle

### Observed behavior

Refresh tokens and frontend retry exist, but the app still has several failure modes:

- `RequireAuth` trusts token presence without checking or bootstrapping validity.
- On refresh failure, `api.js` clears storage and calls `window.location.assign('/login')`, causing a full page reload.
- Logout requires a valid access token, so an expired access token prevents server-side refresh-token revocation.
- Refresh lifetime is hardcoded to seven days and ignores `REFRESH_EXPIRES_IN`.
- Multiple browser tabs can race rotating the same refresh cookie; one may succeed while another receives 401 and logs the user out.
- Cross-site frontend/backend deployments may fail to send a `SameSite=Strict` refresh cookie.

### Evidence

- `frontend/src/App.jsx:31-46`
- `frontend/src/services/api.js:30-88`
- `backend/src/routes/auth.routes.js:11-18`
- `backend/src/routes/auth.routes.js:46-71`
- `backend/src/services/auth.service.js:164-209`
- `backend/src/repositories/refresh-token.repository.js`

### Required implementation

1. Add an `AuthProvider` with states `loading`, `authenticated`, and `anonymous`.
2. On application bootstrap:
   - use valid access token if unexpired;
   - otherwise attempt refresh before rendering protected routes.
3. Replace `window.location.assign` with an auth-expired event/state transition and React navigation.
4. Make `/api/auth/logout` accept the refresh cookie without access-token middleware. Always revoke/clear it.
5. Parse `REFRESH_EXPIRES_IN` or use one documented server configuration.
6. Coordinate refresh across tabs with `BroadcastChannel` or a storage lock and broadcast new access/user state.
7. Define cookie settings by deployment:
   - same-site deployment: `Lax` or `Strict` as tested;
   - cross-site deployment: `SameSite=None; Secure`;
   - configurable cookie domain/path.
8. Return structured auth error codes. Do not interpret every generic network failure as an expired session.
9. Preserve the current route and redirect back after successful login where safe.

### Acceptance criteria

- An active refresh session survives access-token expiry without a visible error or full reload.
- Two open tabs do not log each other out during concurrent refresh.
- Logout revokes the refresh token even when access token has expired.
- A genuinely expired refresh session moves to Login once with a clear message.

### Tests

- Set access-token lifetime to seconds and run a manager mutation after expiry.
- Two-tab Playwright test triggers simultaneous requests.
- Logout with expired access token, then assert refresh fails.
- Production-cookie test using the actual frontend/backend host topology.

---

## SCR-FLOW-015 [P2] Scoped Refresh, Stale State, and Error Presentation

### Observed behavior

Most pages use independent `useState` fetches and broad refetches. Errors are often swallowed and replaced with empty lists, making API failures look like "no data." In mandate detail, success and failure strings share one green message style. Selected monthly subject detail can keep a stale object after `refreshAll`.

This is likely behind reports that the site feels broken after update/delete even when the backend mutation succeeded or failed clearly.

### Evidence

- `frontend/src/pages/manager/ClientInterviewsPage.jsx:1091-1127`
- `frontend/src/pages/manager/ClientInterviewsPage.jsx:1147-1167`
- `frontend/src/pages/manager/ClientInterviewsPage.jsx:1236`
- `frontend/src/pages/manager/MonthlyAssessmentPage.jsx:431-480`
- `frontend/src/pages/candidate/CandidateMandatesPage.jsx:40-63`

### Required implementation

1. Use structured notices: `{ type, message }`.
2. Never convert a failed fetch to an empty-state response. Keep last good data and show Retry.
3. Update only the affected collection/item after a mutation, then revalidate in the background.
4. Disable duplicate mutation controls while in flight.
5. Reconcile selected modal/detail objects with refreshed collection data or close them.
6. Preserve API status, code, and response data in a shared `ApiError` class.
7. Add request cancellation/sequence protection so a slow old request cannot overwrite newer state.
8. Consider a query cache only if the team accepts the dependency; otherwise implement a small shared resource hook consistent with current code.

### Acceptance criteria

- Delete/update never triggers a browser reload.
- Failed requests show an error, not a false empty state or green success banner.
- Lists update immediately and remain correct after background revalidation.
- Slow/stale responses cannot restore deleted data in UI.

### Tests

- Component tests with delayed/out-of-order API responses.
- Mutation failure tests verify item remains and error is red.
- E2E delete/update asserts the document was not reloaded.

---

## SCR-FLOW-016 [P2] Site-Wide Custom Confirmation Dialogs

### Observed behavior

Three workflows still use `window.confirm`:

- remove client-team member;
- cancel client interview;
- cancel monthly plan.

The shared `Modal` lacks focus trapping, focus restoration, unique title IDs, and portal rendering, so it is not yet sufficient as a universal accessible dialog.

### Evidence

- `frontend/src/pages/manager/ClientInterviewsPage.jsx:1147-1161`
- `frontend/src/pages/manager/MonthlyAssessmentPage.jsx:468-471`
- `frontend/src/components/shared/Modal.jsx`

### Required implementation

1. Build `ConfirmDialog` on an improved shared dialog primitive.
2. Props include title, description, confirm label, variant, loading, and optional typed confirmation.
3. Add focus trap, initial focus, Escape handling, focus restoration, unique `aria-labelledby`, and portal rendering.
4. Destructive dialogs do not close on backdrop while mutation is running.
5. Replace all native confirm/alert/prompt usage found by repository search.
6. Reuse it for permanent mandate delete and monthly cancellation.

### Acceptance criteria

- No product workflow uses native browser confirmation dialogs.
- Dialog is keyboard accessible and screen-reader labeled.
- Destructive mutation runs once even after repeated clicks.

### Tests

- Keyboard test for Tab cycle, Escape, and focus restoration.
- E2E checks Cancel and Confirm paths.
- Static test/search disallows `window.confirm`, `window.alert`, and `window.prompt`.

---

## SCR-FLOW-017 [P2] Manager Team Overview Viewport Layout

### Observed behavior

Dashboard content tries to use `flex: 1`, but `.app-main` is not a flex container. The bottom section therefore does not receive a defined remaining height, and content can grow beyond the intended screen area. The activity panel's inner scroll is only effective when an ancestor supplies a constrained height.

### Evidence

- `frontend/src/pages/manager/DashboardPage.jsx:47-123`
- `frontend/src/styles/product-ui.css:25-30`
- `frontend/src/components/layout/AppLayout.jsx:113-140`

### Required implementation

1. Give dashboard a stable desktop layout:
   - `height: 100%`;
   - `min-height: 0`;
   - CSS grid rows `auto auto minmax(0, 1fr)`.
2. Set `.app-main` or a dashboard-specific wrapper to `min-height: 0`.
3. The bottom row uses `minmax(0, 1fr)` and activity list owns its vertical scroll.
4. On short/mobile viewports, switch to natural page scrolling rather than forcing clipped cards.
5. Remove viewport arithmetic duplicated between sidebar/page components where the app shell can provide height.

### Acceptance criteria

- At common desktop heights, Team Overview fits the content area without an unnecessary outer scrollbar.
- Activity scrolls inside its panel when long.
- Short/mobile viewports remain fully reachable and do not clip content.

### Tests

- Screenshot tests at 1440x900, 1366x768, 1280x720, 1024x768, and mobile widths.
- Assert one intended vertical scroll owner and no clipped controls.

---

## SCR-FLOW-018 [P2] Candidate Portal Scroll Ownership

### Observed behavior

Candidate Layout uses `minHeight: 100svh`, and Candidate Dashboard independently uses `minHeight: calc(100svh - 3.5rem)`. The nested flex content does not define one scroll owner. Candidate navigation uses `overflowX: auto` but does not hide/style its scrollbar, so a small scrollbar is visible.

### Evidence

- `frontend/src/components/layout/CandidateLayout.jsx:35-87`
- `frontend/src/components/layout/CandidateDashboardLayout.jsx:13-40`
- `frontend/src/styles/globals.css:12-22`

### Required implementation

1. Candidate root shell uses `height: 100svh; overflow: hidden`.
2. Header is fixed-size; content uses `flex: 1; min-height: 0`.
3. Dashboard uses `height: 100%`, not another viewport minimum.
4. The route-content container owns `overflow-y: auto`.
5. Candidate tab navigation:
   - hide scrollbar consistently;
   - remain keyboard-scrollable;
   - use responsive tabs or a More menu when width is insufficient.
6. Audit child pages for fixed widths, `100vh`, and nested scroll containers.

### Acceptance criteria

- Candidate pages have one intentional vertical scrollbar.
- Navigation has no visible mini scrollbar.
- All tabs and content remain reachable on supported desktop widths.
- Interview/exam full-screen pages retain their own intentional layout.

### Tests

- Playwright screenshots and overflow assertions at desktop and narrow widths.
- DOM test identifies elements whose `scrollWidth > clientWidth` unexpectedly.

---

## SCR-FLOW-019 [P2] Shared Interview Card and Availability Contract

### Observed behavior

Overview, Interviews, Monthly, and Mandates each render interview details separately. Mandates omitted launch actions; human handling differs; labels and location behavior differ. Client-side `interviewAvailability` also uses the candidate device clock as an authority.

### Evidence

- `frontend/src/pages/candidate/CandidateOverviewPage.jsx`
- `frontend/src/pages/candidate/CandidateInterviewsPage.jsx`
- `frontend/src/pages/candidate/CandidateMonthlyPage.jsx`
- `frontend/src/pages/candidate/CandidateMandatesPage.jsx`
- `frontend/src/utils/helpers.js:77-131`

### Required implementation

1. Create shared `CandidateInterviewCard` and `CandidateInterviewAction`.
2. Normalize API fields:
   - type/status;
   - context title/company/client/role;
   - available/due/duration;
   - meeting URL/offline location;
   - server-computed availability state;
   - launch capability.
3. Keep backend as the authority. Client clock may update countdown labels but not permanently hide a server-allowed action.
4. Use the shared component in all candidate surfaces.

### Acceptance criteria

- The same interview displays the same time, status, and action everywhere.
- New interview types require one shared mapping change.
- Human/offline types never show an AI start action.

### Tests

- Component matrix for type x status x availability.
- E2E compares the same interview on Overview, Interviews, Monthly, and Mandates.

---

## SCR-FLOW-020 [P2] Requirement Lifecycle Integrity

### Observed behavior

Deleting a requirement profile does not check whether client-team rows reference it. Because there are no foreign keys, rows retain a dangling `requirement_id` and joins return no role. Deleting the final profile does not reset mandate headcount/requirements because `syncMandateHeadcount` updates only when profiles remain.

Matching capacity counts every client-team row regardless of candidate status. Requirement sync can also delete profiles omitted by the client payload without a reassignment workflow.

### Evidence

- `backend/src/routes/client-template.routes.js:126-157`
- `backend/src/routes/client-template.routes.js:318-330`
- `backend/src/routes/client-template.routes.js:356-365`
- `backend/src/repositories/client-team.repository.js:18-29`

### Required implementation

1. Block profile deletion while candidates reference it, or require reassignment/unassignment in the same transaction.
2. When the final profile is removed, explicitly reset or derive mandate summary fields.
3. Add a database foreign key from `client_teams.requirement_id` with an intentional delete rule. Recommended: `ON DELETE RESTRICT`.
4. Define capacity-consuming statuses centrally.
5. Make profile sync reject removal of referenced profiles unless a migration map is supplied.
6. Add UI impact count before deleting a role.

### Acceptance criteria

- No client-team row can reference a nonexistent role.
- Mandate headcount equals the sum of active requirement-profile headcounts.
- Removing the final role leaves a valid, explicit empty-role state.

### Tests

- Delete unused role, referenced role, and final role.
- Edit profile payload that omits a referenced role.
- Capacity tests across prospect/rejected/hired statuses.

---

## SCR-FLOW-021 [P2] Scheduling Validation, Idempotency, Cancel, and Reschedule

### Observed behavior

The scheduler validates timestamp syntax but not that it is in the future. Repeated submissions can create multiple active interviews for the same candidate/context. Client Team displays only the latest interview, hiding older active duplicates.

The main schedule calendar supports resend but not cancel/reschedule. The reschedule notification therefore cannot be completed directly.

### Evidence

- `backend/src/services/schedule.service.js:31-55`
- `backend/src/routes/client-template.routes.js:536-663`
- `backend/src/routes/schedule.routes.js`
- `frontend/src/pages/manager/SchedulePage.jsx:242-285`
- `backend/src/routes/client-template.routes.js:419-432`

### Required implementation

1. Reject schedules in the past, allowing a small server-clock tolerance.
2. Add idempotency key support for create schedule.
3. Detect an existing active interview for candidate + context + type and offer Reschedule rather than duplicate.
4. Add manager cancel and reschedule endpoints for all schedule origins.
5. Show all active/recent interviews in Client Team or clearly label the current one and history.
6. Reschedule rotates token and sends updated delivery.
7. Calendar API should honor the requested week rather than returning all manager interviews indefinitely.

### Acceptance criteria

- Double-click/retry produces one interview.
- Past scheduling is rejected.
- Manager can cancel or reschedule from Schedule and Client Team.
- Candidate portal updates immediately to the new schedule.

### Tests

- Concurrent duplicate POST test with same idempotency key.
- Past-date and clock-tolerance tests.
- E2E schedule, reschedule, cancel, and candidate verification.

---

## SCR-FLOW-022 [P2] File Privacy and Lifecycle

### Observed behavior

Supabase file URLs are public. Main and client resume uploads use predictable paths and overwrite in place. Changing file extension can leave the old object orphaned. Permanent data deletion has no storage cleanup transaction/outbox.

### Evidence

- `backend/src/services/storage.service.js:9-39`
- `backend/src/services/storage.service.js:62-90`
- `backend/.env.example`

### Required implementation

1. Use a private bucket for resumes and reports.
2. Return short-lived signed URLs through authenticated, ownership-checked endpoints.
3. Use immutable/versioned storage paths.
4. Track storage path separately from display URL in asset metadata.
5. Queue deletion of superseded/orphaned objects.
6. Add a reconciliation task that identifies DB assets without objects and objects without DB assets.

### Acceptance criteria

- A copied resume URL expires and cannot be used anonymously.
- Same-company/ownership rules apply before generating a signed URL.
- Replacing or deleting assets does not leave unbounded orphaned storage.

### Tests

- Anonymous URL access denied.
- Signed URL expires.
- Cross-company signed URL request denied.
- Storage reconciliation unit/integration tests.

---

## SCR-FLOW-023 [P2] Central Status and Candidate-Safe Contracts

### Observed behavior

Several update routes accept arbitrary status/outcome strings. Candidate endpoints often fetch broad rows and remove only selected fields, which is fragile when new private columns are added. Client outcome already demonstrates this risk by returning the full record.

### Evidence

- `backend/src/routes/client-template.routes.js:472-480`
- `backend/src/routes/client-template.routes.js:681-699`
- `backend/src/routes/candidate.routes.js:89-116`
- `backend/src/repositories/client-team.repository.js:84-92`

### Required implementation

1. Define central enums/state transitions for:
   - interview status;
   - client-team status;
   - client outcome;
   - monthly enrollment/occurrence status;
   - delivery/report-job status.
2. Reject invalid transitions, not only invalid strings.
3. Build candidate DTOs by allowlisting fields. Never spread raw DB rows into candidate responses.
4. Add contract tests that fail when private fields appear.

### Acceptance criteria

- Invalid statuses return `400`.
- Completed/cancelled records cannot transition backward without a dedicated action.
- Candidate JSON includes only documented fields.

### Tests

- State-transition table tests.
- Candidate response allowlist snapshots.
- Regression test adds a fake private repository field and confirms it is omitted.

---

## SCR-FLOW-024 [P3] Browser and Cross-Portal Regression Suite

### Observed behavior

Backend unit/API tests exist, but the repo does not have a repeatable browser suite for the cross-portal state transitions in this document. The root Playwright script is a smoke script rather than a fixture-isolated test suite.

### Required implementation

1. Add Playwright test configuration and isolated seed/reset helpers.
2. Cover manager and candidate in separate browser contexts.
3. Use deterministic clock/timezone controls.
4. Capture trace, screenshot, console errors, failed network responses, and page errors.
5. Run lint, build, backend tests, API tests, and browser tests in CI.

### Required E2E scenarios

1. Create mandate with two roles; select the second role when adding a candidate.
2. View an organization member outside the manager's team.
3. Schedule mandate AI exam; verify matching times and launch in candidate portal.
4. Schedule Google Meet; verify direct Join action.
5. Submit main and mandate-specific resumes; verify immutable snapshot.
6. Publish client outcome; verify candidate Outcomes page and no manager notes.
7. Create three-month plan; verify three occurrences.
8. Use five-minute open/two-day due test and fake clock.
9. Cancel monthly plan; verify active monthly/yearly/candidate views agree.
10. Expire access token mid-session; verify silent refresh without reload.
11. Archive and permanently delete a populated mandate.
12. Verify no unexpected horizontal/vertical overflow at target viewports.

---

## Smaller Cross-Flow Findings

These should be fixed while implementing the related primary issues:

1. **Mandate errors are styled as success.** `ClientInterviewsPage.jsx:1236` always uses success colors even when `setMessage` receives an error.
2. **Candidate action suggestions are order-dependent.** `matching_requirements[0]` has no explicit ranking contract beyond repository order.
3. **Client Team uses an N+1 interview query.** `client-template.routes.js:419-430` runs one query per candidate; replace with one query/window function.
4. **Outcome first-create and update semantics differ.** This causes the first-save bug and makes clearing feedback impossible.
5. **Expired-access email can spam.** There is no notification deduplication.
6. **Resend email loses context.** `schedule.service.js:231-237` resends with empty company and generic assessment title.
7. **Schedule create reports email as pending even if it later fails.** Manager UI must surface the asynchronous delivery result consistently.
8. **Candidate launch errors lose structured data.** `api.js` throws only a message and discards response `data`, including open/close timestamps.
9. **Candidate availability depends on local clock.** A wrong device clock can hide an action that the server would allow.
10. **Human/offline records receive token-like data they do not use.** Token and invite behavior should be type-specific.
11. **Monthly subject library has no edit/archive/delete lifecycle.** Add after occurrence migration, with the same referenced-data protections as mandate roles.
12. **Monthly selected-detail state is stale after refresh.** Reconcile by ID or close it after mutation.
13. **Cancelled monthly plans are history, not active status.** Do not paint every future month red in the default operational calendar.
14. **One interview status is reused for every plan month.** Remove this inference once occurrence rows exist.
15. **Main resume stable URLs can be browser-cached after overwrite.** Immutable paths solve both audit and cache correctness.
16. **Manager Member Profile still labels upload as PDF-only.** Align accepted types and render View versus Download based on MIME.
17. **Candidate Mandates cannot view/replace a submitted resume after the action card disappears.**
18. **Requirement profile deletion has no assigned-candidate impact warning.**
19. **Client-team member removal leaves related interviews and outcomes conceptually detached.** Define whether removal archives the relation, cancels future interviews, or is prohibited while active records exist.
20. **Schedule calendar shows only 9 AM-6 PM.** Interviews outside that range need an all-day/out-of-range section or dynamic hours.
21. **Schedule week argument is ignored by the backend service.** This will degrade as interview volume grows.
22. **Silent catches produce false empty states.** Requirements, reports, matches, and client-team loads are affected.
23. **Shared modal title ID is constant.** Multiple/nested dialogs can produce duplicate `id="modal-title"`.
24. **Organization profile access needs a privacy boundary.** Same-company basic profile access should not imply organization-wide transcript/report access.

## Recommended Implementation Order

1. Fix P0 parent-child authorization and add regression tests.
2. Add timestamp, availability/deadline, timezone, and reschedule schema/API contracts.
3. Build shared candidate interview action and repair mandate/human join flows.
4. Correct role selection and requirement lifecycle integrity.
5. Implement monthly occurrence model, then cancellation and consolidated delivery.
6. Implement resume asset metadata/snapshots and private signed access.
7. Implement client outcome history/publishing and candidate Outcomes page.
8. Add mandate archive/delete using the finalized asset/interview relationships.
9. Stabilize AuthProvider/refresh behavior.
10. Replace native confirmations and repair layout/scroll ownership.
11. Add complete Playwright coverage and update product/backend/frontend/schema docs.

## Verification Commands

Run after implementation:

```powershell
cd "F:\screeno v1\backend"
npm test
npm run check
npm run test:api

cd "F:\screeno v1\frontend"
npm run lint
npm run build

cd "F:\screeno v1"
npx playwright test
```

Also run migration verification against:

1. an empty database;
2. a copy of an existing database with migrations 001-008;
3. fixture data containing dangling requirement/client-team references, so migration behavior is explicit.

## Definition of Done

The work is complete only when:

- all acceptance criteria above pass;
- manager and candidate portals agree on role, schedule, status, resume, and outcome data;
- all timestamps represent the same instant across DB, email, and both portals;
- no candidate-safe API leaks manager-only fields;
- no native browser confirmation remains;
- access-token expiry does not visibly break an active session;
- active monthly/yearly/candidate views agree after assign, complete, cancel, and reschedule;
- browser tests cover desktop viewport overflow and the cross-portal workflows;
- docs and migrations describe the implemented contracts rather than the previous behavior.
