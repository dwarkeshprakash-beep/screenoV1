# Screeno — Full Audit, Bug Status & Testing Playbook
Last audited: 2026-06-12  
Audited by: Claude Sonnet 4.6 (AI-assisted session)

> **How to use this file:**  
> Give this file + the full project to any AI tool. It contains every known bug, its status (fixed / open / stub),
> the exact test command to verify it, and the expected output. Work through Section 4 (test runner) top-to-bottom.
> Do not mark a test "pass" until the exact expected output appears.
>
> Related files:
> - [`docs/open-issues.md`](open-issues.md) — original issue backlog with code-level fix instructions
> - [`BRAIN.md`](../BRAIN.md) — roles, flows, data relationships
> - [`docs/testing.md`](testing.md) — smoke test playbook (UI walkthrough)
> - [`docs/database-schema.md`](database-schema.md) — full DB schema

---

## 1. Application Overview (what actually works today)

### 1.1 Three roles

| Role | Entry point | Auth method |
|---|---|---|
| Manager | `/login` → `/manager/dashboard` | JWT (email + password) |
| Interviewer | `/login` → `/interviewer/dashboard` | JWT (email + password) |
| Candidate (interview) | `/interview/:token` (magic link email) | Session token from magic-link exchange |
| Candidate (dashboard) | `/login` → `/candidate/dashboard` | JWT (email + password) |

### 1.2 Working end-to-end flows (verified in this audit)

