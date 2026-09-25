# CLAUDE.md — backend/

> Auto-loaded when Claude Code works in backend/. Read root CLAUDE.md first.
> Full DB connection code: `.claude/skills/db-access.md`

---

## Stack

```
Node.js 20 + Express 5
pg                  PostgreSQL driver (currently pointed at Supabase; portable to any Postgres host)
bcryptjs            password hashing
jsonwebtoken        JWT tokens
cookie-parser       refresh-token cookie
cors                CORS (origin allowlist from FRONTEND_URL)
multer              file uploads (memory storage — buffers only)
@supabase/supabase-js  file storage (resumes/reports — bucket "files" in the same Supabase project as the DB)
Human interview links are stored on interviews as Google Meet or manager-provided URLs; LiveKit is not part of the active V2 runtime.
nodemailer          transactional email over SMTP (Brevo)
pdfkit / pdf-parse / mammoth   PDF & docx generation/parsing (reports, resume analysis)
dotenv              .env loading
```

LLM (Groq gpt-oss-120b → Gemini 3.6 Flash fallback) and Groq Whisper STT are called via plain `fetch()`
to their REST endpoints — **no SDK packages installed** (`@google/generative-ai`, `groq-sdk` are NOT deps).
See `services/llm.service.js` and `services/transcription.service.js`.

Coding-assessment code execution goes through the free hosted **Piston** judge API
(`https://emkc.org/api/v2/piston/execute`) via plain `fetch()` — same no-SDK convention, no API key.
See `services/judge.service.js`. Supported languages: JavaScript, Python (`LANGUAGE_VERSIONS` map).

There is no `node-cron` dependency — the report-generation worker is a polling loop started from
`server.js` (`reportJobService.startReportJobWorker()`), not a cron job.

---

## DB connection

```
backend/src/db/
├── connection.js           ← factory: the only file repositories import
└── supabase.connection.js  ← PostgreSQL via pg (points at Supabase today; portable to any Postgres host)
```

Exposes `query(sql, params)` and `transaction(callback)`.

All repositories use `@param` style SQL — the connection layer converts `@name` → `$1, $2` automatically.

**To move to a different Postgres host:** change `.env` `DATABASE_URL` (data still needs to be dumped/restored separately — see `.claude/skills/db-access.md`).

Full code with comments: `.claude/skills/db-access.md`

---

## Folder layout (actual, as of current `dev`)

