# Screeno Audit Backlog

Last reviewed: June 7, 2026

This document records the read-only product, security, flow, UI, and architecture
audit. It is a decision backlog, not a record of completed fixes.

## How to use this file

- Refer to an item by ID, for example: `C-04`, `M-12`, or `L-05`.
- Change `Decision` only after the team agrees on an approach.
- Change `Status` to `in progress`, `blocked`, `fixed`, or `accepted risk`.
- Critical issues should be resolved before using real candidate data.

Decision values:

- `Pending`: no implementation decision has been made.
- `Correct fix`: use the recommended durable solution.
- `Alternative`: use the listed smaller or temporary approach.
- `Do not implement`: intentionally leave the feature out and remove its UI/claim.
- `Accepted risk`: consciously ship without fixing, with an owner and review date.

---

## Implemented This Pass

- **Done:** Manager-only AI transcripts with same-company enforcement. Verified manager access and candidate blocking.
- **Done:** Candidate interview answer, proctoring, and completion ownership validation.
- **Done:** Tenant checks added to team member, report, upload, schedule, transcript, and interviewer scorecard paths touched in this pass.
- **Done:** Exam question payload no longer selects or returns `correct_answer`.
- **Done:** Exam submission now validates status, window, attempts, cooldown, question ownership, complete answers, and writes in one transaction.
- **Done:** Interviewer scorecards now verify assignment and persist decision, reason, all competencies, evidence, author, and timestamp.
- **Done:** Candidate finish/timer finalization now calls the backend; early hang-up confirms and marks the attempt abandoned.
- **Done:** Logged-in candidate dashboard uses the returned `token` contract.
- **Done:** Mute now blocks answer recording while muted; timer expiry finalizes the interview.
- **Done:** Transcription failure no longer creates a scored placeholder answer; candidate can type the answer to continue.
- **Done:** Local transcription option removed from scheduling; backend forces the working API transcription path.
- **Done:** Completed interviews enqueue durable report jobs with retry/status tracking and a worker.
- **Done:** Human scheduling now stores appointment start/end, timezone, interviewer assignment, and conflict validation.
- **Partially done:** Human LiveKit flow now supports candidate magic-link join, interviewer assignment checks, persisted notes/asked-state, and server-side end. The question guide is still a static starter list.
- **Update (2026-06-08):** Root cause of the broken/unstyled video room found and fixed — missing
  `@livekit/components-styles` import (now installed + imported in `main.jsx`); `HumanInterviewPage.jsx`
  and `LiveRoomPage.jsx` rewritten to handle `onDisconnected` with a rejoin UI on both sides.

Verification:

- Backend DB alignment/migration completed successfully.
- Backend JavaScript syntax check passed.
- Frontend production build passed.
- API checks confirmed manager transcript access, candidate transcript blocking, manager candidate-route blocking, and interviewer lookup.

---

## Critical

### C-01: Interview transcript authorization is missing

- **Area:** Backend security
- **Present behavior:** Any authenticated role can request a transcript using an interview ID.
- **Impact:** Candidate interview answers can be disclosed to unauthorized users.
- **Approved policy:** Only authenticated managers may view AI interview transcripts. The manager's `company_id` must match the candidate and interview company before transcript data is returned.
- **Correct fix:** Add manager-role authorization in the route/service and enforce company ownership in the repository query.
- **Alternative:** Create separate candidate, manager, and interviewer transcript endpoints with explicit access policies.
- **Do not:** Depend on hidden IDs or frontend route guards.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/routes/interview.routes.js`

### C-02: Answers, proctoring events, and completion are not ownership-scoped

- **Area:** Backend security and data integrity
- **Present behavior:** Authenticated users can submit an arbitrary interview, attempt, or question ID.
- **Impact:** Interviews can be corrupted, falsely completed, or populated with forged answers.
- **Correct fix:** Resolve the interview from the authenticated candidate and validate that the attempt and question belong to it.
- **Alternative:** Use an opaque server-issued attempt session ID that maps to the permitted interview.
- **Do not:** Trust IDs from the browser without relational validation.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/routes/interview.routes.js`

### C-03: Company tenant isolation is incomplete

