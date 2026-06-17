# Audit Fixes Progress — 2026-06-17

Branch: `fix/audit-20260617`
Based on: `/senior` analysis session 2026-06-17-00-01
Full findings: `.claude/senior/sessions/2026-06-17-00-01.md`

---

## COMPLETED (this session)

### 1. Magic link single-use enforcement
**File:** `backend/src/services/auth.service.js`
**Fix:** `validateMagicLink` now calls `interviewRepository.updateTokenHash(interview.id, null, null)` immediately after successful validation, consuming the token so it cannot be replayed. Also changed `token_expires` check from optional (`if (interview.token_expires &&`) to mandatory — links with null expiry are now rejected.

### 2. Exam token mandatory expiry
**File:** `backend/src/services/exam.service.js`
**Fix:** `validateInterview` now rejects exams with null `token_expires` instead of treating them as never-expiring. Changed `if (interview.token_expires && ...)` to `if (!interview.token_expires || ...)`.

### 3. Demo credentials removed from source bundle
**File:** `frontend/src/pages/auth/LoginPage.jsx`
**Fix:** Restored the `parseDemoAccounts()` + `VITE_SHOW_DEMO_ACCOUNTS` env-gate that was removed in the last commit. Demo accounts now only render when `VITE_SHOW_DEMO_ACCOUNTS=true` in `.env` — they never ship in the production JS bundle. The `.env` file (gitignored) still has the demo accounts for local dev.

### 4. Non-atomic DB upserts converted to INSERT ON CONFLICT
**Files:** `backend/src/repositories/report.repository.js`, `scorecard.repository.js`, `report-job.repository.js`
**Fix:** All three read-then-write patterns replaced with atomic `INSERT ... ON CONFLICT (interview_id) DO UPDATE SET ...`. Eliminates race conditions that could produce duplicate rows under concurrent report generation.

### 5. LIMIT added to getPendingJobs
**File:** `backend/src/repositories/report-job.repository.js`
**Fix:** Added `LIMIT 10` to `getPendingJobs` query. Prevents unbounded row fetching if a backlog of pending jobs accumulates.

### 6. LLM service hardening
**File:** `backend/src/services/llm.service.js`, `backend/src/services/interview.service.js`
**Fixes:**
- `generateReport`: Gemini fallback now wrapped in its own try/catch; both Groq+Gemini failure now returns the safe borderline fallback instead of propagating
- `getAdaptiveQuestion`: `historyText` capped to last 12 exchanges, each answer truncated via `cleanText` — prevents context overflow on long adaptive interviews
- `extractTagsFromText`: bare `catch {}` replaced with `catch (err) { console.error(...) }`
- `generateSubtopics`: same bare catch fix
- `interview.service.js generateReport`: `qaText` now slices to 30 entries max, answer capped at 800 chars, reference_solution capped at 300 chars — prevents unbounded report prompts

### 7. Storage service fixes
**File:** `backend/src/services/storage.service.js`
**Fixes:**
- `deleteFile`: now checks the Supabase `{ error }` return and throws if non-null — eliminates silent deletion failures
- `uploadReport`: path changed from `report_${reportId}_${Date.now()}.pdf` to stable `report_${reportId}.pdf` with `upsert: true` — prevents orphaned PDFs accumulating on retries

### 8. ReportsPage external candidate "View" button
**File:** `frontend/src/pages/manager/ReportsPage.jsx`
**Fix:** "View" button no longer silently no-ops for external candidates. It now shows an "External" label with muted italic styling instead of a clickable button that does nothing.

### 9. InterviewLandingPage jobTitle from API
**Files:** `backend/src/repositories/interview.repository.js`, `backend/src/services/auth.service.js`, `frontend/src/pages/candidate/InterviewLandingPage.jsx`
**Fix:**
- Added `COALESCE(ct.client_name, ma.subject_name) AS context_title` to `INTERVIEW_COLS`
- `candidateInterviewSummary` now includes `contextTitle`
- `InterviewLandingPage` uses `contextTitle` for `jobTitle` instead of hardcoded 'Client Mock Interview' / 'Monthly Assessment'

---

## REMAINING — NEXT SESSION

Pick up from task 8 in the list below. Start with security-critical items first.

### Priority 1 — Security / Data integrity

#### assertInterviewScope null bypass
**File:** `backend/src/services/candidate-identity.service.js`
**Issue:** `fromUser` guard `if (identity.interviewId && ...)` short-circuits for internal candidates with no interviewId in JWT — they can call interview endpoints for any interview ID.
**Fix:** When `identity.interviewId` is null (dashboard JWT path), the scope check should either fail closed (block all interview actions) or require explicit opt-in. Check how `fromUser` constructs the identity and tighten the null case.

#### Magic link expiry must always be set
**Status:** Partially fixed (exam.service.js and auth.service.js now reject null expiry). Verify `schedule.service.js` always sets `token_expires` when creating interviews.

---

### Priority 2 — UX / Candidate flow (critical paths)

#### ExamPage: Add submit confirmation dialog
**File:** `frontend/src/pages/candidate/ExamPage.jsx`
**Issue:** "Submit exam" button submits immediately with no confirmation — a mis-click is unrecoverable.
**Fix:** Add a `Modal` (use shared `Modal.jsx`) confirming submission, showing count of unanswered questions. Both the sidebar button and the final-question "Next→Submit" path must go through this dialog.

#### DeviceCheckPage: Actionable permission failure copy
**File:** `frontend/src/pages/candidate/DeviceCheckPage.jsx`
**Issue:** Failure message just says "Check browser permissions and retry" — no browser-specific steps.
**Fix:** Show a `<details>` block or tabbed instructions for Chrome/Edge/Firefox explaining exactly which icon to click to unblock permissions.