```
backend/
├── src/
│   ├── routes/           ← HTTP only - parse the request, call ONE service, send the response
│   │   ├── auth.routes.js               /api/auth
│   │   ├── team.routes.js               /api/team
│   │   ├── interview.routes.js          /api/interviews        (candidate session token)
│   │   ├── candidate.routes.js          /api/candidate         (candidate dashboard)
│   │   ├── report.routes.js             /api/reports
│   │   ├── schedule.routes.js           /api/schedule
│   │   ├── client-template.routes.js    /api/templates/client  (client mandates)
│   │   ├── monthly-assessment.routes.js /api/assessments/monthly
│   │   ├── interview-flow.routes.js     /api/interview-flows
│   │   ├── exam.routes.js               /api/exam
│   │   ├── upload.routes.js             /api/upload
│   │   ├── profile.routes.js            /api/profile
│   │   ├── admin.routes.js              /api/admin             (platform admin repair tools)
│   │   ├── user.routes.js               /api/users
│   │   ├── role.routes.js               /api/roles
│   │   ├── module.routes.js             /api/modules
│   │   ├── acl.routes.js                /api/acls
│   │   ├── permission.routes.js         /api/permissions
│   │   └── organization.routes.js       /api/organizations
│   ├── services/         ← Business logic — no SQL here
│   │   ├── auth.service.js              login/refresh/logout, password reset, magic links
│   │   ├── access.service.js            RBAC: loads a user's modules + permissions
│   │   ├── candidate-identity.service.js  who "the candidate" is for a token
│   │   ├── candidate.service.js         candidate dashboard: interviews, feedback, mandates, monthly plans
│   │   ├── profile.service.js           the signed-in user's own profile
│   │   ├── team.service.js              manager's team members
│   │   ├── schedule.service.js          creating/rescheduling interviews
│   │   ├── interview.service.js         AI interview runtime (start, answers, complete)
│   │   ├── interview-window.service.js  when an interview may be launched
│   │   ├── interview-flow.service.js    multi-stage interview flows
│   │   ├── interview-flow-expiry.service.js  worker: processes expired flow stages
│   │   ├── exam.service.js              exam runtime
│   │   ├── judge.service.js             runs candidate code via the free Piston API (plain fetch)
│   │   ├── report.service.js            scope-aware report reads + signed PDF links
│   │   ├── report-job.service.js        worker: generates interview reports async
│   │   ├── client-mandate.service.js    mandates: access, create/edit, archive, delete, status
│   │   ├── client-mandate-requirements.service.js  requirement profiles (roles) on a mandate
│   │   ├── client-mandate-team.service.js  mandate candidates: matches, team, JD, scheduling, outcome rounds
│   │   ├── mandate-lifecycle.service.js permanent mandate delete + impact preview
│   │   ├── mandate-status.service.js    mandate status timeline
│   │   ├── monthly-assessment.service.js  monthly subjects, enrollments, plans
│   │   ├── upload.service.js            resume/JD uploads, AI resume analysis
│   │   ├── resume.service.js            a user's resume pool
│   │   ├── document-text.service.js     text extraction from PDF/DOCX/TXT
│   │   ├── admin.service.js             platform-admin inspection and repair
│   │   ├── user.service.js / role.service.js / module.service.js / acl.service.js /
│   │   │   permission.service.js / organization.service.js   RBAC administration
│   │   ├── llm.service.js               Groq → Gemini via fetch
│   │   ├── transcription.service.js     Groq Whisper (audio in, text out, never persisted)
│   │   ├── pdf.service.js               report PDFs
│   │   ├── email.service.js             nodemailer/SMTP
│   │   ├── google-meet.service.js       Google Calendar/Meet links
│   │   └── storage.service.js           Supabase Storage (bucket "files")
│   ├── repositories/     ← SQL queries only - no business logic here. Multi-statement
│   │                        transactions live here too (db.transaction), never in services.
│   │   ├── user, user-role, role, role-acl-permission, acl, module, permission, company
│   │   ├── team-member, external-candidate, resume
│   │   ├── interview, interview-history, interview-flow, transcript, scorecard, exam
│   │   ├── report, report-job
│   │   ├── client-template, client-mandate-requirements, client-team, client-outcome-rounds,
│   │   │   mandate-status-history, mandate-lifecycle
│   │   ├── monthly-assessment
│   │   ├── email-delivery, email-outbox, refresh-token, password-reset
│   │   └── admin                        (all files are <name>.repository.js)
│   ├── workers/
│   │   └── outbox-worker.js             sends queued emails (monthly links, password reset, welcome)
│   ├── middleware/
│   │   ├── auth.js                      validate JWT access token
│   │   ├── access.js                    loadAccess / requireModule / requirePlatformAdmin (RBAC)
│   │   ├── upload.js                    multer config (memory storage)
│   │   ├── rate-limit.js                in-memory rate limiter
│   │   └── auth-rate-limit-key.js       rate-limit key for auth routes
│   ├── utils/
│   │   ├── fetch-with-timeout.js        AbortSignal.timeout wrapper for external calls
│   │   ├── parse.js                     parseStoredArray(), parsePositiveInt()
│   │   ├── pagination.js / sql-search.js  list paging + LIKE-pattern helpers
│   │   ├── password-policy.js           password rules
│   │   └── resume-context.js            resume text for LLM prompts
│   ├── config/                          app.config.js, auth.js (token lifetimes)
│   └── db/
│       ├── connection.js                factory (import this everywhere)
│       └── supabase.connection.js       PostgreSQL via pg
├── migrations/   ← numbered SQL files, plus migrate.js — the one runner that
│                    applies them, whether the DB is brand-new or already exists
├── test/         ← node:test unit tests (npm test) + api-regression.js
├── server.js     ← mounts routes, security headers, CORS, rate limits, starts the workers
├── package.json
└── .env
```

Three background workers run in-process, started from `server.js`: the report generator
(`reportJobService.startReportJobWorker()`), interview-flow expiry
(`interviewFlowExpiryService.startInterviewFlowExpiryWorker()`), and the email outbox
(`outboxWorker.startWorker()`). There is no cron dependency. Schema changes are numbered `.sql` files dropped straight into
`migrations/` — run `npm run migrate` (from `backend/`) to apply whatever's pending. It tracks applied
files in a `schema_migrations` table and works against either a brand-new database (a fresh clone with
just `DATABASE_URL` set) or the existing live Supabase DB — it detects which case it's in and applies
accordingly. Nothing else needs editing to register a new migration. See `docs/database-schema.md` for
the full shape.

---

## .env (all required)

```bash
PORT=4000
NODE_ENV=development

# App branding — single source for the display name used in emails, PDF
# reports, and the frontend UI/title. Change this one value to rebrand.
APP_NAME=Screeno

# DB
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres

# Auth
JWT_SECRET=          # generate: node -e "require('crypto').randomBytes(64).toString('hex')|console.log"
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d

# AI (all free)
GROQ_API_KEY=        # console.groq.com
GEMINI_API_KEY=      # aistudio.google.com

# Files (Supabase Storage — bucket "files", public, folders resumes/ and reports/)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Email — SMTP via nodemailer (Gmail, Brevo, or any SMTP provider)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=   # plain address ("noreply@screeno.com") or combined ("Screeno <noreply@screeno.com>") — single source for sender name + address
EMAIL_REDIRECT_TO=   # comma-separated override; staging redirects all mail to these addresses

# Frontend URL (for CORS + email links)
FRONTEND_URL=http://localhost:5173
```

