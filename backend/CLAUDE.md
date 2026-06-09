# CLAUDE.md — backend/

> Auto-loaded when Claude Code works in backend/. Read root CLAUDE.md first.
> Full DB connection code: `.claude/skills/db-access.md`

---

## Stack

```
Node.js 20 + Express 5
pg                  PostgreSQL driver (Supabase current)
mssql               SQL Server driver (SSMS future)
bcryptjs            password hashing
jsonwebtoken        JWT tokens
cookie-parser       refresh-token cookie
cors                CORS (origin allowlist from FRONTEND_URL)
multer              file uploads (memory storage — buffers only)
@supabase/supabase-js  file storage (resumes/reports — bucket "files" in the same Supabase project as the DB)
livekit-server-sdk  LiveKit room tokens for human interviews
nodemailer          transactional email over SMTP (Brevo)
pdfkit / pdf-parse / mammoth   PDF & docx generation/parsing (reports, resume analysis)
dotenv              .env loading
```

LLM (Groq Llama 3.3 70B → Gemini 2.0 Flash fallback) and Groq Whisper STT are called via plain `fetch()`
to their REST endpoints — **no SDK packages installed** (`@google/generative-ai`, `groq-sdk` are NOT deps).
See `services/llm.service.js` and `services/transcription.service.js`.

Coding-assessment code execution goes through the free hosted **Piston** judge API
(`https://emkc.org/api/v2/piston/execute`) via plain `fetch()` — same no-SDK convention, no API key.
See `services/judge.service.js`. Supported languages: JavaScript, Python (`LANGUAGE_VERSIONS` map).

There is no `node-cron` dependency — the report-generation worker is a polling loop started from
`server.js` (`reportJobService.startReportJobWorker()`), not a cron job.

---

## DB connection — two files, one interface

```
backend/src/db/
├── connection.js           ← factory: reads DB_TYPE env var, loads correct file
├── supabase.connection.js  ← PostgreSQL via pg (CURRENT — DB_TYPE=supabase)
└── sqlserver.connection.js ← SQL Server via mssql (FUTURE — DB_TYPE=sqlserver)
```

Both files expose the same function: `query(sql, params)`

All repositories use `@param` style SQL. The connection layer translates:
- Supabase: converts `@name` → `$1, $2` automatically
- SQL Server: uses `@name` natively

**To switch from Supabase to SQL Server:** change `.env` `DB_TYPE=sqlserver`

Full code with comments: `.claude/skills/db-access.md`

---

## Folder layout (actual, as of current `dev`)

```
backend/
├── src/
│   ├── routes/           ← HTTP only — receive, call service, respond
│   │   ├── auth.routes.js          /api/auth
│   │   ├── team.routes.js          /api/team
│   │   ├── interview.routes.js     /api/interviews
│   │   ├── interviewer.routes.js   /api/interviewer
│   │   ├── candidate.routes.js     /api/candidate
│   │   ├── report.routes.js        /api/reports
│   │   ├── schedule.routes.js      /api/schedule
│   │   ├── template.routes.js      /api/templates
│   │   ├── exam.routes.js          /api/exam
│   │   ├── upload.routes.js        /api/upload
│   │   └── profile.routes.js       /api/profile
│   ├── services/         ← Business logic — no SQL here
│   │   ├── auth.service.js
│   │   ├── team.service.js
│   │   ├── interview.service.js
│   │   ├── schedule.service.js
│   │   ├── llm.service.js          ← Groq → Gemini via fetch (questions, adaptive Q, report)
│   │   ├── transcription.service.js← Groq Whisper API (audio buffer in, text out, never persisted)
│   │   ├── report-job.service.js   ← polling worker: generates interview reports async
│   │   ├── pdf.service.js          ← pdfkit/pdf-parse/mammoth report & resume parsing
│   │   ├── email.service.js        ← nodemailer/SMTP — magic links, schedule + report-ready notices
│   │   ├── storage.service.js      ← Supabase Storage uploads (stable path per candidate resume, bucket "files")
│   │   └── judge.service.js        ← runs candidate code via the free Piston API (no key/SDK — plain fetch)
│   ├── repositories/     ← SQL queries only — no business logic here
│   │   ├── user.repository.js
│   │   ├── candidate.repository.js
│   │   ├── interview.repository.js
│   │   ├── question.repository.js
│   │   ├── answer.repository.js
│   │   ├── attempt.repository.js
│   │   ├── scorecard.repository.js
│   │   ├── proctoring.repository.js
│   │   ├── notes.repository.js
│   │   ├── interview-note.repository.js
│   │   ├── schedule-record.repository.js
│   │   ├── email-delivery.repository.js
│   │   ├── refresh-token.repository.js
│   │   ├── report.repository.js
│   │   └── report-job.repository.js
│   ├── middleware/
│   │   ├── auth.js         ← validate JWT access token
│   │   ├── role.js         ← requireRole('manager'|'candidate'|'interviewer')
│   │   ├── upload.js       ← multer config (memory storage) for file uploads
│   │   └── rate-limit.js   ← in-memory rate limiter (auth + write limiters in server.js)
│   └── db/
│       ├── connection.js           ← factory (import this everywhere)
│       ├── supabase.connection.js  ← PostgreSQL
│       └── sqlserver.connection.js ← SQL Server
├── migrations/   ← paired NNN_name.sql (Postgres, ADD COLUMN IF NOT EXISTS) +
│                    NNN_name_sqlserver.sql (SSMS, IF NOT EXISTS sys.columns check)
├── server.js   ← mounts routes, security headers, CORS, rate limits, starts report-job worker
├── package.json
└── .env
```

