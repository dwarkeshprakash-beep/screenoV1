# Screeno — Testing Guide

> Full app test playbook: backend API, frontend UI, auth, middleware, interview flow.
> Run through this top-to-bottom before any release or after any major change.

---

## Setup checklist

Before testing, confirm all of the following:

```bash
# Backend running on port 4000
cd backend && node server.js
# Expected: [db] Connected to: Supabase (PostgreSQL)
#           [server] Running on http://localhost:4000

# Frontend running on port 5173
cd frontend && npm run dev
# Expected: VITE v8 ready in X ms → Local: http://localhost:5173

# Health check
curl http://localhost:4000/health
# Expected: {"status":"ok","timestamp":"..."}
```

**Test credentials (Supabase)**

| Role        | Name              | Email                                      | Password     |
|-------------|-------------------|--------------------------------------------|--------------|
| Manager     | Kiran Oza         | kiran.oza@prakashinfotech.com              | Admin@1234   |
| Interviewer | Dwarkesh Vajjala  | dwarkesh.vajjala@prakashinfotech.com       | Admin@1234   |
| Candidate   | Raj Rathod        | raj.rathod@prakashinfotech.com             | magic link   |

**Note:** `manager@psspl.com / Test@1234` is the original dev seed account — still works.

**Test candidate:** Raj Rathod is in the `candidates` table. Manager schedules an interview → Raj gets a magic link email. Open the link to start the interview.

---

## 1 — Health & infrastructure

| # | Test | Expected |
|---|------|----------|
| 1.1 | `GET http://localhost:4000/health` | `{"status":"ok"}` |
| 1.2 | Open `http://localhost:5173` | Login page loads, no blank screen |
| 1.3 | Open browser DevTools → Console | No JS errors on initial load |
| 1.4 | Network tab on login page | No failed requests before you do anything |

---

## 2 — Auth flow

### 2.1 Login (UI)

| # | Step | Expected |
|---|------|----------|
| 2.1.1 | Open `/login`, enter wrong email/password, click Sign In | **Error message appears on page** — no page refresh, no blank |
| 2.1.2 | Enter `manager@psspl.com` / `Test@1234`, click Sign In | Redirects to `/manager/dashboard` |
| 2.1.3 | Check `localStorage` in DevTools | `accessToken` and `user` are set |
| 2.1.4 | Navigate directly to `/login` while logged in | Still goes to `/manager/dashboard` (or `/login` if no redirect guard) |
| 2.1.5 | Try opening `/manager/dashboard` in a new tab with no token | Redirected to `/login` |

### 2.2 Login (API)

```bash
# Should return 401 — NOT redirect
POST /api/auth/login
Body: {"email":"bad@email.com","password":"wrong"}
Expected: 401 {"success":false,"error":"Invalid email or password"}

# Should return 200 with token
POST /api/auth/login
Body: {"email":"manager@psspl.com","password":"Test@1234"}
Expected: 200 {"success":true,"data":{"accessToken":"...","user":{...}}}
```

### 2.3 Token refresh

```bash
# After login (cookie is set)
POST /api/auth/refresh
Expected: 200 {"success":true,"data":{"accessToken":"..."}}

# With no cookie
POST /api/auth/refresh  (no cookie)
Expected: 401 {"success":false,"error":"Session expired..."}
```

### 2.4 Logout

```bash
POST /api/auth/logout   (with valid Bearer token + refresh cookie)
Expected: 200 {"success":true,"data":null}
# After logout: localStorage accessToken and user should be cleared
```

### 2.5 Magic link (candidate)

```bash
# Simulate candidate clicking their email link
POST /api/auth/magic-link/:token
Expected: 200 {"success":true,"data":{"sessionToken":"...","interview":{...}}}

# Wrong token
POST /api/auth/magic-link/badtoken123
Expected: 400 or 500 with error message

# NOTE: the field is `sessionToken` not `accessToken`
# Frontend stores it as `localStorage.accessToken`
```

### 2.6 Role middleware