---

## API routes (actual, mounted in `server.js`)

Generated from the route files - every endpoint, grouped by mount point. Check the route file for
the permission each one needs (`requireModule` / `requirePlatformAdmin`).

```
GET    /api/auth/me/access
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password
GET    /api/auth/reset-password/:token
POST   /api/auth/reset-password
GET    /api/auth/magic-link/:token
POST   /api/auth/magic-link/:token/claim
POST   /api/auth/magic-link/:token

GET    /api/team
GET    /api/team/not-in-team
GET    /api/team/stats
GET    /api/team/activity
GET    /api/team/interview-history
GET    /api/team/member/:id
POST   /api/team/member
PATCH  /api/team/member/:id
DELETE /api/team/member/:id
GET    /api/team/member/:id/interviews
POST   /api/team/import
GET    /api/team/external
POST   /api/team/external
GET    /api/team/organization-users/:userId
GET    /api/team/organization-users/:userId/interviews

POST   /api/interviews/:id/start
POST   /api/interviews/:id/answer
POST   /api/interviews/:id/proctoring
GET    /api/interviews/:id/transcript
GET    /api/interviews/:id/report
POST   /api/interviews/:id/complete

GET    /api/reports/team
GET    /api/reports/jobs
POST   /api/reports/jobs/:id/retry
GET    /api/reports/interview/:id
GET    /api/reports/detail/:id
GET    /api/reports/candidate/:userId
GET    /api/reports/candidate/:userId/history

GET    /api/schedule/slots/:token
GET    /api/schedule/org-users
GET    /api/schedule/email-deliveries/:interviewId
POST   /api/schedule/email-deliveries/:interviewId/resend
POST   /api/schedule
GET    /api/schedule/interviews
GET    /api/schedule/:interviewId
POST   /api/schedule/:interviewId/cancel
POST   /api/schedule/:interviewId/reschedule

GET    /api/candidate/interviews
POST   /api/candidate/interviews/:id/launch
POST   /api/candidate/interviews/:id/join
GET    /api/candidate/report
GET    /api/candidate/reports
GET    /api/candidate/client-mandates
POST   /api/candidate/client-mandates/:ctId/resume
GET    /api/candidate/client-mandates/:ctId/resume
GET    /api/candidate/monthly-assessments
GET    /api/candidate/client-outcomes

POST   /api/templates/client
GET    /api/templates/client
GET    /api/templates/client/managers
GET    /api/templates/client/bdes
POST   /api/templates/client/:id/archive
POST   /api/templates/client/:id/restore
DELETE /api/templates/client/:id
GET    /api/templates/client/:id
GET    /api/templates/client/:id/status
POST   /api/templates/client/:id/status/complete
PATCH  /api/templates/client/:id
POST   /api/templates/client/extract-tags
GET    /api/templates/client/:id/requirements
POST   /api/templates/client/:id/requirements
PATCH  /api/templates/client/:id/requirements/:rqId
DELETE /api/templates/client/:id/requirements/:rqId
GET    /api/templates/client/:id/matches
GET    /api/templates/client/:id/team
POST   /api/templates/client/:id/team
PATCH  /api/templates/client/:id/team/:ctId
PATCH  /api/templates/client/:id/team/:ctId/requirement
DELETE /api/templates/client/:id/team/:ctId
POST   /api/templates/client/:id/team/:ctId/send-jd
POST   /api/templates/client/:id/team/:ctId/schedule
POST   /api/templates/client/:id/send-jd
GET    /api/templates/client/:id/assignments
DELETE /api/templates/client/:id/assignments/:interviewId
GET    /api/templates/client/:id/team/:ctId/rounds
POST   /api/templates/client/:id/team/:ctId/rounds
PATCH  /api/templates/client/:id/team/:ctId/rounds/:roundId
POST   /api/templates/client/:id/team/:ctId/rounds/:roundId/publish
POST   /api/templates/client/:id/team/:ctId/rounds/:roundId/unpublish

GET    /api/exam/:token
POST   /api/exam/:token/submit

POST   /api/upload/resume
POST   /api/upload/extract-text
POST   /api/upload/jd
POST   /api/upload/analyze-resume

GET    /api/profile
GET    /api/profile/resume-metadata
PATCH  /api/profile
POST   /api/profile/resume
GET    /api/profile/resumes
PATCH  /api/profile/resume/:assetId/default
DELETE /api/profile/resume/:assetId

POST   /api/assessments/monthly
GET    /api/assessments/monthly
GET    /api/assessments/monthly/calendar
GET    /api/assessments/monthly/plan
POST   /api/assessments/monthly/generate-subtopics
POST   /api/assessments/monthly/generate-jd
POST   /api/assessments/monthly/:id/assign
PUT    /api/assessments/monthly/:id
DELETE /api/assessments/monthly/enrollments/:id
DELETE /api/assessments/monthly/:id

GET    /api/admin/companies
GET    /api/admin/mandates
PATCH  /api/admin/mandates/:id/reassign
POST   /api/admin/users
PATCH  /api/admin/mandates/:id/force-status
DELETE /api/admin/mandates/:id/force-delete
GET    /api/admin/interviews
PATCH  /api/admin/interviews/:id/force-status
PATCH  /api/admin/client-teams/:id/force-status
POST   /api/admin/client-teams/:id/reassign-requirement
GET    /api/admin/broken-states

GET    /api/roles
GET    /api/roles/:id
GET    /api/roles/:id/users
POST   /api/roles
PATCH  /api/roles/:id
DELETE /api/roles/:id

GET    /api/users
GET    /api/users/:id
GET    /api/users/:id/access
GET    /api/users/:id/interviews
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

GET    /api/modules
GET    /api/modules/unassigned-acls
PATCH  /api/modules/:id
POST   /api/modules/:id/assign-acl

GET    /api/acls
GET    /api/acls/:id
POST   /api/acls
PATCH  /api/acls/:id
GET    /api/acls/:id/permissions
PUT    /api/acls/:id/permissions
DELETE /api/acls/:id

GET    /api/permissions
GET    /api/permissions/:id
GET    /api/permissions/:id/roles
POST   /api/permissions

GET    /api/organizations
GET    /api/organizations/:id
GET    /api/organizations/:id/summary
POST   /api/organizations
PATCH  /api/organizations/:id
DELETE /api/organizations/:id

POST   /api/interview-flows
PATCH  /api/interview-flows/:flowId
DELETE /api/interview-flows/:flowId
GET    /api/interview-flows/mandate/:mandateId
GET    /api/interview-flows/mandate/:mandateId/runs
GET    /api/interview-flows/mandate/:mandateId/schedules
POST   /api/interview-flows/:flowId/runs
GET    /api/interview-flows/runs/:runId/definition
PATCH  /api/interview-flows/runs/:runId/definition
POST   /api/interview-flows/runs/:runId/retry
POST   /api/interview-flows/runs/:runId/continue
POST   /api/interview-flows/runs/:runId/process-expired
DELETE /api/interview-flows/runs/:runId
GET    /api/interview-flows/my-assignments
PATCH  /api/interview-flows/assignments/:assignmentId/feedback
POST   /api/interview-flows/assignments/:assignmentId/complete

GET    /health                                 ← health check
```

