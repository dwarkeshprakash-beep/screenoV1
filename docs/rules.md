# Rules — Screeno

> Claude Code reads this before writing any code or installing any package.
> One file. All rules. No exceptions.

---

## 1. Library rules

**The rule:** Only install a library if writing it yourself would take more than a day and the result would be worse.

### Approved frontend packages (3 only)
| Package | Why |
|---|---|
| `react` + `react-dom` | The framework |
| `react-router-dom` | Routing — no built-in alternative |
| `lucide-react` | Icons — tree-shakable, already installed |

### Approved backend packages (8 only)
| Package | Why |
|---|---|
| `express` | The framework |
| `pg` | PostgreSQL driver — no alternative |
| `jsonwebtoken` | JWT signing — no built-in |
| `bcryptjs` | Password hashing — no built-in |
| `multer` | File upload parsing |
| `cors` | CORS headers |
| `dotenv` | Load `.env` file |
| `cookie-parser` | Read HttpOnly refresh token cookie |

### Never install without discussion
`axios` → use `fetch` (built-in)
`groq-sdk` → use `fetch` to call the Groq REST API
`@google/generative-ai` → use `fetch` to call the Gemini REST API
`cloudinary` → use `fetch` + `FormData` to call Cloudinary REST API
`resend` → use `fetch` to call Resend REST API
`node-cron` → use `setInterval`
`mssql` → add in Phase 2 only (SQL Server switch)
`@huggingface/transformers` → add in Phase 2 only (local Whisper)

### The fetch pattern (replaces all removed SDKs)
```js
// Every external API call looks like this — no SDK needed
async function callGroq(messages, systemPrompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    })
  })

  // Always check if the request actually worked
  if (!response.ok) {
    throw new Error(`Groq API failed: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
```

### Checklist before `npm install anything`
- [ ] Can I do this with `fetch` + 20 lines? If yes → write it
- [ ] Is this package maintained (last commit < 6 months)? If no → do not use
- [ ] Does it pull in many sub-dependencies? If yes → do not use
- [ ] Is it in the approved list above? If no → stop and discuss

---

## 2. Architecture — MVC + Service Layer

```
Request
   ↓
Route (Controller)  → receives HTTP, calls service, sends response. NO SQL. NO logic.
   ↓
Service             → all business logic and decisions. NO SQL. NO req/res.
   ↓
Repository          → ALL SQL queries. Nothing else.
   ↓
Database
```

**Quick test — where does this code go?**
- Touches the database → Repository
- Makes a decision based on data → Service
- Receives a request or sends a response → Route

### Correct example
```js
// routes/team.routes.js — HTTP only
router.get('/', authMiddleware, async (req, res) => {
  try {
    const members = await teamService.getTeam(req.user.companyId)
    res.json({ success: true, data: members })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not load team' })
  }
})

// services/team.service.js — logic only
async function getTeam(companyId) {
  const members = await teamRepository.getByCompany(companyId)
  return members.filter(m => m.status === 'active')
}

// repositories/team.repository.js — SQL only
async function getByCompany(companyId) {
  return db.query(
    'SELECT * FROM users WHERE company_id = @companyId ORDER BY first_name',
    { companyId }
  )
}
```

### Wrong example
```js
// ❌ SQL inside a route — never do this
router.get('/', async (req, res) => {
  const rows = await db.query('SELECT * FROM users WHERE...')
  res.json(rows)
})
```

---

## 3. Error handling

### Backend — never leak internal errors to the frontend

```js
// ❌ WRONG — exposes database error details to the user
res.status(500).json({ error: err.message })
// err.message might be: "relation 'usres' does not exist" — leaks DB info

// ✅ CORRECT — safe message for user, real error only in server logs
console.error('getTeam failed:', err)  // logs to server only
res.status(500).json({ success: false, error: 'Could not load team' })
```

### Backend — consistent response shape (always the same)
```js
// Every success response
res.json({ success: true, data: result })
res.status(201).json({ success: true, data: created })