```bash
# Manager token hitting a manager-only route — should work
GET /api/team   (with manager JWT)
Expected: 200

# Manager token hitting candidate route — depends on route; mostly 200 since
# candidate routes use authMiddleware only (no requireRole)

# No token on a protected route
GET /api/team   (no Authorization header)
Expected: 401 {"success":false,"error":"Not authenticated"}

# Invalid/expired token
GET /api/team   (Authorization: Bearer invalidtoken)
Expected: 401 {"success":false,"error":"Not authenticated"}
```

---

## 3 — Manager API

### 3.1 Team

```bash
GET  /api/team                    # list all (filter=all|overdue|never)
GET  /api/team/stats              # {openRoles, candidatesEvaluated, pendingScorecard, totalMembers}
GET  /api/team/activity           # [{what, sub, when}] last 10 events
GET  /api/team/member/:id         # single member
POST /api/team/member             # {firstName, lastName, email, phone, type}
PATCH /api/team/member/:id        # partial update
DELETE /api/team/member/:id       # soft delete

GET  /api/team/member/:id/notes   # [{id, note, created}]
POST /api/team/member/:id/notes   # {note: "text"}

GET  /api/team/member/:id/interviews  # all interviews for member (Phase 3)

POST /api/team/import             # {csv: "first_name,email\nJohn,john@co.com"}
```

