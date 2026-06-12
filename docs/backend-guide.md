# Backend Developer Guide — Screeno

> How the backend is built, how to navigate it, and how to add new features.
> Read `backend/CLAUDE.md` for folder structure and `BRAIN.md` for current build state.

---

## Architecture — three strict layers

```
HTTP Request
    ↓
routes/       ← receive request, call service, send response — NO SQL, NO logic
    ↓
services/     ← all business logic and decisions — NO SQL, NO req/res objects
    ↓
repositories/ ← ALL SQL queries — nothing else
    ↓
Database (Supabase PostgreSQL)
```

If code touches the DB → repository. If code makes decisions → service. If code handles HTTP → route.

---

## How to add a new endpoint

1. **Repository** — add the SQL query to the relevant `.repository.js` file (or create a new one):
```js
// Always use @param style — the connection layer handles DB differences
async function getMyData(companyId) {
  const result = await query(
    'SELECT * FROM my_table WHERE company_id = @companyId AND status = @status',
    { companyId, status: 'active' }
  )
  return result.rows
}
```

2. **Service** — add business logic in `.service.js`:
```js
async function getMyThing(userId) {
  const user = await userRepository.getById(userId)
  if (!user) throw new Error('User not found')
  return myRepository.getMyData(user.company_id)
}
```

3. **Route** — add the HTTP handler in `.routes.js`:
```js
router.get('/my-endpoint', authMiddleware, async (req, res) => {
  try {
    const data = await myService.getMyThing(req.user.id)
    res.json({ success: true, data })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
})
```

4. **Register** — add the router to `server.js` or `app.js`:
```js
app.use('/api/my-route', require('./routes/my.routes'))
```

---

## Auth middleware

All protected routes use `authMiddleware` (from `src/middleware/auth.middleware.js`). It reads the JWT from the `Authorization: Bearer <token>` header, verifies it, and sets `req.user` with `{ id, role, company_id }`.

Magic-link routes use `magicLinkMiddleware` instead — reads from query param `token`.

---

## Response shape

Always return consistent JSON:
```js
res.json({ success: true, data: result })          // success
res.status(400).json({ success: false, error: 'message' })  // failure
res.status(401).json({ success: false, error: 'Unauthorized' })
```

---

## LLM calls (Groq → Gemini fallback)

Never install `groq-sdk` or `@google/generative-ai`. All LLM calls go through `services/llm.service.js` which uses plain `fetch()` to the REST endpoints.

```js
// Use the existing service functions — don't call LLM APIs directly
const report = await llmService.generateReport(transcript, jobContext)
const question = await llmService.getAdaptiveQuestion(history, role)
```

Groq Llama 3.3 70B is primary. If Groq fails, the service automatically falls back to Gemini 2.0 Flash — same function, same return shape.

---

## File storage (Supabase Storage)

Resumes and reports go through `services/storage.service.js` — which uses `@supabase/supabase-js` to write to the `files` bucket. Audio is **never stored** — transcribe and discard immediately.

---

## DB connection

The `db/connection.js` factory reads `DB_TYPE` env var:
- `DB_TYPE=supabase` → uses `supabase.connection.js` (PostgreSQL via `pg`)  
- `DB_TYPE=sqlserver` → uses `sqlserver.connection.js` (SQL Server via `mssql`)

Both expose the same `query(sql, params)` function. All repositories use `@param` style — the connection layer translates automatically.

Full connection code: `.claude/skills/db-access.md`

---

## Report job worker

There is no `node-cron`. The report-generation worker is a polling loop:
```js
// server.js starts this on boot
reportJobService.startReportJobWorker()
```

It polls `report_jobs` table for pending jobs, runs LLM scoring, writes results, and retries on failure.

---

## Email

All transactional email goes through `services/email.service.js` (nodemailer over Brevo SMTP). During test phase, all mail is redirected to `STATIC_RECIPIENTS` — the env vars `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (note: `SMTP_PASSWORD` not `SMTP_PASS`).

---

## Common Claude prompts for backend work

```
"Add a new API endpoint GET /api/[route] that returns [describe].
Follow the route→service→repository pattern in docs/backend-guide.md.
Add the SQL query to backend/src/repositories/[name].repository.js."

"Fix the bug in [service/route name]: [describe].
See backend/src/[services|routes]/[file]."

"Add a new column [column_name] to the [table] table.
Update the repository query in backend/src/repositories/[name].repository.js
and create a migration SQL file in backend/migrations/."
```