- **Area:** Backend security
- **Present behavior:** Several team, report, upload, scheduling, and scorecard operations fetch records by ID without checking `company_id`.
- **Impact:** A manager or interviewer may access or alter another company's candidate data.
- **Correct fix:** Include company or assignment ownership in every repository query and service operation.
- **Alternative:** Add a centralized authorization service used before every record operation.
- **Do not:** Fetch globally by ID and check only in the frontend.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done

### C-04: Exam responses expose the correct answers

- **Area:** Exam security
- **Present behavior:** The public exam payload includes `correct_answer`.
- **Impact:** Candidates can inspect the network response and obtain answers.
- **Approved approach:** Use both protections together. A dedicated repository projection must select only candidate-visible fields, and the service must map those rows to a candidate-safe DTO.
- **Correct fix:** Return only `id`, question text, question type, answer options, order, and candidate-visible instructions. Never select or serialize `correct_answer`, scoring weights, rubric data, or internal metadata.
- **Alternative:** If the shared repository must temporarily remain, apply an explicit service allowlist before serialization. This is weaker because sensitive data still leaves the repository.
- **Do not:** Hide the field with CSS or client-side JavaScript.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/routes/exam.routes.js`

### C-05: Exam attempt and submission controls can be bypassed

- **Area:** Exam integrity
- **Present behavior:** Repeat, empty, late, and arbitrary-question submissions are accepted; attempt limits and cooldown are not enforced.
- **Impact:** Exam results cannot be treated as reliable.
- **Correct fix:** Validate status, window, attempt limit, cooldown, question ownership, and unanswered rules inside one database transaction.
- **Alternative:** Disable exams until server-side attempt enforcement is complete.
- **Do not:** Rely on the frontend timer or disabled buttons.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/routes/exam.routes.js`

### C-06: Interviewer scorecards lack assignment checks and lose decision data

