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
│   ├── routes/           ← HTTP only — receive, call service, respond
│   │   ├── auth.routes.js          /api/auth
│   │   ├── team.routes.js          /api/team
│   │   ├── interview.routes.js     /api/interviews
│   │   ├── candidate.routes.js     /api/candidate
│   │   ├── report.routes.js        /api/reports
│   │   ├── schedule.routes.js      /api/schedule
│   │   ├── client-template.routes.js  /api/templates/client
│   │   ├── monthly-assessment.routes.js /api/assessments/monthly
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
│   │   ├── interview.repository.js
│   │   ├── team-member.repository.js
│   │   ├── external-candidate.repository.js
│   │   ├── scorecard.repository.js
│   │   ├── transcript.repository.js
│   │   ├── email-delivery.repository.js
│   │   ├── refresh-token.repository.js
│   │   ├── report.repository.js
│   │   ├── report-job.repository.js
│   │   ├── client-template.repository.js
│   │   ├── monthly-assessment.repository.js
│   │   ├── exam.repository.js
│   │   ├── company.repository.js
│   │   └── department.repository.js
│   ├── middleware/
│   │   ├── auth.js         ← validate JWT access token
│   │   ├── role.js         ← requireRole('manager'|'candidate'|'admin')
│   │   ├── upload.js       ← multer config (memory storage) for file uploads
│   │   └── rate-limit.js   ← in-memory rate limiter (auth + write limiters in server.js)
│   ├── utils/
│   │   ├── fetch-with-timeout.js   ← AbortSignal.timeout wrapper for all external API calls
│   │   └── parse.js                ← parseStoredArray() — shared JSON→array parser
│   └── db/
│       ├── connection.js           ← factory (import this everywhere)
│       └── supabase.connection.js  ← PostgreSQL
├── migrations/   ← 001-019 numbered SQL files; apply via setup-db.js (new DBs) or
│                    run-migration-NNN.js scripts (existing DBs)
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
GET    /api/candidate/reports
GET    /api/candidate/monthly-assessments
GET    /api/candidate/client-mandates
GET    /api/candidate/client-outcomes

GET    /api/reports/team
GET    /api/reports/candidate/:id
GET    /api/reports/candidate/:id/history     ← every ready report for the candidate, newest first

GET    /api/templates/client                  ← manager: list client requirement templates
POST   /api/templates/client
GET    /api/templates/client/:id
PATCH  /api/templates/client/:id
POST   /api/templates/client/extract-tags    ← LLM tag extraction from JD text
GET    /api/templates/client/:id/matches     ← team members whose tags overlap template
POST   /api/templates/client/:id/send-jd    ← email JD to selected team members

GET    /api/assessments/monthly             ← manager: list monthly assessments (with enrollments)
POST   /api/assessments/monthly
GET    /api/assessments/monthly/calendar    ← year-view calendar of all enrollments
POST   /api/assessments/monthly/generate-subtopics
POST   /api/assessments/monthly/generate-jd

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

Use the live routes/services/repositories in `backend/src/` as the source of truth for service/repository examples.
