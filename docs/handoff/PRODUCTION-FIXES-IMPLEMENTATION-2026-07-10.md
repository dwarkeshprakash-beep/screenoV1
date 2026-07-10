# Production Fixes Implementation — 2026-07-10

Branch/worktree: `fix/audit-20260617` / local unpushed workspace  
Scope: close the audit gaps from the July 2026 recheck and verify the main app flows as production-ready as possible in this local environment.

## Result

The major audit gaps are now implemented and verified locally. I do not see any remaining P0/P1 blockers from the recheck after this pass.

Update later on 2026-07-10: a follow-up cleanup found drift in this workspace after the original handoff. The monthly route file had a duplicated paste/syntax break, monthly assignment still wrote legacy enrollment fields, role-level resume deadlines were not persisted, and candidate mandate outcomes still read the legacy single-record table. These were corrected by the migration/code cleanup ending at `016_monthly_and_mandate_cleanup.sql`.

## Implemented fixes

### Auth, magic links, and interview windows

- Added server-side magic-link preview/claim behavior with one-time token consumption.
- Kept legacy `POST /api/auth/magic-link/:token` compatibility.
- Enforced interview launch windows using `available_from` / `due_at`.
- Fixed token/outbox handling to use the actual `interviews.token` and `interviews.token_expires` fields.

### Scheduling

- Scheduling now requires a valid future `scheduledAt`.
- `available_from`, `due_at`, timezone, client team, location, and meeting URL are persisted.
- Human/offline scheduling paths now carry the right location/meeting details.
- Calendar data now returns and filters by the actual scheduled/available window.
- Rescheduling regenerates schedule windows and tokens safely.

### Monthly assessments

- Monthly assignments now create one interview/occurrence per month.
- Occurrences are persisted in `monthly_assessment_occurrences`.
- Assignment conflict checks ignore cancelled enrollments.
- Cancellation now cancels all unfinished occurrence interviews, clears tokens, cancels occurrence rows, and safely finishes pending outbox jobs.
- Calendar/plan views now read occurrence-backed data instead of only the first enrollment interview.

### Client mandates and candidate roles

- Manager candidate-add payloads now send per-candidate `requirementId`.
- Backend validates requirement ownership and headcount capacity.
- Client-team schedule calls now carry `clientTeamId`, role/company context, timezone, meeting URL, and location.
- Client outcome rounds now work end-to-end:
  - manager can view/create/update/publish/unpublish rounds;
  - candidate sees only published feedback;
  - private manager notes do not leak to candidate pages.

### Deletion and admin controls

- Mandate deletion now uses actual schema relationships and deletes dependent interviews/reports/rounds/resume assets safely.
- Admin routes were rewritten against the current schema.
- Admin UI routes now load through `/api/admin/...`.
- Admin navigation/login is wired for the `admin` role.

### Reports and storage

- Generated report paths now store stable storage object paths instead of short-lived signed URLs.
- Report read APIs sign storage paths at response time.

### Frontend correctness

- Candidate human join response handling fixed.
- Candidate interview availability now uses the same window logic as backend.
- Schedule modal serializes local datetime values to UTC ISO.
- Admin sidebar/topbar/dashboard routes added.
- Lint issues from changed files were cleaned up.

### Test/regression updates

- API regression now uses dynamic future dates so it does not become stale.
- API regression now respects one-time magic-link consumption by checking slots before claiming the link.

## Verification performed

| Check | Result |
| --- | --- |
| Backend JS syntax check excluding `node_modules` | Pass |
| Backend unit tests: `npm test` | Pass — 9/9 |
| Frontend lint: `npm run lint` | Pass — no errors/warnings |
| Frontend production build: `npm run build` | Pass |
| Backend API regression: `npm run test:api` against local `:4010` | Pass |
| Browser smoke — manager login/dashboard/team/client mandate/outcome rounds | Pass |
| Browser smoke — candidate login/overview/interviews/outcomes | Pass |
| Browser smoke — admin login/dashboard/mandates/interviews/broken states | Pass |

Browser smoke used a temporary QA seed company/user/mandate/interview and cleaned it up afterward.

## Remaining production-release suggestions

These are not current blockers, but I would do them before a real production cut:

1. Apply the new migrations to the target production/staging database and verify column parity before deploy.
2. Run one staging test with real SMTP/storage/provider credentials enabled, because local verification used suppressed/console email behavior.
3. Add a Playwright/Cypress E2E suite for manager → candidate → admin smoke so these regressions stay caught automatically.
4. Add `.vs/` and local IDE artifacts to ignore/cleanup policy if they should not be committed.
5. Perform a real device/mic interview run manually; browser smoke verified navigation/data flow, not full microphone permissions or live AI-provider behavior.