---

## Strict layer pattern (never break this)

Routes never import a repository or `db/connection`; services never contain SQL.

```js
// ✅ CORRECT - three separate concerns (simplified from the real report files)

// routes/report.routes.js - HTTP only
router.get('/detail/:id', async (req, res) => {
  try {
    const report = await reportService.getReportById(parseInt(req.params.id, 10), req.user.id, reportScope(req))
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' })
    res.json({ success: true, data: report })
  } catch (err) {
    console.error('GET /reports/detail/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

// services/report.service.js - business rules (who may see what, signed links)
async function getReportById(reportId, userId, scope) {
  const report = scope.viewAll
    ? await reportRepository.getDetailByIdForCompany(reportId, scope.companyId)
    : await reportRepository.getDetailByIdForSelf(reportId, userId)
  if (!report) return null
  report.transcripts = await transcriptRepository.getByInterview(report.interview_id)
  return attachSignedReportUrl(report)
}

// repositories/report.repository.js - SQL only, @param style
async function getDetailByIdForCompany(reportId, companyId) {
  const rows = await db.query(`SELECT ... FROM reports r ... WHERE r.id = @reportId AND ...`, { reportId, companyId })
  return rows[0] || null
}
```

**Errors:** expected failures (not found, validation, conflicts) are thrown by the service with
`err.httpStatus` set and a user-facing message; the route returns that status and message, and
turns anything else into a 500 with a generic message. See `client-mandate.service.js` /
`client-template.routes.js` for the pattern.

**Transactions:** a multi-statement transaction is one repository function
(`db.transaction(async tx => ...)`). When business rules must run inside the lock, the service passes
a callback (e.g. `interviewRepository.claimByTokenHash(tokenHash, validate)`).

Use the live routes/services/repositories in `backend/src/` as the source of truth for further examples.