- **Area:** Human interview security and reporting
- **Present behavior:** An interviewer can submit against an arbitrary interview ID. The required decision is not stored, and some score fields are discarded.
- **Impact:** Unauthorized or incomplete hiring evaluations can be created.
- **Correct fix:** Verify interviewer assignment and persist every competency, decision, reason, evidence, author, and timestamp.
- **Alternative:** Store scorecards in a dedicated table before mapping approved fields into reports.
- **Do not:** Treat a generic report row as a complete scorecard.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/routes/interviewer.routes.js`

### C-07: Candidate consent describes recording that does not occur

- **Area:** Legal, privacy, and candidate trust
- **Present behavior:** The UI says face and voice are recorded and screenshots are taken, while the implementation stores neither.
- **Impact:** Consent is inaccurate and conflicts with the project rule that audio is never stored.
- **Correct fix:** Rewrite consent from actual data flows and include provider disclosure, retention, purpose, access, deletion, and opt-out details.
- **Alternative:** Implement recording only after explicit policy, security, retention, and legal approval.
- **Do not:** Claim monitoring or recording that is not technically active.
- **Decision:** Accepted risk — keep the current consent text and behavior for now; approved June 7, 2026
- **Review condition:** Revisit before external/customer use, before enabling real recording, or before using the system for consequential employment decisions.
- **Status:** Open
- **Evidence:** `frontend/src/pages/candidate/ConsentPage.jsx`

### C-08: Candidate exit controls do not complete the interview

- **Area:** Candidate interview flow
- **Present behavior:** Finish and hang-up controls navigate to Done without reliably completing the attempt.
- **Impact:** Interviews remain in progress, reports are not generated, and managers see inconsistent state.
- **Approved behavior:** `Finish and submit` must use one idempotent finalization action that saves the last answer, completes the attempt, confirms success, and then navigates. An early hang-up must show a confirmation dialog and, after confirmation, mark the attempt as `abandoned`.
- **Correct fix:** Implement separate server-authoritative finalization outcomes for `completed` and `abandoned`, both idempotent and scoped to the authenticated candidate.
- **Alternative:** If `abandoned` cannot be added immediately, block early exit and tell the candidate to finish or contact the manager.
- **Do not:** Navigate directly to Done as a substitute for server completion.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `frontend/src/pages/candidate/AIInterviewPage.jsx`

### C-09: AI hiring compliance controls are not defined

- **Area:** Responsible AI and legal readiness
- **Product scope:** Screeno is currently an internal, single-company platform for employee monthly assessments, interview practice, and preparation for client interviews. It is not currently focused on external customer organizations.
- **Approved AI policy:** AI may provide an advisory perspective about role fit, effectiveness, strengths, gaps, and suggested next steps. AI does not make, approve, or automatically execute an employment decision. An authorized human reviews the evidence and makes the final decision.
- **Correct fix:** Label outputs as advisory, require a human decision and rationale, preserve AI versus human authorship, and prevent automatic pass, fail, promotion, termination, or client-submission actions.
- **Alternative:** For monthly development assessments, remove pass/fail language and show coaching themes, progress, and recommended learning goals.
- **Do not:** Present AI output as objective fact or permit it to become the sole decision-maker.
- **Decision:** Correct fix and internal single-company scope — approved June 7, 2026
- **Status:** Accepted scope

---

## Moderate

### M-01: Logged-in candidate links use the wrong token property

- **Area:** Candidate dashboard
- **Present behavior:** The page reads `magic_token`, while the API returns `token`.
- **Impact:** Start and device-check buttons navigate to `/interview/undefined`.
- **Correct fix:** Define one API contract and use the same field throughout.
- **Alternative:** Remove candidate password login and use only the documented magic-link flow.
- **Do not:** Maintain two undocumented token field names.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done

### M-02: Device check allows failed microphone and camera checks

- **Area:** Candidate readiness
- **Present behavior:** Continue becomes enabled when required checks fail; speaker is excluded.
- **Impact:** Candidates enter an interview that cannot capture usable answers.
- **Correct fix:** Require microphone success and mode-specific devices, with retest and permission help.
- **Alternative:** Permit a clearly labeled text-answer fallback.
- **Do not:** Treat `failed` as equivalent to `passed`.
- **Decision:** Accepted risk — keep the current behavior for now; approved June 7, 2026
- **Review condition:** Revisit before external use or any assessment where missing audio would invalidate the result.
- **Status:** Open

### M-03: Mute and interview timers are cosmetic

- **Area:** Candidate interview controls
- **Present behavior:** Mute changes UI state only, and time reaching zero does not finalize the session.
- **Impact:** Controls do not match user intent.
- **Correct fix:** Connect mute to actual recording and make timer expiry use the finalization state machine.
- **Alternative:** Remove controls until their behavior is implemented.
- **Do not:** Keep controls that only change icons.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done

### M-04: Transcription failures become candidate answers

- **Area:** Speech transcription
- **Present behavior:** A failure placeholder is saved and later scored.
- **Impact:** Candidates can receive incorrect reports through no fault of their own.
- **Correct fix:** Mark the answer as failed, retain no audio, and allow a retry before advancing.
- **Alternative:** Offer manual text confirmation of the transcript.
- **Do not:** Score failure messages as interview content.
- **Decision:** Correct fix plus manual text fallback — approved June 7, 2026
- **Status:** Done

### M-05: Local transcription mode is not a real implementation

- **Area:** Speech transcription
- **Present behavior:** Local mode is selectable but returns placeholder behavior.
- **Impact:** Managers select a capability that is not delivered.
- **Correct fix:** Implement and benchmark the local transcription worker before exposing it.
- **Alternative:** Remove local mode and expose only the working API mode.
- **Do not:** Label a stub as production-ready transcription.
- **Decision:** Alternative now, correct fix later — approved June 7, 2026
- **Status:** Done

### M-06: Report generation is not durable

- **Area:** Backend jobs
- **Present behavior:** Report and PDF work runs as fire-and-forget promises in the web process.
- **Impact:** Restarts or provider failures can permanently lose reports.
- **Correct fix:** Persist jobs with statuses, retries, idempotency keys, error details, and a worker.
- **Alternative:** Store `report_pending` and provide a protected retry operation.
- **Do not:** Assume a detached promise will always finish.
- **Decision:** Correct fix with retry worker — approved June 7, 2026
- **Status:** Done

### M-07: Done page can display an older report

- **Area:** Candidate completion
- **Present behavior:** Polling stops quickly and report lookup is candidate-based rather than attempt-based.
- **Impact:** A candidate may see stale tips or no result.
- **Correct fix:** Poll or subscribe using the completed attempt/report job ID.
- **Alternative:** Show a completion receipt and email tips after generation.
- **Do not:** Fetch the latest report for the whole candidate.
- **Decision:** Pending — think later per June 7, 2026 direction
- **Status:** Open

### M-08: Human interview scheduling has no real appointment model

- **Area:** Scheduling
- **Present behavior:** The calendar uses interview creation time; no reliable interviewer, start, end, timezone, or meeting status is captured.
- **Impact:** The interviewer workflow cannot schedule or join a real appointment correctly.
- **Correct fix:** Add explicit appointment fields and availability/conflict validation.
- **Alternative:** Integrate Google or Microsoft Calendar and store the external event ID.
- **Do not:** Use `created` as the scheduled time.
- **Decision:** Correct fix, calendar alternative retained for later — approved June 7, 2026
- **Status:** Done

### M-09: Interviewer schedule ignores requested dates

- **Area:** Interviewer dashboard
- **Present behavior:** `?date=today` is ignored and all assigned human interviews are returned.
- **Impact:** Today, week, and month counts are misleading.
- **Correct fix:** Query explicit appointment date ranges and return grouped counts.
- **Alternative:** Fetch a bounded week and filter locally after real appointment fields exist.
- **Do not:** Label total records as today's schedule.
- **Decision:** Pending — fix later per June 7, 2026 direction
- **Status:** Open

### M-10: Human live-room flow is incomplete

- **Area:** LiveKit interview
- **Present behavior:** Questions are hard-coded, notes are local-only, End Interview only navigates, and no candidate room route exists.
- **Impact:** A complete interviewer-to-candidate video interview cannot be conducted.
- **Correct fix:** Build a shared room with candidate join, assignment checks, persisted guide/notes, connection states, and server completion.
- **Alternative:** Integrate an external meeting link first and keep only scorecards in Screeno.
- **Do not:** Present the current room as complete.
- **Decision:** Correct fix with external-link alternative retained — approved June 7, 2026
- **Status:** In progress

### M-11: Assessment freshness uses scheduling date

- **Area:** Team analytics
- **Present behavior:** `last_assessed` is the latest interview creation date, including scheduled interviews.
- **Impact:** Unassessed candidates appear up to date.
- **Correct fix:** Use the latest completed attempt or ready report timestamp.
- **Alternative:** Show separate `last_scheduled` and `last_completed` fields.
- **Do not:** Treat creation as assessment completion.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/repositories/candidate.repository.js`