// Every error response
res.status(400).json({ success: false, error: 'Email is required' })
res.status(401).json({ success: false, error: 'Not authenticated' })
res.status(403).json({ success: false, error: 'Not authorized' })
res.status(404).json({ success: false, error: 'Not found' })
res.status(500).json({ success: false, error: 'Something went wrong' })
// Note: 500 errors NEVER include technical details
```

### Frontend — always handle errors from API calls
```js
// ❌ WRONG — crashes if the API fails
const data = await api.getTeam()
setMembers(data)

// ✅ CORRECT — always wrap in try/catch, always set error state
async function loadTeam() {
  setLoading(true)
  setError(null)
  try {
    const res = await fetch('/api/team', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to load team')
    const data = await res.json()
    setMembers(data.data)
  } catch (err) {
    // Show a message the user can understand — not a technical error
    setError('Could not load team members. Please try again.')
  } finally {
    setLoading(false)
  }
}
```

### Frontend — handle 401 (expired JWT) on every API call
```js
// frontend/src/services/api.js
// Centralise ALL API calls here so 401 handling is in one place

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('accessToken')

  const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // Attach JWT if we have one
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    // Always send cookies (for refresh token)
    credentials: 'include',
  })

  // JWT expired — redirect to login
  if (response.status === 401) {
    localStorage.removeItem('accessToken')
    window.location.href = '/login'
    return
  }

  // Any other error — throw so the calling component can catch it
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || 'Request failed')
  }

  return response.json()
}