#### DeviceCheckPage: Speaker check excluded from `finished` computation
**File:** `frontend/src/pages/candidate/DeviceCheckPage.jsx` line ~143
**Issue:** `REQUIRED_CHECK_IDS` includes `'speaker'` but `finished` is computed filtering it out — Continue can enable while speaker is still idle.
**Fix:** Either remove `'speaker'` from `REQUIRED_CHECK_IDS` (accept speaker is self-reported) or include it in the `finished` guard. Also enforce that the tone must have been played before the "I heard it" button is active.

#### ConsentPage: Validate session token before navigation
**File:** `frontend/src/pages/candidate/ConsentPage.jsx`
**Issue:** Navigates to interview without checking if `accessToken` in localStorage is still valid — stale token causes mid-interview auth error.
**Fix:** Decode JWT expiry (`exp` claim) from `localStorage.accessToken` before navigating; if expired, call the magic-link refresh endpoint or redirect back to the landing page.

#### AIInterviewPage: Error state has no retry
**File:** `frontend/src/pages/candidate/AIInterviewPage.jsx` around line 97
**Issue:** `if (interviewError && phase === 'error') return <div style=…>{interviewError}</div>` — no retry button.
**Fix:** Replace with a proper error state card with a "Try again" button and contact support text.

#### DonePage: window.close() does nothing in most browsers
**File:** `frontend/src/pages/candidate/DonePage.jsx` line 30
**Fix:** Replace `window.close()` with a message "You can safely close this tab" and attempt `window.close()` as a secondary effect (it'll work if the tab was opened by script, silently fail otherwise).

#### ExamPage: Timer reads from exam config
**File:** `frontend/src/pages/candidate/ExamPage.jsx` line ~40
**Issue:** `setTimeLeft(3600)` always 60 minutes regardless of exam config.
**Fix:** Read `exam.duration_minutes` from the API response and use `(exam.duration_minutes || 60) * 60` as the timer initial value.

---

### Priority 3 — Backend / API correctness

#### Fix HTTP response codes
**Files:**
- `backend/src/routes/candidate.routes.js`: `GET /report` returns `{ success:true, data:null }` (200) when no report exists — should return 404
- `backend/src/routes/schedule.routes.js`: `POST /email-deliveries/:interviewId/resend` returns 200 with `success: false` on failure — should return 422/503
- `backend/src/services/schedule.service.js`: `getAvailableSlots` returns null (200) when token not found — should throw so route returns 404

#### Remove console.error from route files
**Files:** `backend/src/routes/team.routes.js` (12 instances), `backend/src/routes/client-template.routes.js` (9 instances)
**Fix:** Replace all `console.error(err)` in route catch blocks with a consistent error handler (or just `res.status(500).json({ success: false, error: err.message })`).

---

### Priority 4 — Code quality

#### Convert .then()/.catch() to async/await
**Files:**
- `frontend/src/pages/manager/ClientInterviewsPage.jsx` line 543-550
- `frontend/src/components/manager/MonthlyAssessmentAssignModal.jsx` lines 39-75

#### Remove cosmetic 2FA toggle
**File:** `frontend/src/pages/manager/ManagerProfilePage.jsx` line ~216
**Fix:** Remove the 2FA toggle (it's localStorage-only with no backend, a false security signal). If 2FA is planned for the future, add a coming-soon placeholder instead.

---

### Priority 5 — Infrastructure

#### Add missing DB indexes (migration 006)
Create `backend/migrations/006_missing_indexes.sql` and `006_missing_indexes_sqlserver.sql`:
```sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_transcripts_interview_id ON transcripts(interview_id);
```
Then add `await run('006_missing_indexes.sql')` to `setup-db.js`.

#### Extract parseTags into shared util
**Frontend:** Add `parseTags(value)` to `frontend/src/utils/helpers.js` and replace the 3 duplicate copies in `TeamPage.jsx`, `ClientInterviewsPage.jsx`, `MonthlyAssessmentPage.jsx`.
**Backend:** Add `parseStoredArray(value)` to a new `backend/src/utils/parse.js` and replace the 2 copies in `client-template.routes.js` and `monthly-assessment.service.js`.

#### Create backend/.env.example
Template documenting all required env vars (without actual secrets). See `backend/CLAUDE.md` for the full list.

---

### Priority 6 — After all fixes: run /sync-docs

Run `/sync-docs` to update BRAIN.md, docs/open-issues.md, and all other documentation to reflect the fixes made.

---

## Files changed in this session

```
backend/src/services/auth.service.js           — magic link single-use, context_title
backend/src/services/exam.service.js           — mandatory token_expires check
backend/src/services/llm.service.js            — generateReport try/catch, history cap, bare catches
backend/src/services/storage.service.js        — deleteFile error, uploadReport stable path
backend/src/services/interview.service.js      — qaText cap for report prompt
backend/src/repositories/report.repository.js  — ON CONFLICT upsert
backend/src/repositories/scorecard.repository.js — ON CONFLICT upsert
backend/src/repositories/report-job.repository.js — ON CONFLICT create + getPendingJobs LIMIT
backend/src/repositories/interview.repository.js  — context_title in INTERVIEW_COLS
frontend/src/pages/auth/LoginPage.jsx          — restore env-gated demo accounts
frontend/src/pages/manager/ReportsPage.jsx     — external candidate View button fix
frontend/src/pages/candidate/InterviewLandingPage.jsx — jobTitle from contextTitle
```