### M-12: Reports page mixes candidates, interviews, and reports

- **Area:** Manager reporting
- **Present behavior:** Rows represent active candidates, missing reports count as zero, and decisions default to pending.
- **Impact:** Totals, averages, pass rates, and pending counts are incorrect.
- **Correct fix:** Define report metrics from completed attempts and actual report/decision records.
- **Alternative:** Split the screen into Completed Reports and Pending Interviews.
- **Do not:** Include missing scores as zero unless explicitly intended.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/repositories/report.repository.js`, `frontend/src/pages/manager/ReportsPage.jsx`

### M-13: Report score is divided by two without a contract

- **Area:** Manager reporting
- **Present behavior:** The UI divides `overall_score` by two.
- **Impact:** Displayed scores do not reliably match stored scores.
- **Correct fix:** Define one score range and normalize only at the service boundary.
- **Alternative:** Return both raw score and `score_max`.
- **Do not:** Apply unexplained frontend arithmetic.
- **Decision:** Correct fix with `score_max` contract — approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/repositories/report.repository.js`, `frontend/src/pages/manager/ReportsPage.jsx`

### M-14: Dashboard openings data contract is inconsistent

- **Area:** Manager dashboard
- **Present behavior:** The API returns an openings count while the UI expects an openings collection.
- **Impact:** The dashboard shows a false empty state.
- **Correct fix:** Define separate `openRoleCount` and `recentOpenings` fields.
- **Alternative:** Remove the openings panel until role tracking exists.
- **Do not:** Infer an array from a count.
- **Decision:** Alternative — remove openings panel until role tracking exists; approved June 7, 2026
- **Status:** Done
- **Evidence:** `frontend/src/pages/manager/DashboardPage.jsx`

