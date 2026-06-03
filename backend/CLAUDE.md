# CLAUDE.md — backend/

> Auto-loaded when Claude Code works in backend/. Read root CLAUDE.md first.
> Full DB connection code: `.claude/skills/db-access.md`

---

## Stack

```
Node.js 20 + Express
pg                         PostgreSQL driver (Supabase current)
mssql                      SQL Server driver (SSMS future)
bcryptjs                   password hashing
jsonwebtoken               JWT tokens
multer                     file uploads
cloudinary                 file storage
@huggingface/transformers  local Whisper STT
groq-sdk                   LLM + Groq Whisper API
@google/generative-ai      Gemini fallback
node-cron                  scheduled jobs (cleanup, report generation)
resend                     transactional email
```

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

## Folder layout

```
backend/
├── src/
│   ├── routes/           ← HTTP only — receive, call service, respond
│   │   ├── auth.routes.js
│   │   ├── interview.routes.js
│   │   ├── candidate.routes.js
│   │   ├── team.routes.js
│   │   ├── report.routes.js
│   │   └── schedule.routes.js
│   ├── services/         ← Business logic — no SQL here
│   │   ├── auth.service.js
│   │   ├── interview.service.js
│   │   ├── report.service.js
│   │   ├── transcription.service.js
│   │   ├── llm.service.js
│   │   ├── email.service.js
│   │   └── storage.service.js
│   ├── repositories/     ← SQL queries only — no business logic here
│   │   ├── user.repository.js
│   │   ├── candidate.repository.js
│   │   ├── interview.repository.js
│   │   ├── answer.repository.js
│   │   ├── attempt.repository.js
│   │   ├── report.repository.js
│   │   └── file.repository.js
│   ├── middleware/
│   │   ├── auth.js       ← validate JWT token
│   │   ├── role.js       ← check user role (manager/candidate/interviewer)
│   │   └── upload.js     ← multer config for file uploads
│   ├── db/
│   │   ├── connection.js           ← factory (import this everywhere)
│   │   ├── supabase.connection.js  ← PostgreSQL
│   │   └── sqlserver.connection.js ← SQL Server
│   └── jobs/
│       ├── cleanup.job.js   ← daily: delete old Cloudinary files
│       └── report.job.js    ← async: generate interview reports
├── migrations/
│   ├── 001_supabase.sql     ← run in Supabase SQL editor
│   └── 001_sqlserver.sql    ← run in SSMS (for future switch)
├── server.js
├── package.json
└── .env
```

---

## .env (all required)

```bash
PORT=4000
NODE_ENV=development

# DB — which to use
DB_TYPE=supabase     # change to 'sqlserver' to switch

# Supabase (current)
DATABASE_URL=postgresql://postgres.zhnxfghnujizjslygjfs:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres

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

# Files
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Video
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Email
RESEND_API_KEY=      # resend.com (free 3000/mo)

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

---

## API routes

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/magic-link/:token    ← candidate access

GET    /api/team                      ← manager: list team members
POST   /api/team/member               ← add one
POST   /api/team/import               ← bulk CSV
GET    /api/team/member/:id
PATCH  /api/team/member/:id
DELETE /api/team/member/:id

GET    /api/candidates                ← external candidates
POST   /api/candidates
POST   /api/candidates/import

POST   /api/schedule                  ← create interview schedule

POST   /api/interviews/:id/start      ← load questions, create attempt
POST   /api/interviews/:id/answer     ← save answer + transcribe
POST   /api/interviews/:id/proctoring ← log integrity event
POST   /api/interviews/:id/complete   ← trigger report

GET    /api/reports/team
GET    /api/reports/candidate/:id

GET    /health                        ← health check
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