There is no `jobs/` folder — the only background worker is `reportJobService.startReportJobWorker()`,
started in-process from `server.js`. Schema changes go through `migrations/` (paired SQL files) AND a
matching `await run(...)` alignment call in `setup-db.js` — running `node setup-db.js` applies them to
the live Supabase DB (it's idempotent, safe to re-run). See `docs/database-schema.md` for the full shape.

---

## .env (all required)

```bash
PORT=4000
NODE_ENV=development

# DB — which to use
DB_TYPE=supabase     # change to 'sqlserver' to switch

# Supabase (current)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres

# SQL Server (future)
DB_SERVER=localhost
DB_DATABASE=Screeno
DB_USER=screeno_user
DB_PASSWORD=

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

# Video
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Email — SMTP (Brevo) via nodemailer, NOT Resend
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM_NAME=Screeno
MAIL_FROM_EMAIL=
EMAIL_REDIRECT_TO=   # comma-separated override; staging redirects all mail to these addresses

# Frontend URL (for CORS + email links)
FRONTEND_URL=http://localhost:5173
```

---

## API routes (actual, mounted in `server.js`)

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/magic-link/:token            ← candidate access via magic-link token

GET    /api/team                              ← manager: list team members (?filter=)
GET    /api/team/not-in-team
GET    /api/team/stats
GET    /api/team/activity
GET    /api/team/member/:id
POST   /api/team/member
PATCH  /api/team/member/:id
DELETE /api/team/member/:id
GET    /api/team/member/:id/interviews
GET    /api/team/member/:id/notes
POST   /api/team/member/:id/notes
POST   /api/team/import                       ← bulk CSV

POST   /api/schedule                          ← create interview schedule
GET    /api/schedule/calendar
GET    /api/schedule/slots/:token
GET    /api/schedule/interviewers
GET    /api/schedule/org-users                ← all active company users (for report-recipient suggestions)
GET    /api/schedule/email-deliveries/:interviewId
POST   /api/schedule/email-deliveries/:interviewId/resend

POST   /api/interviews/:id/start              ← candidate: load questions, create attempt
POST   /api/interviews/:id/answer             ← candidate: save answer + transcribe (multipart audio or text)
POST   /api/interviews/:id/proctoring         ← candidate: log integrity event
GET    /api/interviews/:id/transcript         ← manager only
POST   /api/interviews/:id/complete           ← candidate: finish, queue report job

GET    /api/candidate/interviews
GET    /api/candidate/report
POST   /api/candidate/livekit-token

GET    /api/interviewer/schedule
GET    /api/interviewer/scorecards
POST   /api/interviewer/scorecard/:interviewId
GET    /api/interviewer/scorecard-data/:interviewId
GET    /api/interviewer/live-room/:interviewId
PATCH  /api/interviewer/live-room/:interviewId/notes
POST   /api/interviewer/live-room/:interviewId/end
POST   /api/interviewer/livekit-token

GET    /api/reports/team
GET    /api/reports/candidate/:id
GET    /api/reports/candidate/:id/history     ← every ready report for the candidate, newest first

GET    /api/templates
POST   /api/templates
PATCH  /api/templates/:id
DELETE /api/templates/:id

GET    /api/exam/:token
POST   /api/exam/:token/submit

POST   /api/upload/resume
POST   /api/upload/extract-text
POST   /api/upload/analyze-resume

GET    /api/profile
PATCH  /api/profile

GET    /health                                 ← health check
```

---

## Strict layer pattern (never break this)

```js
// ✅ CORRECT — three separate concerns
// routes/team.routes.js
router.get('/', authMiddleware, async (req, res) => {
  const members = await teamService.getTeam(req.user.companyId)
  res.json({ success: true, data: members })
})

// services/team.service.js
async function getTeam(companyId) {
  return teamRepository.getByCompany(companyId)
}

// repositories/team.repository.js
async function getByCompany(companyId) {
  return db.query('SELECT * FROM candidates WHERE company_id = @companyId AND type = @type',
    { companyId, type: 'internal' })
}
```

Full service/repository examples: `docs/backend-prompt.md`