### M-15: Scheduling stages and report recipients are not executed

- **Area:** Scheduling and notifications
- **Present behavior:** The UI collects stages and recipient emails, but the backend ignores most of them.
- **Impact:** Managers believe configured workflows will occur when they will not.
- **Correct fix:** Persist stages and recipients, create transitions, and send notifications after report completion.
- **Alternative:** Remove those inputs until workflow support exists.
- **Do not:** Accept configuration that the backend silently ignores.
- **Decision:** Static internal delivery list for current phase; approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/services/email.service.js`
- **Update (2026-06-08):** Recipient *suggestions* now also pull from the company's `users` table
  (`userRepository.getByCompany`, `GET /api/schedule/org-users`, `ScheduleModal.jsx` chips) instead of
  only team/candidate records — managers see real org emails to pick from, while delivery itself still
  redirects through the static internal list above.

### M-16: Bulk scheduling can partially succeed

- **Area:** Scheduling reliability
- **Present behavior:** Interviews are created independently without rollback or idempotency.
- **Impact:** Retrying can create duplicates and inconsistent candidate states.
- **Correct fix:** Use idempotency keys and transactional batch creation where supported.
- **Alternative:** Return per-candidate results with a safe retry action.
- **Do not:** Return one generic failure after records were already created.
- **Decision:** Idempotency records for retries, transactional batch deferred until batch API exists; approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/repositories/schedule-record.repository.js`, `frontend/src/components/manager/ScheduleModal.jsx`

### M-17: Email failure is hidden from managers

- **Area:** Notifications
- **Present behavior:** Scheduling succeeds even when invitation delivery fails.
- **Impact:** Candidates may never receive their interview link.
- **Correct fix:** Store delivery status and expose resend, failure reason, and last attempt.
- **Alternative:** Return `inviteSent: false` and show a copy-link fallback.
- **Do not:** Present record creation as successful delivery.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/repositories/email-delivery.repository.js`, `backend/src/routes/schedule.routes.js`

### M-18: Access-token refresh is not used correctly

- **Area:** Authentication
- **Present behavior:** A 401 clears the session instead of using the refresh cookie. Candidate refresh can lose `candidateId`.
- **Impact:** Users are logged out after 15 minutes or receive incorrect candidate data.
- **Correct fix:** Implement one guarded refresh-and-retry flow and preserve role-specific claims.
- **Alternative:** Disable refresh during development and use an explicitly temporary session duration.
- **Do not:** Run simultaneous refresh calls or trust localStorage role data.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `frontend/src/services/api.js`, `backend/src/services/auth.service.js`

### M-19: Magic-link tokens are stored raw

- **Area:** Authentication
- **Present behavior:** Usable candidate tokens are stored directly in the database.
- **Impact:** A database read leak exposes active interview access.
- **Correct fix:** Store a token hash and compare the hash of the presented token.
- **Alternative:** Use short-lived signed tokens with revocation records.
- **Do not:** Log or expose raw tokens outside invitation delivery.
- **Decision:** Deferred per June 7, 2026 direction
- **Status:** Open

### M-20: External AI input and output controls are weak

- **Area:** LLM security and quality
- **Present behavior:** Untrusted text is interpolated into prompts; output ranges and schemas are weakly validated.
- **Impact:** Prompt injection, malformed reports, and inconsistent scores are possible.
- **Correct fix:** Separate untrusted content, enforce schemas, clamp ranges, version prompts, and reject invalid output.
- **Alternative:** Use deterministic rubric scoring and ask the LLM only for summaries.
- **Do not:** Treat parseable JSON as trustworthy evaluation data.
- **Decision:** Correct fix — schema validation and clamped outputs; approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/src/services/llm.service.js`

### M-21: Rate limiting and baseline HTTP hardening are absent

