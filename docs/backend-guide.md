# Backend Developer Guide - Screeno

> How the backend is built, how to navigate it, and how to add new features.
> Read `backend/CLAUDE.md` for folder structure and `BRAIN.md` for current build state.

---

## Architecture - three strict layers

```
HTTP request
    -> routes/        receive request, call service, send response
    -> services/      business logic and decisions
    -> repositories/  SQL queries
    -> database
```

If code touches the DB, put it in a repository. If code makes a product decision, put it in a service. If code handles `req` or `res`, keep it in a route.

---

## How to add a new endpoint

1. Repository - add the SQL query to the relevant `.repository.js` file.

```js
const db = require('../db/connection')

async function getMyData(companyId) {
  return db.query(
    'SELECT * FROM my_table WHERE company_id = @companyId AND status = @status',
    { companyId, status: 'active' }
  )
}
```

The connection layer returns direct row arrays. Do not use `result.rows` in repositories.

2. Service - add business logic in `.service.js`.

```js
async function getMyThing(userId, companyId) {
  const user = await userRepository.getById(userId)
  if (!user) throw new Error('User not found')
  return myRepository.getMyData(companyId)
}
```

3. Route - add the HTTP handler in `.routes.js`.

```js
router.get('/my-endpoint', authMiddleware, async (req, res) => {
  try {
    const data = await myService.getMyThing(req.user.id, req.user.companyId)
    res.json({ success: true, data })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
})
```

4. Register - add the router to `server.js`.

```js
app.use('/api/my-route', require('./routes/my.routes'))
```

---

## Auth middleware

Protected routes use `authMiddleware` from `src/middleware/auth.js`. It reads `Authorization: Bearer <token>`, verifies the JWT, and sets `req.user` with `{ id, role, companyId }`.

Role checks use `src/middleware/role.js`.

Magic-link interview routes use path tokens such as `/api/auth/magic-link/:token` and `/api/exam/:token`; the frontend route is `/interview/:token/*`. Magic-link sessions are exchanged for short-lived interview-scoped JWTs instead of normal dashboard sessions.

---

## Response shape

Always return consistent JSON:

```js
res.json({ success: true, data: result })
res.status(400).json({ success: false, error: 'message' })
res.status(401).json({ success: false, error: 'Unauthorized' })
```

---

## LLM calls

All LLM calls go through `services/llm.service.js`. Do not call provider SDKs or REST APIs directly from routes/components.

```js
const report = await llmService.generateReport(transcript, jobContext)
const question = await llmService.getAdaptiveQuestion(history, role)
```

---

## File storage

Resumes and reports go through `services/storage.service.js`. Audio is transcribed and discarded.

---

## DB connection

`db/connection.js` loads `supabase.connection.js` (plain `pg`, works against any PostgreSQL host, not just Supabase). It exposes `query(sql, params)` and `transaction(callback)`. Repositories use `@param` placeholders; the connection layer translates them to `$1, $2` positional params.

---

## Report job worker

`server.js` starts the report worker on boot:

```js
reportJobService.startReportJobWorker()
```

The worker polls `report_jobs`, runs report generation, writes score/report data, and retries bounded failures.

---

## Email

Transactional email goes through `services/email.service.js`.

Useful environment variables:

- `EMAIL_TRANSPORT=console` for local/test logging.
- `EMAIL_REDIRECT_TO` to redirect outbound mail in test environments.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` for SMTP delivery.

---

## Common prompts

```
"Add a new API endpoint GET /api/[route] that returns [describe].
Follow the route -> service -> repository pattern in docs/backend-guide.md."

"Fix the bug in [service/route name]: [describe].
See backend/src/[services|routes]/[file]."

"Add a new column [column_name] to the [table] table.
Update repository queries and create a migration SQL file in backend/migrations/."
```