// All API functions use this one request helper
export const getTeam = () => request('/api/team')
export const scheduleInterview = (data) => request('/api/schedule', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

### Never swallow errors silently
```js
// ❌ WRONG — error disappears, no one knows it happened
try {
  await doSomething()
} catch (err) {
  // nothing here — bug becomes invisible
}

// ✅ CORRECT — always at least log it
try {
  await doSomething()
} catch (err) {
  console.error('doSomething failed:', err)
  // and show user a message if they need to know
  setError('Something went wrong. Please try again.')
}
```

---

## 4. Security rules

### Passwords and tokens — never log them, never send them
```js
// ❌ WRONG
console.log('User logged in:', user)        // logs the password hash
console.log('Token:', token)                // logs a valid JWT

// ✅ CORRECT — log only what you need to debug
console.log('User logged in:', user.email)
console.log('Token issued for user:', user.id)
```

### Always validate input before using it
```js
// ❌ WRONG — trusts whatever the frontend sends
router.post('/schedule', async (req, res) => {
  const interview = await interviewService.create(req.body)
  res.json({ success: true, data: interview })
})

// ✅ CORRECT — check required fields first
router.post('/schedule', async (req, res) => {
  const { candidateId, type, difficulty } = req.body

  // Validate required fields — return 400 if anything is missing
  if (!candidateId) return res.status(400).json({ success: false, error: 'candidateId is required' })
  if (!type) return res.status(400).json({ success: false, error: 'type is required' })
  if (!difficulty) return res.status(400).json({ success: false, error: 'difficulty is required' })

  const interview = await interviewService.create(req.body)
  res.json({ success: true, data: interview })
})
```

### JWT must not contain sensitive data
```js
// ❌ WRONG — password hash in the token (even hashed, don't do this)
const token = jwt.sign({ id: user.id, email: user.email, password: user.password }, secret)

// ✅ CORRECT — only what is needed for auth decisions
const token = jwt.sign(
  { id: user.id, role: user.role, companyId: user.company_id },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
)
```

### Always use parameterized queries — never concatenate SQL
```js
// ❌ WRONG — SQL injection vulnerability
const rows = await db.query(`SELECT * FROM users WHERE email = '${email}'`)

// ✅ CORRECT — parameterized, safe
const rows = await db.query('SELECT * FROM users WHERE email = @email', { email })
```

### Environment variables — never hardcode secrets
```js
// ❌ WRONG
const secret = 'my_jwt_secret_123'
const apiKey = 'gsk_abc123xyz'

// ✅ CORRECT — always from environment
const secret = process.env.JWT_SECRET
const apiKey = process.env.GROQ_API_KEY
```

---

## 5. Database rules

### Never call the database in a loop (N+1 query problem)
```js
// ❌ WRONG — runs one query per candidate = 100 queries for 100 candidates
const candidates = await candidateRepository.getAll()
for (const candidate of candidates) {
  candidate.latestReport = await reportRepository.getLatest(candidate.id) // N extra queries
}

// ✅ CORRECT — one query that gets everything
const candidatesWithReports = await candidateRepository.getAllWithLatestReport()
// SQL: SELECT c.*, r.overall_score FROM candidates c LEFT JOIN reports r ON ...
```

### Keep SQL readable — one query per function, no clever one-liners
```js
// ❌ WRONG — impossible to read and debug
const r = await db.query(`SELECT u.*,d.name dn FROM users u JOIN departments d ON u.department_id=d.id WHERE u.company_id=@c AND u.status='active' ORDER BY u.first_name`, {c: id})

// ✅ CORRECT — formatted SQL, obvious what it does
const rows = await db.query(
  `SELECT
     u.id,
     u.first_name,
     u.last_name,
     u.email,
     u.role,
     d.name AS department_name
   FROM users u
   LEFT JOIN departments d ON u.department_id = d.id
   WHERE u.company_id = @companyId
     AND u.status = 'active'
   ORDER BY u.first_name`,
  { companyId }
)
```

---

## 6. CSS rules

### Always use design tokens — never hardcode values
```css
/* ❌ WRONG */
.button { background: #5B4FE9; border-radius: 8px; }

/* ✅ CORRECT */
.button { background: var(--brand-500); border-radius: var(--radius-md); }
```

Tokens are in `tokens.css` at the project root. Every color, font, spacing, and shadow has a token.

---

## 7. Code style rules

### Every function gets a JSDoc comment
```js
/**
 * Get all active team members for a company
 * @param {number} companyId - the company ID from the logged-in user's JWT
 * @returns {Promise<Array>} - array of user objects, sorted by first name
 */
async function getTeam(companyId) {
  const members = await teamRepository.getByCompany(companyId)
  return members.sort((a, b) => a.first_name.localeCompare(b.first_name))
}
```

### Component structure — always this order
```jsx
function ComponentName({ prop1, prop2 }) {
  // 1. State — always at the top
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 2. Effects
  useEffect(() => { loadData() }, [])

  // 3. Handlers
  async function loadData() { ... }
  function handleClick() { ... }

  // 4. Early returns for special states
  if (loading) return <div className="loading">Loading...</div>
  if (error) return <div className="error">{error}</div>
  if (!data) return <div className="empty">Nothing here yet</div>

  // 5. Main render — always last
  return ( <div>...</div> )
}
```

### console.log rules
```js
// ✅ Keep during development — but mark so you remember to remove
console.log('DEBUG:', data)  // remove before committing

// ✅ Keep permanently — server-side error logging
console.error('getTeam failed:', err)

// ❌ Remove before committing — debug logs in production slow the app
console.log('user:', user)
console.log('response:', response)
```

**Before every git commit:** search for `console.log` and remove the ones that are not error logging.

---

## 8. Definition of done

A feature is NOT done until every item on this list is checked.

### Backend endpoint checklist
- [ ] Input validated — required fields checked, 400 returned if missing
- [ ] Auth checked — JWT validated, role checked if needed
- [ ] SQL is parameterized — no string concatenation
- [ ] Error logged on server — `console.error` in catch block
- [ ] User-safe error returned — no internal error details in response
- [ ] Consistent response shape — `{ success: true, data: ... }`
- [ ] Tested with REST Client / Postman — happy path + error cases

### Frontend component checklist
- [ ] Loading state — spinner or skeleton shown while fetching
- [ ] Error state — readable message shown if API call fails
- [ ] Empty state — message shown if data array is empty
- [ ] All functions have JSDoc comments
- [ ] Under 150 lines — split if longer
- [ ] No hardcoded colors — all use CSS variables
- [ ] Works on page refresh — not just on navigation
- [ ] Mobile responsive (or shows blocker if desktop-only intentionally)