- **Area:** Platform security
- **Present behavior:** Login, magic links, uploads, transcription, and LLM endpoints have no abuse controls.
- **Impact:** Brute force, cost abuse, denial of service, and oversized workload risk.
- **Correct fix:** Add route-specific limits, security headers, strict CORS, upload limits, and timeouts.
- **Alternative:** Enforce limits at a trusted reverse proxy or API gateway.
- **Do not:** Use one global limit that blocks normal interview audio traffic.
- **Decision:** Correct fix — app-level hardening now, gateway limits later if deployed; approved June 7, 2026
- **Status:** Done
- **Evidence:** `backend/server.js`, `backend/src/middleware/rate-limit.js`

### M-22: Automated tests and CI gates are missing

- **Area:** Engineering quality
- **Present behavior:** There are no automated role, API, interview-state, or UI regression tests.
- **Impact:** Security and flow regressions can ship unnoticed.
- **Correct fix:** Add repository/service tests, API authorization tests, and browser tests for all three roles.
- **Alternative:** Start with a release-blocking smoke suite for login, schedule, interview, report, and scorecard.
- **Do not:** Depend solely on the manual testing document.
- **Decision:** Skipped per June 7, 2026 direction
- **Status:** Open

---

## Low

### L-01: Templates are implemented but blocked

- **Area:** Manager UI
- **Correct fix:** Remove the overlay after validating CRUD, or remove the controls until launch.
- **Alternative:** Expose templates behind a feature flag.
- **Decision:** Skipped per June 7, 2026 direction
- **Status:** Open

### L-02: Several visible controls are inert

- **Area:** UI behavior
- **Examples:** Import CSV, report filter, export, View Report, search, notifications, and calendar actions.
- **Correct fix:** Implement each action or clearly mark it disabled with explanatory text.
- **Alternative:** Remove nonfunctional controls from the current release.
- **Decision:** Implement visible report/search/navigation actions touched in this milestone; deeper CSV import/calendar actions remain future work.
- **Status:** Partially done
- **Evidence:** `frontend/src/pages/manager/ReportsPage.jsx`, `frontend/src/components/layout/TopBar.jsx`

### L-03: Interviewer navigation contains placeholder links

- **Area:** Navigation
- **Present behavior:** Interview Prep, Live Room, and Scorecard point to `#`.
- **Correct fix:** Route to real contextual pages or remove the items.
- **Decision:** Correct fix — approved June 7, 2026
- **Status:** Done
- **Evidence:** `frontend/src/components/layout/Sidebar.jsx`, `frontend/src/App.jsx`

### L-04: Scorecard falsely claims autosave

- **Area:** Interviewer UI
- **Correct fix:** Implement debounced draft persistence with a saved/error indicator.
- **Alternative:** Remove the autosave statement and keep explicit submission.
- **Decision:** Alternative — remove autosave statement and keep explicit submission; approved June 7, 2026
- **Status:** Done

### L-05: Accessibility coverage is weak

- **Area:** Accessibility
- **Examples:** Clickable non-buttons, unlabeled icons, fake consent checkbox, and weak keyboard navigation.
- **Correct fix:** Use semantic elements, labels, focus states, keyboard support, and accessibility checks.
- **Alternative:** Audit the candidate journey first, then manager and interviewer screens.
- **Decision:** Correct fix started with semantic report/topbar controls; full accessibility pass remains future work.
- **Status:** Partially done

### L-06: Design-token and component rules are widely violated

- **Area:** Frontend maintainability
- **Present behavior:** Real pages contain hard-coded colors, repeated inline styles, and oversized components.
- **Correct fix:** Move repeated styling to token-based CSS and split components along existing boundaries.
- **Alternative:** Apply the rules whenever an affected screen is next changed.
- **Decision:** Apply opportunistically on touched screens; full token/component refactor remains future work.
- **Status:** Partially done

### L-07: Lint debt is high

- **Area:** Engineering quality
- **Present behavior:** Full lint reports hundreds of issues; the real app still reports dozens.
- **Correct fix:** Exclude archived prototypes, fix real-app errors, and make lint release-blocking.
- **Alternative:** Establish a no-new-errors baseline and reduce debt incrementally.
- **Decision:** Fix later per June 7, 2026 direction
- **Status:** Open

### L-08: Frontend bundle should be split