**Key checks:**
- `GET /api/team/stats` — all 4 fields present (`openRoles`, `candidatesEvaluated`, `pendingScorecard`, `totalMembers`)
- `GET /api/team/activity` — array, each item has `what`, `sub`, `when`
- `GET /api/team/member/:id/interviews` — returns array (may be empty, that's fine)
- Adding a note with empty body → 400 `{error: "Note is required"}`

### 3.2 Templates

```bash
GET    /api/templates            # list all for company
POST   /api/templates            # {name*, description, attempts, type, focusPrompt}
PATCH  /api/templates/:id        # partial update — name, description, attempts
DELETE /api/templates/:id        # hard delete
```

**Key checks:**
- Create without `name` → 400 `{error: "name is required"}`
- PATCH → returns updated template
- DELETE → 200 success; second GET shows it's gone
- PATCH/DELETE another company's template → 404 (company_id guard)

### 3.3 Schedule

```bash
POST /api/schedule               # create interview + send magic link email
GET  /api/schedule/calendar      # calendar events
GET  /api/schedule/slots/:token  # public — available slots for self-schedule
```

**Key checks (schedule create):**
- Required fields: `candidateId`, `type`
- After create → interview row exists in DB, email sent via Resend
- `window_closes` is set based on `windowDays`

### 3.4 Reports

```bash
GET /api/reports/team            # all candidates + latest report scores (includes pdf_url)
GET /api/reports/candidate/:id   # single candidate's latest report
```

**Key checks:**
- `GET /api/reports/team` response — each row has `pdf_url` field (may be null if no PDF yet)
- `GET /api/reports/candidate/:id` with no report → `{success:true, data:null}`

---

## 4 — Interview flow (AI voice)

All interview routes require a valid JWT (candidate session token from magic link).

```bash
# Step 1: Start interview — generates AI questions
POST /api/interviews/:id/start
Expected: {interviewId, attemptId, questions:[...], firstQuestion, mode, transcriptionMode}

# Step 2: Save each answer (multipart with audio blob)
POST /api/interviews/:id/answer
Form fields: audio (file), questionId, mode, transcriptionMode, attemptId
Expected: {nextQuestion} or {done:true}

# Step 3: Log proctoring events (optional)
POST /api/interviews/:id/proctoring
Body: {type, severity, occurred, details, attemptId}
Expected: {success:true}

# Step 4: Complete interview — triggers async report generation
POST /api/interviews/:id/complete
Body: {attemptId}
Expected: {success:true}

# Step 5: Get transcript (Phase 3)
GET /api/interviews/:id/transcript
Expected: [{question, answer_text, phase, order_num}] — Q&A pairs from latest attempt
```

**Key checks:**
- Start with used-up attempts → 403 `{error: "All attempts used"}`
- Start within cooldown window → 429 `{error: "Please wait..."}`
- Answer without questionId → 400
- Answer without audio → 400
- Complete without attemptId → 400
- Transcript on interview with no completed attempt → `{data: []}`

---

## 5 — Exam flow

Exam routes are **public** (no JWT, uses magic link token directly).

```bash
# Load exam questions
GET /api/exam/:token
Expected: {interview:{id,type,mode,difficulty}, questions:[{id,text,question_type,options,correct_answer,order_num}]}

# Submit all answers at once
POST /api/exam/:token/submit
Body: {answers: [{questionId, selectedOption}] or [{questionId, answerText}]}
Expected: {success:true, data:{attemptId}}
```

**Key checks:**
- GET with expired token → 404 `{error: "Invalid or expired link"}`
- Submit with non-array answers → 400
- After submit: `GET /api/reports/candidate/:id` should eventually have a report (report is async)

---

## 6 — Candidate self-service

Requires candidate JWT from magic link.

```bash
GET /api/candidate/interviews    # candidate's own interview list
GET /api/candidate/report        # candidate's latest report (for DonePage tips polling)
```

**Key checks:**
- Both endpoints require valid JWT — 401 without token
- `GET /api/candidate/report` returns `{data: null}` if no report ready yet (not an error)
- `GET /api/candidate/report` returns report with `tips` JSON array once report is generated

---

## 7 — Interviewer flow

```bash
GET  /api/interviewer/schedule         # today's interviews for the logged-in interviewer
GET  /api/interviewer/scorecards       # interviews awaiting scorecard
POST /api/interviewer/scorecard/:id    # submit scorecard {scores, notes, recommendation}
GET  /api/interviewer/scorecard-data/:id   # load existing scorecard data
POST /api/interviewer/livekit-token    # {roomName, participantName} → LiveKit JWT
```

---

## 8 — Upload

```bash
POST /api/upload/resume   # multipart: resume (PDF file) + candidateId
Expected: {success:true, data:{resumeUrl:"https://res.cloudinary.com/..."}}
```

**Key checks:**
- Non-PDF file → should reject (or accept — check multer config)
- After upload: `GET /api/team/member/:id` should have `resume_url` set

---

## 9 — Profile

```bash
GET   /api/profile          # manager's own profile {id, name, email, company}
PATCH /api/profile          # {firstName, lastName, currentPassword, newPassword}
```

**Key checks:**
- PATCH with wrong `currentPassword` → 400 or 403
- PATCH with only `firstName` (no password change) → updates name only

---

## 10 — Manager UI smoke test

Open `http://localhost:5173`, log in as manager, and walk through each page:

| Page | URL | What to verify |
|------|-----|----------------|
| Dashboard | `/manager/dashboard` | Stat cards show numbers (not `—`); Activity feed has items or "No recent activity" |
| Team | `/manager/team` | Member list loads; filter tabs work; "Add Member" modal opens |
| Member Profile | `/manager/team/:id` | All 5 tabs clickable; Overview shows resume placeholder; Analysis shows scores if report exists; Transcript shows Q&A or empty state; Exam shows results or empty state; Notes tab loads + add note works |
| Schedule | `/manager/schedule` | Calendar renders; no JS error |
| Reports | `/manager/reports` | Table loads; search filters; "View Report" opens modal; if report has PDF → Download button visible |
| Templates | `/manager/templates` | List loads; "New Template" form works; "Edit" opens modal; "Delete" asks confirmation; "Use Template" opens ScheduleModal with template pre-filled |
| Manager Profile | `/manager/profile` | Name/email shown; can change name; password change form present |

---

## 11 — Candidate UI smoke test

1. **Schedule an interview** from manager side for any team member
2. **Check backend log** — magic link email sent (or check Resend dashboard)
3. **Copy the magic link token** from the DB or backend log
4. Open `/interview/:token` in a browser (or incognito)

| Step | Page | What to verify |
|------|------|----------------|
| 1 | Landing `/interview/:token` | Candidate name + company shown; "Start Interview" or device check CTA |
| 2 | Device Check `/device-check` | Camera/mic check UI; "All good" or device error |
| 3 | Consent `/consent` | Consent text; checkbox; "I agree" button |
| 4 | AI Interview `/ai` | Question spoken via TTS; recording starts; answer recorded; next question appears |
| 5 | Done `/done` | Completion screen; tips spinner while polling; tips appear after ~15s |

For **exam** type:
| Step | Page | What to verify |
|------|------|----------------|
| 1 | Exam `/exam` | MCQ questions load; timer shows; navigation buttons work |
| 2 | Submit | Auto-submit on timer; manual submit button; redirects to Done |

---

## 12 — Interviewer UI smoke test

Log in as an interviewer (create one in DB or via team page):

| Page | URL | What to verify |
|------|-----|----------------|
| Dashboard | `/interviewer/dashboard` | Schedule list (empty is OK); pending scorecards |
| Live Room | `/interviewer/live/:id` | LiveKit room loads (needs LIVEKIT_URL env set); video tiles |
| Scorecard | `/interviewer/scorecard/:id` | Form renders; submit works |

---

## 13 — Error & edge cases

| Scenario | Expected behavior |
|----------|-------------------|
| Login with wrong password | Error message on screen — **no page refresh** |
| Access protected route with expired JWT | Redirect to `/login` |
| Team member with no interviews | Transcript tab → "No transcript available" empty state |
| Team member with no report | Analysis tab → "No report available" empty state |
| Template DELETE → confirm modal → Cancel | Template is NOT deleted |
| Schedule with no JD text | Allowed — JD is optional |
| Magic link used after `window_closes` | 400 or 404 "Link has expired" |
| `GET /api/candidate/report` with no report ready | `{success:true, data:null}` — not an error |
| DonePage before report is generated | Spinner shows for ~15s, then tips appear or spinner stops |

---

## 14 — Quick API regression script

Run from PowerShell after any backend change:

```powershell
$env:Path = $env:Path + ";C:\Program Files\nodejs"

# Login
$r = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST `
     -Body '{"email":"manager@psspl.com","password":"Test@1234"}' -ContentType "application/json"
$token = $r.data.accessToken
$h = @{ Authorization = "Bearer $token" }

# Run checks
@(
  @{ label="health";      url="http://localhost:4000/health" },
  @{ label="team";        url="http://localhost:4000/api/team" },
  @{ label="stats";       url="http://localhost:4000/api/team/stats" },
  @{ label="activity";    url="http://localhost:4000/api/team/activity" },
  @{ label="templates";   url="http://localhost:4000/api/templates" },
  @{ label="reports";     url="http://localhost:4000/api/reports/team" },
  @{ label="calendar";    url="http://localhost:4000/api/schedule/calendar" },
  @{ label="profile";     url="http://localhost:4000/api/profile" }
) | ForEach-Object {
  try {
    $res = Invoke-RestMethod -Uri $_.url -Headers $h
    Write-Host "[PASS] $($_.label)"
  } catch {
    Write-Host "[FAIL] $($_.label) — $($_.Exception.Message)"
  }
}
```

---

## 15 — Known limitations (not bugs)

| Item | Detail |
|------|--------|
| Transcript shows 0 Q&A | Only populated after an AI interview attempt is **completed** — "scheduled" interviews have no answers yet |
| `pdf_url` is null | PDF generation is async fire-and-forget after interview completes. May take 10–30s |
| DonePage tips | Candidate-facing tips poll for the report. If the report takes >18s (3× 5s retries), tips won't show — they'll see "You can safely close this tab" instead |
| Magic link `sessionToken` vs `accessToken` | Backend returns `sessionToken`, frontend stores as `localStorage.accessToken`. This is intentional. Raw API tests must use `.data.sessionToken` |
| Same-browser multi-role testing | Logging in as a candidate via magic link overwrites `localStorage.accessToken`. Use incognito for candidate to avoid kicking out manager session |
| LiveKit in dev | Requires `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` in backend `.env`. Live room will fail silently without these |
| Resend email in dev | `RESEND_FROM=onboarding@resend.dev` only delivers to the Resend account owner's verified email. Use Resend dashboard to verify delivery |