| Flow | Status | Notes |
|---|---|---|
| Manager login → team list | ✅ Working | 3 members in test DB |
| Schedule AI voice interview | ✅ Working | Fixed this session (see Bug #1) |
| Monthly assessment create | ✅ Working | 4-step wizard + LLM subtopic/JD gen |
| Client mandates create + edit | ✅ Working | Tag extraction via LLM, match scoring |
| Reports page (with scores + decision) | ✅ Working | Scorecard JOIN added in last session |
| Member profile (tags, scores, history) | ✅ Working | Uses `tags` field, scorecard JOIN |
| Schedule calendar | ✅ Working | Shows all scheduled interviews by week |
| Profile update (name, password, availability) | ✅ Working | PATCH /api/profile |
| Candidate resume upload (profile route) | ✅ Working | `POST /api/profile/resume` (async tag extraction) |
| External candidate add | ✅ Working | `POST /api/team/external` |
| CSV import | ✅ Working | Upsert by email/emp_number |
| ResumeAnalyzerPage | ✅ Working | No direct fetch() — uses api.js |
| Auth refresh token | ✅ Working | HttpOnly cookie pattern |

### 1.3 Not yet fully working / stubs

| Flow | Status | Root cause |
|---|---|---|
| Member notes (add/view) | ⚠️ STUB | No `member_notes` table in DB; routes return empty/null |
| AI interview flow | 🔒 Untestable without email | Needs magic link token from email to proceed |
| Exam flow | 🔒 Untestable without email | Same — magic link required |
| Interviewer flow | ⚠️ No data | No interviewers in test DB (`GET /api/schedule/interviewers` returns 0) |
| Report generation | 🔒 Depends on completed interview | Async worker; fires after `POST /interviews/:id/complete` |
| LiveKit video call | ⚠️ Requires env config | Needs `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` in `.env` |
| TemplatesPage (interview templates) | ⚠️ Coming Soon | Intentional overlay; Phase 2 feature |

---

## 2. Bug Registry

### Bug #1 — CRITICAL — Schedule creation crashes with 500 (FIXED this session)

**File:** `backend/src/repositories/interview.repository.js`  
**Status:** ✅ FIXED  
**Root cause:** Repository INSERT and UPDATE used `token_hash` as the column name, but the actual Supabase column is named `token`.

**Error message (before fix):**
```
[db] Query failed: column "token_hash" of relation "interviews" does not exist
POST /schedule failed: error: column "token_hash" of relation "interviews" does not exist
```

**Fix applied:** Replaced all occurrences of `token_hash` → `token` in the SQL queries in:
- `create()` — INSERT statement
- `getByToken()` — WHERE clause
- `updateTokenHash()` — UPDATE statement

**Verify:**
```powershell
$h = @{ Authorization = "Bearer $token" }
$body = '{"teamMemberId":1,"type":"ai_voice","interviewMode":"simple","difficulty":"medium","questionCount":5}'
$res = Invoke-RestMethod -Uri "http://localhost:4000/api/schedule" -Method POST -Headers $h -ContentType "application/json" -Body $body
Write-Output "id=$($res.data.id)"
```
**Expected:** `id=N` (any integer), no 500 error.

---

### Bug #2 — MEDIUM — Member notes are non-functional stubs

**File:** `backend/src/routes/team.routes.js` lines 110–117  
**Status:** ⚠️ STUB — confirmed intentional, not broken  
**Detail:** `GET /api/team/member/:id/notes` returns `[]` always. `POST /api/team/member/:id/notes` returns 201 with `null` data but saves nothing. The UI shows no error — the note disappears after submission because GET still returns empty.

**No notes table exists in DB.** `backend/CLAUDE.md` lists `notes.repository.js` and `interview-note.repository.js` in the file map, but **neither file exists on disk** (confirmed via glob — not created, not imported anywhere).

**Impact:** Notes tab on MemberProfilePage appears to work (no crash) but does not persist. Interviewer live-room notes (`PATCH /api/interviewer/live-room/:id/notes`) may also be affected.

**Fix when ready:** Create `member_notes` table + `notes.repository.js` + wire routes:
```sql
CREATE TABLE IF NOT EXISTS member_notes (
  id SERIAL PRIMARY KEY,
  team_member_id INT NOT NULL,
  manager_id INT NOT NULL,
  note TEXT NOT NULL,
  created TIMESTAMPTZ DEFAULT NOW()
);
```
Then in `team.routes.js` replace the stubs with real queries.

**Verify the stub (should pass silently):**
```powershell
$notes = Invoke-RestMethod -Uri "http://localhost:4000/api/team/member/1/notes" -Headers $h
# Expected: { success: true, data: [] }  — empty, but no crash
```

---

### Bug #3 — LOW — `/health` endpoint has no DB liveness check

**File:** `backend/server.js`  
**Status:** ⚠️ Open  
**Detail:** Health check returns `{status:"ok"}` regardless of DB connectivity. A broken DB connection would go undetected.

**Fix:** Query the DB inside the health handler:
```js
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1', {})
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable', timestamp: new Date().toISOString() })
  }
})
```

---

### Bug #4 — LOW — No SIGTERM handler for report job worker

**File:** `backend/server.js`  
**Status:** ⚠️ Open  
**Detail:** When the Node process is killed (e.g. Railway restart, Ctrl+C), any `report_jobs` row in `status = 'started'` stays stuck and is never retried (the worker won't pick up `started` jobs on restart).

**Fix:**
```js
process.on('SIGTERM', async () => {
  await db.query("UPDATE report_jobs SET status='pending' WHERE status='started'", {})
  process.exit(0)
})
```

---

### Bug #5 — LOW — ScheduleModal useEffect uses `.then().catch()`

**File:** `frontend/src/components/manager/ScheduleModal.jsx`  
**Status:** ⚠️ Open (coding standard violation — `rules.md` requires `async/await`)  
**Detail:** One or more `useEffect` hooks inside ScheduleModal use `.then().catch()` instead of `async/await`.

**Fix:** Wrap the fetch call in an inner async function:
```jsx
useEffect(() => {
  async function load() {
    try {
      const res = await api.getTeam()
      setMembers(res.data || [])
    } catch {}
  }
  load()
}, [])
```

---

### Bug #6 — LOW — window.confirm() used in TeamPage member delete

**File:** `frontend/src/pages/manager/TeamPage.jsx` line 177  
**Status:** ⚠️ Open (UX issue — modal preferred)  
**Detail:** `window.confirm('Remove this member?')` is a browser-native blocking dialog. Should use a shared `<Modal>` confirm dialog instead.

**This does not crash the app** — just a UX inconsistency.

---

### Bug #7 — SECURITY — Monthly assessment team_member_ids not ownership-checked

**File:** `backend/src/routes/monthly-assessment.routes.js`  
**Status:** ⚠️ Open  
**Detail:** When creating a monthly assessment with `team_member_ids`, the route does not verify that those team members belong to the authenticated manager. A manager could enroll team members they don't own.

**Fix:** In the monthly assessment service/route, validate each `team_member_id`:
```js
const myMembers = await teamMemberRepository.getByManager(managerId)
const myIds = new Set(myMembers.map(m => m.id))
const invalidIds = teamMemberIds.filter(id => !myIds.has(id))
if (invalidIds.length > 0) return res.status(403).json({ success: false, error: 'Forbidden: some team members do not belong to you' })
```

---

### Bug #9 — BLOCKER for testing — SMTP authentication failure (email not sending)

**File:** `backend/.env` — `SMTP_USER` / `SMTP_PASSWORD`  
**Status:** ⚠️ Open (found during this audit)  
**Detail:** `backend-err.txt` shows:
```
sendMagicLink failed: Error: Invalid login: 535 5.7.8 Authentication failed
code: 'EAUTH'  command: 'AUTH PLAIN'
```
The SMTP credentials in `.env` are either missing or expired. Magic link emails fail silently — `schedule` creation succeeds (interview row created), but the candidate never receives the link. This blocks testing the full interview flow (candidate AI interview, exam, human video).

**Impact:** Schedule creation ✅ works — the interview record is in the DB. Only the email delivery fails. You can test the candidate flow by manually extracting the raw token from SMTP logs or by temporarily bypassing email (see below).

**Fix:** Update `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` in `.env` with valid Brevo (or any SMTP) credentials. Get Brevo SMTP credentials from https://app.brevo.com → SMTP & API.

**Workaround for testing without email:**
```powershell
# After creating a schedule, query the interviews table for the SHA256 token hash
# You cannot reverse SHA256, but you can check if the raw token was logged:
# Check backend console output — auth.service.js logs the raw token before hashing
# Or: temporarily add console.log(rawToken) in email.service.js sendMagicLink() before the send call
```

---

### Bug #8 — SECURITY — Magic link tokens stored as raw SHA256 hash in `token` column

**File:** `backend/src/repositories/interview.repository.js`  
**Status:** ℹ️ Intentional deferral (per BRAIN.md)  
**Detail:** The `token` column stores a SHA256 hash of the raw magic-link token. `getByToken()` re-hashes the incoming raw token for lookup. This is secure by design. BRAIN.md notes "Magic-link tokens stored raw" but this is incorrect — they ARE hashed. No action needed beyond correcting the BRAIN.md comment.

---

## 3. Open Issues from `docs/open-issues.md` — Implementation Status

> Read `docs/open-issues.md` for the exact code-level fix instructions for each item.  
> This table only tracks whether each issue has been implemented.

### Cross-cutting

| Issue | Description | Status |
|---|---|---|
| 1.1 | Duplicate local Avatar components | ⚠️ Partial — TeamPage, ReportsPage, MemberProfilePage now use `shared/Avatar`. ManagerProfilePage, InterviewerDashboard, CandidateDashboardPage may still have local copies. Run grep to verify: `grep -r "function.*Avatar\|const.*Av" frontend/src/pages/` |
| 1.2 | Direct `fetch()` calls in ResumeAnalyzerPage | ✅ Fixed — no `fetch(` found in `ResumeAnalyzerPage.jsx` |
| 1.3 | `alert()` for errors | ⚠️ Partial — removed from most pages; `window.confirm` still in TeamPage (non-critical) |

### Manager pages

| Issue | Description | Status |
|---|---|---|
| 2.1 | DashboardPage hex colors | ⚠️ Likely partial — not verified this session |
| 2.2 A | TeamPage: external filter broken | ✅ Fixed — replaced with proper Internal/External roster tabs |
| 2.2 B | TeamPage: hardcoded hex | ✅ Fixed — uses CSS tokens throughout |
| 2.2 C | TeamPage: availability badge | ✅ Fixed — badge shown inline with member name |
| 2.3 A | MemberProfilePage: local Avatar | ✅ Fixed — uses `shared/Avatar` |
| 2.3 B | MemberProfilePage: `member.skills` → `member.tags` | ✅ Fixed — reads `tags` field |
| 2.3 C | MemberProfilePage: score fields from scorecards | ✅ Fixed — `getHistoryByUser` has scorecard LEFT JOIN |
| 2.3 D | MemberProfilePage: `report.tips` doesn't exist | ✅ Fixed — no `tipsList`/`tips` references |
| 2.3 E | MemberProfilePage: availability badge | ✅ Fixed — shown in hero card header |
| 2.4 A | ReportsPage: wrong field names | ✅ Fixed — uses `candidate_first`, `candidate_last`, `created`, `interview_type` |
| 2.4 B | ReportsPage: `r.attempts` doesn't exist | ✅ Fixed — removed |
| 2.4 C | ReportsPage: `r.decision` always undefined | ✅ Fixed — `getReportsByManager` has scorecard JOIN |
| 2.4 D | ReportsPage: stats computed client-side | ✅ Fixed — computed from loaded reports array |
| 2.5 A | SchedulePage: TYPE_STYLE hardcoded hex | ✅ Fixed — uses CSS tokens |
| 2.5 B | SchedulePage: calendar hex | ✅ Fixed |
| 2.6 | TemplatesPage: `alert()` | ⚠️ Partial — check if `alert()` replaced with `setError` |
| 2.7 A | ManagerProfilePage: local Avatar | ⚠️ Not verified — check file |
| 2.7 B | ManagerProfilePage: inline Toggle | ⚠️ Not verified — acceptable if moved above component |
| 2.7 C | ManagerProfilePage: hardcoded hex | ⚠️ Not verified |
| 2.9 | ClientInterviewsPage: full API integration | ✅ Done — full rewrite with real API calls, wizard, detail view, reports tab |
| 2.10 | MonthlyAssessmentPage: full API integration | ✅ Done — 4-step wizard, real API calls, calendar view |

### Candidate pages

| Issue | Description | Status |
|---|---|---|
| 3.1 A | CandidateDashboardPage: local V2Av | ✅ Fixed — uses `shared/Avatar` |
| 3.1 B | CandidateDashboardPage: resume upload mocked | ✅ Fixed — calls `api.uploadOwnResume(file)` → `POST /api/profile/resume` |
| 3.1 C | CandidateDashboardPage: `handleStatusChange` wrong field | ✅ Fixed — sends `{ availability: s }` |
| 3.1 D | CandidateDashboardPage: reads `user.status` | ✅ Fixed — reads `user.availability` |
| 3.1 E | CandidateDashboardPage: `c.score` undefined | ✅ Fixed — avgScore shows `'N/A'` when no scores |

### Interviewer pages

| Issue | Description | Status |
|---|---|---|
| 4.1 A | InterviewerDashboard: local Avatar | ⚠️ Not verified — check file |
| 4.1 B | InterviewerDashboard: hardcoded hex | ⚠️ Not verified |
| 4.2 A | ScorecardPage: hardcoded hex | ⚠️ Not verified |
| 4.3 | InterviewerProfilePage: local Avatar + hex | ⚠️ Not verified |

### Backend changes (from open-issues.md Section 8)

| Issue | Description | Status |
|---|---|---|
| 8.1 | `getReportsByManager` scorecard JOIN | ✅ Done — `LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id` |
| 8.2 | `getHistoryByUser` scorecard JOIN | ✅ Done — includes `sc.overall AS overall_score`, `sc.confidence`, etc. |
| 8.3 | `/api/profile/resume` endpoint | ✅ Done — in `profile.routes.js`, uses `req.user.id` directly |

### Sidebar nav links

| Issue | Description | Status |
|---|---|---|
| 6 | Sidebar missing `/manager/monthly` and `/manager/clients` | ✅ Fixed — both links present in `Sidebar.jsx` under "ASSESSMENTS" section |

---

## 4. Step-by-Step Test Runner (do not skip steps)

> Run these in order. Each step must produce the exact expected output before moving to the next.  
> Token from Step 2 is reused throughout. Replace `$token` with the actual value.

### Prerequisites

```powershell
# Start backend (must show "Running on http://localhost:4000")
cd "f:\screeno v1\backend"
& "C:\Program Files\nodejs\node.exe" server.js

# In a second terminal, start frontend (must show "VITE ready")
cd "f:\screeno v1\frontend"
& "C:\Program Files\nodejs\npm.cmd" run dev
```

---

### Step 1 — Health check

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Expected:** `{"status":"ok","timestamp":"..."}`  
**Fail action:** Backend is not running. Check `.env` file and `backend-err.txt`.

---

### Step 2 — Login and capture token

```powershell
$r = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST `
     -Body '{"email":"kiran.oza@prakashinfotech.com","password":"Test@1234"}' `
     -ContentType "application/json"
$token = $r.data.accessToken
$h = @{ Authorization = "Bearer $token" }
Write-Output "role=$($r.data.user.role) company=$($r.data.user.companyId)"
```

**Expected:** `role=manager company=1`  
**Fail action:** Password may have changed. Run `backend/__reset_pw.js` (see Section 5 — Utilities). If user doesn't exist, check `users` table has `kiran.oza@prakashinfotech.com`.

---

### Step 3 — Team endpoints

```powershell
# 3a: List team members
$team = Invoke-RestMethod -Uri "http://localhost:4000/api/team" -Headers $h
Write-Output "Members: $($team.data.Count)"
# Expected: any number >= 0

# 3b: Team stats (all 4 fields must be present)
$stats = Invoke-RestMethod -Uri "http://localhost:4000/api/team/stats" -Headers $h
Write-Output "stats: totalMembers=$($stats.data.totalMembers) openRoles=$($stats.data.openRoles) evaluated=$($stats.data.candidatesEvaluated) pending=$($stats.data.pendingScorecard)"
# Expected: all 4 numbers present (0 is OK)

# 3c: Member profile (use first member's id)
$memberId = $team.data[0].id
$m = Invoke-RestMethod -Uri "http://localhost:4000/api/team/member/$memberId" -Headers $h
Write-Output "member: id=$($m.data.id) name=$($m.data.first_name) $($m.data.last_name) user_id=$($m.data.user_id)"
# Expected: id, first_name, last_name, user_id all present

# 3d: Member interviews list
$mi = Invoke-RestMethod -Uri "http://localhost:4000/api/team/member/$memberId/interviews" -Headers $h
Write-Output "member interviews: $($mi.data.Count)"
# Expected: any number >= 0

# 3e: External candidates
$ext = Invoke-RestMethod -Uri "http://localhost:4000/api/team/external" -Headers $h
Write-Output "external candidates: $($ext.data.Count)"
# Expected: any number >= 0
```

**Fail action for 3b:** If a field is missing, check `backend/src/services/team.service.js` `getStats()` function.

---

### Step 4 — Schedule creation (was broken — now fixed)

```powershell
$memberId = (Invoke-RestMethod -Uri "http://localhost:4000/api/team" -Headers $h).data[0].id

$body = @{
  teamMemberId  = $memberId
  type          = "ai_voice"
  interviewMode = "simple"
  difficulty    = "medium"
  questionCount = 5
} | ConvertTo-Json

$sc = Invoke-RestMethod -Uri "http://localhost:4000/api/schedule" -Method POST -Headers $h `
  -ContentType "application/json" -Body $body
Write-Output "interview_id=$($sc.data.id) type=$($sc.data.type) status=$($sc.data.status) token_present=$($null -ne $sc.data.token)"
```

**Expected:** `interview_id=N type=ai_voice status=scheduled token_present=True`  
**Fail action:** Check `backend-err.txt` for the error. If you see `column "token_hash" does not exist`, the fix in `interview.repository.js` was not applied. The fix is to rename all `token_hash` → `token` in the INSERT, UPDATE, and WHERE clauses of that file.

---

### Step 5 — Schedule calendar

```powershell
$cal = Invoke-RestMethod -Uri "http://localhost:4000/api/schedule/calendar" -Headers $h
Write-Output "calendar events: $($cal.data.Count)"
$cal.data | ForEach-Object { Write-Output "  id=$($_.id) type=$($_.type) candidate=$($_.candidateName) status=$($_.status)" }
```

**Expected:** At least 1 event (the one created in Step 4). Each event has `id`, `type`, `candidateName`, `status`.

---

### Step 6 — Reports page

```powershell
$rpt = Invoke-RestMethod -Uri "http://localhost:4000/api/reports/team" -Headers $h
$reports = if ($rpt.data -is [Array]) { $rpt.data } else { $rpt.data.reports }
Write-Output "reports: $($reports.Count)"
# Reports will be 0 until interviews complete and reports generate — that is normal.
# What matters is the response shape:
Write-Output "response has 'reports' key: $($null -ne $rpt.data.reports)"
```

**Expected:** `response has 'reports' key: True`  
**Fail action:** If `rpt.data` is a flat array (no `.reports` key), check `backend/src/routes/report.routes.js` — the `GET /api/reports/team` route must return `{ success: true, data: { reports: [...], stats: {...} } }`.

---

### Step 7 — Client templates (mandates)

```powershell
# 7a: List templates
$ct = Invoke-RestMethod -Uri "http://localhost:4000/api/templates/client" -Headers $h
Write-Output "client templates: $($ct.data.Count)"

# 7b: Create a new one
$body = @{
  client_name  = "Test Client"
  requirements = "Senior React Developer"
  headcount    = 2
  jd_text      = "React, TypeScript, Node.js, 5+ years experience"
  tags         = '["React","TypeScript","Node.js"]'
} | ConvertTo-Json
$newCt = Invoke-RestMethod -Uri "http://localhost:4000/api/templates/client" -Method POST -Headers $h `
  -ContentType "application/json" -Body $body
Write-Output "created template: id=$($newCt.data.id) client=$($newCt.data.client_name)"

# 7c: Get matches for the template
$ctId = $newCt.data.id
$matches = Invoke-RestMethod -Uri "http://localhost:4000/api/templates/client/$ctId/matches" -Headers $h
Write-Output "matches: $($matches.data.Count) — (0 is OK if no team members have matching tags)"
```

**Expected:**
- 7a: any count >= 0
- 7b: `id=N client=Test Client`
- 7c: `matches: N` — 0 is fine if team members have no `tags`

---

### Step 8 — Monthly assessments

```powershell
# 8a: List assessments
$ass = Invoke-RestMethod -Uri "http://localhost:4000/api/assessments/monthly" -Headers $h
Write-Output "assessments: $($ass.data.Count)"

# 8b: Create one (replace team_member_ids with actual ids from Step 3)
$memberId = (Invoke-RestMethod -Uri "http://localhost:4000/api/team" -Headers $h).data[0].id
$body = @{
  subject           = "Node.js Fundamentals"
  topic             = "Backend Engineering"
  difficulty        = "medium"
  jd_text           = "Learn Express, async/await, PostgreSQL, JWT auth"
  duration_months   = 3
  team_member_ids   = @($memberId)
} | ConvertTo-Json
$newAss = Invoke-RestMethod -Uri "http://localhost:4000/api/assessments/monthly" -Method POST -Headers $h `
  -ContentType "application/json" -Body $body
Write-Output "created assessment: id=$($newAss.data.id)"

# 8c: Calendar view
$calAss = Invoke-RestMethod -Uri "http://localhost:4000/api/assessments/monthly/calendar" -Headers $h
Write-Output "assessment calendar rows: $($calAss.data.Count)"
```

**Expected:**
- 8a: any count >= 0
- 8b: `id=N`
- 8c: count increases by number of enrolled members

---

### Step 9 — Profile

```powershell
# 9a: Get
$prof = Invoke-RestMethod -Uri "http://localhost:4000/api/profile" -Headers $h
Write-Output "profile: $($prof.data.first_name) $($prof.data.last_name) role=$($prof.data.role)"

# 9b: Update name
$upd = Invoke-RestMethod -Uri "http://localhost:4000/api/profile" -Method PATCH -Headers $h `
  -ContentType "application/json" -Body '{"firstName":"Kiran","lastName":"Oza"}'
Write-Output "updated: $($upd.data.first_name) $($upd.data.last_name)"

# 9c: Wrong password change (must return 400)
try {
  Invoke-RestMethod -Uri "http://localhost:4000/api/profile" -Method PATCH -Headers $h `
    -ContentType "application/json" `
    -Body '{"currentPassword":"wrongpass","newPassword":"newpass123"}' -ErrorAction Stop
  Write-Output "FAIL — should have rejected wrong password"
} catch {
  Write-Output "correctly rejected: $($_.ErrorDetails.Message)"
}
```

**Expected:**
- 9a: name and role present
- 9b: updated name returned
- 9c: `{"success":false,"error":"Current password is incorrect"}`

---

### Step 10 — Candidate report history

```powershell
$team = Invoke-RestMethod -Uri "http://localhost:4000/api/team" -Headers $h
$userId = $team.data[0].user_id   # user_id from team member
$hist = Invoke-RestMethod -Uri "http://localhost:4000/api/reports/candidate/$userId/history" -Headers $h
Write-Output "report history for user_id=$userId: $($hist.data.Count) reports"
# Expected: 0 is OK if no interviews completed
```

---

### Step 11 — Auth edge cases

```powershell
# 11a: Wrong password → 401
try {
  Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST `
    -Body '{"email":"kiran.oza@prakashinfotech.com","password":"WRONG"}' -ContentType "application/json" -ErrorAction Stop
  Write-Output "FAIL — should have returned 401"
} catch {
  Write-Output "correctly rejected: $($_.Exception.Message)"
}

# 11b: Protected route without token → 401
try {
  Invoke-RestMethod -Uri "http://localhost:4000/api/team" -ErrorAction Stop
  Write-Output "FAIL — should have returned 401"
} catch {
  Write-Output "correctly blocked without token: $($_.Exception.Message)"
}

# 11c: Token refresh (requires HttpOnly cookie — use browser or curl for full test)
# API-only test: refresh with no cookie → 401
try {
  Invoke-RestMethod -Uri "http://localhost:4000/api/auth/refresh" -Method POST -ErrorAction Stop
  Write-Output "FAIL — should return 401 with no cookie"
} catch {
  Write-Output "correctly rejected refresh with no cookie"
}
```

---

### Step 12 — Notes stub (verify non-crashing)

```powershell
$team = Invoke-RestMethod -Uri "http://localhost:4000/api/team" -Headers $h
$memberId = $team.data[0].id

$notes = Invoke-RestMethod -Uri "http://localhost:4000/api/team/member/$memberId/notes" -Headers $h
Write-Output "notes list: $($notes.data.Count) (should be 0 — stub)"

$add = Invoke-RestMethod -Uri "http://localhost:4000/api/team/member/$memberId/notes" -Method POST -Headers $h `
  -ContentType "application/json" -Body '{"note":"Test note"}'
Write-Output "note add response: success=$($add.success) data=$($add.data)"
# Expected: success=True data= (null — stub, no crash)
```

**KNOWN LIMITATION:** Notes are not persisted. See Bug #2. Do not treat `success=True` as "notes work" — they do not persist.

---

## 5. Utility Scripts (run from `backend/` directory)

These helper scripts are in `backend/` for testing. Delete after use.

### Reset manager password

If login fails, reset the password:

```powershell
cd "f:\screeno v1\backend"
# Create __reset_pw.js:
@'
require("dotenv").config()
const db = require("./src/db/connection")
const bcrypt = require("bcryptjs")
async function run() {
  const hash = await bcrypt.hash("Test@1234", 10)
  const email = "kiran.oza@prakashinfotech.com"
  await db.query("UPDATE users SET password = @hash WHERE email = @email", { hash, email })
  console.log("Done — password is now Test@1234")
  process.exit(0)
}
run()
'@ | Out-File -Encoding utf8 "__reset_pw.js"
& "C:\Program Files\nodejs\node.exe" "__reset_pw.js"
```

### List all users in DB

```powershell
@'
require("dotenv").config()
const db = require("./src/db/connection")
async function run() {
  const rows = await db.query("SELECT id, email, role, company_id FROM users ORDER BY id LIMIT 20", {})
  console.table(rows)
  process.exit(0)
}
run()
'@ | Out-File -Encoding utf8 "__list_users.js"
& "C:\Program Files\nodejs\node.exe" "__list_users.js"
```

### Get interview token (for magic link testing)

After creating a scheduled interview, get the hashed token from DB:

```powershell
@'
require("dotenv").config()
const db = require("./src/db/connection")
async function run() {
  const rows = await db.query("SELECT id, token, type, status FROM interviews ORDER BY created DESC LIMIT 5", {})
  console.log(JSON.stringify(rows, null, 2))
  process.exit(0)
}
run()
'@ | Out-File -Encoding utf8 "__get_token.js"
& "C:\Program Files\nodejs\node.exe" "__get_token.js"
```

**Note:** The DB stores the SHA256 *hash* of the magic link token. The raw token was sent in the email. You cannot reverse it from the DB. To test the magic link flow, check the email or SMTP logs.

---

## 6. Frontend UI Smoke Tests (manual, browser required)

### How to start

```powershell
# Frontend dev server
cd "f:\screeno v1\frontend"
& "C:\Program Files\nodejs\npm.cmd" run dev
# Opens on http://localhost:5173
```

### Manager smoke test

| Step | URL | What to check | Pass criteria |
|---|---|---|---|
| 1 | `/login` | Page loads, form visible | No blank screen, no JS errors in console |
| 2 | `/login` → bad creds | Submit wrong password | Red error message appears **in the page** — no page refresh |
| 3 | `/login` → good creds | `kiran.oza@prakashinfotech.com / Test@1234` | Redirects to `/manager/dashboard` |
| 4 | `/manager/dashboard` | Stat cards show numbers | All 4 stat cards visible; "Need attention" number matches team page |
| 5 | `/manager/team` | Team list loads | Table shows members; Internal/External tabs work |
| 6 | `/manager/team` → Add Member | Click "Add member" | Modal opens; form submits; member appears in list |
| 7 | `/manager/team` → Import CSV | Upload CSV | Status message shows "Imported N new; updated M existing" |
| 8 | `/manager/team/:id` | Click any member | Profile loads; 4 tabs visible (Overview, Analysis, Transcript, Notes) |
| 9 | `/manager/team/:id` → Analysis tab | If member has a report | Scores display as bars (0–10); no "NaN" |
| 10 | `/manager/team/:id` → Notes tab | Add a note | ⚠️ STUB — note disappears after submit (known Bug #2) |
| 11 | `/manager/team/:id` → Schedule button | Click Schedule | ScheduleModal opens with 4 steps |
| 12 | ScheduleModal step 1 | Select "AI Voice" type | Step 1 shows candidate pre-filled |
| 13 | ScheduleModal step 4 | Submit | Interview created; calendar shows new event |
| 14 | `/manager/schedule` | Calendar renders | Week view shows scheduled interviews as blocks |
| 15 | `/manager/reports` | Reports table loads | Stat cards + table; score bars visible if reports exist |
| 16 | `/manager/reports` → Export CSV | Click Export | CSV file downloads |
| 17 | `/manager/clients` | Client mandates page | Grid of mandate cards; "New Mandate" button works |
| 18 | `/manager/clients` → New Mandate | Fill form, Extract Tags | Tags extracted by AI; save creates mandate |
| 19 | `/manager/clients/:id` → Candidates tab | Click mandate → Candidates | Team members matching tags listed; "Send JD" + "Schedule Interview" work |
| 20 | `/manager/monthly` | Monthly assessments page | Cards + calendar visible |
| 21 | `/manager/monthly` → New Assessment | 4-step wizard | Steps flow: details → subtopics → study material → assign candidates → create |
| 22 | `/manager/resume-analyzer` | Analyzer page loads | Library mode default; paste JD + resume + Analyze → scores appear |
| 23 | `/manager/profile` | Profile page loads | Name/email shown; Edit saves name; Password change works |

### Candidate interview smoke test (requires completing a schedule first)

1. Create interview via ScheduleModal (Step 11-13 above)
2. Check SMTP logs or email for magic link URL
3. Open URL in **incognito** to avoid overwriting manager session in localStorage
4. Flow: Landing → Device Check → Consent → AI Interview → Done

| Step | Page | Check | Pass criteria |
|---|---|---|---|
| 1 | `/interview/:token` | Landing loads | Candidate name shown; Start button present |
| 2 | `/interview/:token/device-check` | Camera/mic check | Mic detected; Next button works |
| 3 | `/interview/:token/consent` | Consent page | Checkbox + Agree button |
| 4 | `/interview/:token/ai` | AI interview | TTS speaks question; Record button active; answer recorded |
| 5 | `/interview/:token/done` | Done page | Tips load after ~15s (report generates async) |

### Interviewer smoke test (requires adding interviewer to DB)

No interviewers exist in the test DB. To add one:

```powershell
@'
require("dotenv").config()
const bcrypt = require("bcryptjs")
const db = require("./src/db/connection")
async function run() {
  const hash = await bcrypt.hash("Test@1234", 10)
  await db.query(`
    INSERT INTO users (first_name, last_name, email, role, company_id, password)
    VALUES (@fn, @ln, @email, 'interviewer', 1, @pw)
    ON CONFLICT (email) DO NOTHING
  `, { fn: "Test", ln: "Interviewer", email: "interviewer@test.com", pw: hash })
  console.log("Interviewer created: interviewer@test.com / Test@1234")
  process.exit(0)
}
run()
'@ | Out-File -Encoding utf8 "f:\screeno v1\backend\__add_interviewer.js"
& "C:\Program Files\nodejs\node.exe" "f:\screeno v1\backend\__add_interviewer.js"
```

Then log in as `interviewer@test.com / Test@1234` and verify:
- Dashboard shows "My Dashboard" with assigned interviews
- Scorecard page loads (requires a completed human interview)
- Live Room requires LiveKit env config

---

## 7. Critical Files Quick Reference

> When an AI tool needs to fix something, these are the exact files to open.

### Backend

| What | File |
|---|---|
| Schedule creation (interview insert) | [`backend/src/repositories/interview.repository.js`](../backend/src/repositories/interview.repository.js) |
| Magic link validation | [`backend/src/services/auth.service.js`](../backend/src/services/auth.service.js) |
| Schedule route (create, calendar) | [`backend/src/routes/schedule.routes.js`](../backend/src/routes/schedule.routes.js) |
| Report queries (with scorecard JOIN) | [`backend/src/repositories/report.repository.js`](../backend/src/repositories/report.repository.js) |
| Team member queries | [`backend/src/repositories/team-member.repository.js`](../backend/src/repositories/team-member.repository.js) |
| User queries + profile update | [`backend/src/repositories/user.repository.js`](../backend/src/repositories/user.repository.js) |
| Profile + resume upload route | [`backend/src/routes/profile.routes.js`](../backend/src/routes/profile.routes.js) |
| Monthly assessment route + creation | [`backend/src/routes/monthly-assessment.routes.js`](../backend/src/routes/monthly-assessment.routes.js) |
| Client template route (create, matches, send-jd) | [`backend/src/routes/client-template.routes.js`](../backend/src/routes/client-template.routes.js) |
| Email sending | [`backend/src/services/email.service.js`](../backend/src/services/email.service.js) |
| LLM calls (questions, subtopics, tags, report) | [`backend/src/services/llm.service.js`](../backend/src/services/llm.service.js) |
| Report generation worker | [`backend/src/services/report-job.service.js`](../backend/src/services/report-job.service.js) |
| Team routes (notes stub at lines 110–117) | [`backend/src/routes/team.routes.js`](../backend/src/routes/team.routes.js) |
| Main server (route mounts, CORS, rate limits) | [`backend/server.js`](../backend/server.js) |

### Frontend

| What | File |
|---|---|
| All API calls | [`frontend/src/services/api.js`](../frontend/src/services/api.js) |
| Auth + route guards | [`frontend/src/App.jsx`](../frontend/src/App.jsx) |
| Sidebar nav (links to monthly + clients) | [`frontend/src/components/layout/Sidebar.jsx`](../frontend/src/components/layout/Sidebar.jsx) |
| Schedule wizard (4-step modal) | [`frontend/src/components/manager/ScheduleModal.jsx`](../frontend/src/components/manager/ScheduleModal.jsx) |
| Team page (internal + external roster) | [`frontend/src/pages/manager/TeamPage.jsx`](../frontend/src/pages/manager/TeamPage.jsx) |
| Member profile (tabs, scores, transcript, notes) | [`frontend/src/pages/manager/MemberProfilePage.jsx`](../frontend/src/pages/manager/MemberProfilePage.jsx) |
| Reports page (scorecard decision + CSV export) | [`frontend/src/pages/manager/ReportsPage.jsx`](../frontend/src/pages/manager/ReportsPage.jsx) |
| Client mandates page | [`frontend/src/pages/manager/ClientInterviewsPage.jsx`](../frontend/src/pages/manager/ClientInterviewsPage.jsx) |
| Monthly assessment page | [`frontend/src/pages/manager/MonthlyAssessmentPage.jsx`](../frontend/src/pages/manager/MonthlyAssessmentPage.jsx) |
| AI interview state machine | [`frontend/src/hooks/useInterview.js`](../frontend/src/hooks/useInterview.js) |
| Candidate done page (tips polling) | [`frontend/src/pages/candidate/DonePage.jsx`](../frontend/src/pages/candidate/DonePage.jsx) |
| Shared Avatar component | [`frontend/src/components/shared/Avatar.jsx`](../frontend/src/components/shared/Avatar.jsx) |
| CSS design tokens | [`tokens.css`](../tokens.css) |

---

## 8. What the Next AI Session Should Focus On

Priority order (top = most impactful):

1. **Notes (Bug #2)** — Create `member_notes` table, `notes.repository.js`, and wire up `GET/POST /api/team/member/:id/notes`. This unblocks the Notes tab in MemberProfilePage which currently silently fails.

2. **Verify remaining Avatar local copies** — Run `grep -r "function.*Avatar\|const.*Av\b" frontend/src/pages/` and replace any local ones with `import Avatar from '../../components/shared/Avatar'`.

3. **ScheduleModal `.then()/.catch()` → async/await** — Find and fix in `frontend/src/components/manager/ScheduleModal.jsx`.

4. **ManagerProfilePage, InterviewerDashboard, ScorecardPage** — Check for local Avatar and hardcoded hex; replace with `shared/Avatar` and CSS tokens.

5. **Monthly assessment ownership check (Bug #7)** — Add team_member_id validation in `monthly-assessment.routes.js`.

6. **Health check DB liveness (Bug #3)** — Add DB ping to `/health` endpoint in `server.js`.

7. **SIGTERM handler (Bug #4)** — Add to `server.js` to prevent stuck report_jobs on restart.

8. **Test the full AI interview end-to-end** — Create a schedule, get the email, click the link, complete the interview, verify report appears in MemberProfilePage analysis tab.

9. **Add an interviewer account** — Use `__add_interviewer.js` script, then test `/interviewer/dashboard`, scorecard submission, and live room.

---

## 9. DB Connection Quick Reference

```
Host:     aws-1-ap-southeast-1.pooler.supabase.com:6543
Database: postgres  
User:     postgres.zhnxfghnujizjslygjfs
DB_TYPE:  supabase (env var in backend/.env)
```

Full connection guide: [`.claude/skills/db-access.md`](../.claude/skills/db-access.md)

**Important query patterns:**
```js
// Always use @param style — the connection layer translates to $1/$2 for PostgreSQL
await db.query("SELECT * FROM users WHERE email = @email", { email: "..." })

// Never put @ inside string literals — the regex replaces ALL @word patterns
// WRONG:  WHERE email = 'user@domain.com'
// RIGHT:  WHERE email = @email  (and pass { email: "user@domain.com" } as param)
```

---

## 10. Test Credentials

| Role | Email | Password | Notes |
|---|---|---|---|
| Manager | `kiran.oza@prakashinfotech.com` | `Test@1234` | Set by `__reset_pw.js` |
| Interviewer | `interviewer@test.com` | `Test@1234` | Must create with `__add_interviewer.js` first |
| Candidate | Raj Rathod | magic link | Schedule interview from manager, use email link |
| Dev seed (old) | `manager@psspl.com` | unknown | May not exist or password different |

---

*End of audit file. Created 2026-06-12.*