- **Area:** Performance
- **Present behavior:** Production JavaScript is approximately 1.07 MB before gzip.
- **Correct fix:** Lazy-load role areas and heavy interview/video features by route.
- **Alternative:** Begin with LiveKit, reports, and resume analyzer chunks.
- **Decision:** Explained and skipped for now per June 7, 2026 direction.
- **Bundle explanation:** The current bundle is large because Vite builds all role areas, LiveKit/video code, manager reports, resume analyzer, and prototype/demo screens into one eager application chunk. The correct future fix is route-level `React.lazy`/`Suspense` splitting for manager, candidate, interviewer, LiveKit, reports, and resume-analyzer paths, plus excluding archived prototype routes from production imports.
- **Status:** Open

### L-09: Documentation is stale

- **Area:** Project operations
- **Present behavior:** `BRAIN.md` still describes the frontend and backend as unbuilt.
- **Correct fix:** Update build state, active work, file map, and limitations after each milestone.
- **Alternative:** Generate part of the status from routes and package scripts.
- **Decision:** Correct fix — update after milestone; approved June 7, 2026
- **Status:** Done
- **Evidence:** `BRAIN.md`, `docs/AUDIT-BACKLOG.md`

### L-10: Duplicate and test candidate records are visible

- **Area:** Data quality
- **Correct fix:** Add normalized email uniqueness per company, test-data markers, and cleanup procedures.
- **Alternative:** Filter test records from production-facing analytics.
- **Decision:** Remove obvious E2E/demo records now; add durable data hygiene later.
- **Status:** Done
- **Evidence:** Soft-deleted E2E test candidates and seed/demo Raj Gmail record on June 7, 2026

---

## Product Opportunities

These are not defect fixes. Consider them only after critical security and workflow
correctness work is complete.

### P-01: Structured interview kits

- **Inspired by:** HireVue and BrightHire
- **Opportunity:** Versioned competencies, approved question banks, anchored rating scales, and evidence-linked scorecards.
- **Priority:** High after stabilization
- **Decision:** Pending

### P-02: Candidate self-scheduling and rescheduling

- **Inspired by:** Paradox and HireVue
- **Opportunity:** Calendar sync, timezone-safe availability, reminders, rescheduling, and no-show tracking.
- **Priority:** High after the appointment model is fixed
- **Decision:** Pending

### P-03: Evidence-based interview review

- **Inspired by:** BrightHire
- **Opportunity:** Searchable transcripts, answer highlights, reviewer comments, and scorecard evidence links.
- **Priority:** Medium
- **Decision:** Pending

### P-04: Interviewer coaching and quality analytics

- **Inspired by:** BrightHire
- **Opportunity:** Question consistency, talk-time balance, scorecard completion, and interviewer calibration.
- **Priority:** Medium
- **Decision:** Pending

### P-05: Secure technical assessment workspace

- **Inspired by:** HackerRank and Talview
- **Opportunity:** Coding editor, test cases, code playback, plagiarism signals, identity checks, and integrity controls.
- **Priority:** Later product phase
- **Decision:** Pending
- **Partially done (2026-06-08):** LeetCode-style coding questions shipped — `judge.service.js` (Piston
  API) executes candidate code and judge-verified reference solutions; `questions` table gained
  `language`/`starter_code`/`test_cases` (migration 007); `ExamPage.jsx` ships a CodeMirror editor with
  visible/hidden test-case panels; pass/fail results feed the existing LLM report-scoring pipeline.
  Code playback, plagiarism signals, identity checks, and integrity controls remain open.

### P-06: ATS and collaboration integrations

- **Inspired by:** HireVue, BrightHire, and Talview
- **Opportunity:** Candidate sync and Slack, Teams, or email review notifications.
- **Priority:** Later product phase
- **Decision:** Pending

---

## Recommended Work Order

1. Close `C-01` through `C-06` authorization and assessment-integrity issues.
2. Correct consent and responsible-AI scope in `C-07` and `C-09`.
3. Repair finalization and report reliability in `C-08`, `M-04`, `M-06`, and `M-07`.
4. Build a real appointment and human interview model in `M-08` through `M-10`.
5. Correct manager analytics in `M-11` through `M-14`.
6. Repair workflow promises, authentication, and platform hardening.
7. Remove or implement inactive UI.
8. Add product opportunities only after the core journeys are reliable.
