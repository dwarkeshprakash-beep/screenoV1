# Coding Standards — Screeno

These apply to all JSX and Node.js code in this project.

---

## JavaScript / JSX rules

### Basic rules

```js
// Always use const or let — never var
const name = 'Rahul'
let count = 0

// Always use async/await — never .then().catch()
// CORRECT
async function loadData() {
  try {
    const data = await api.getCandidates()
    setCandidates(data)
  } catch (err) {
    setError(err.message)
  }
}

// WRONG
api.getCandidates()
  .then(data => setCandidates(data))
  .catch(err => setError(err.message))
```

### Comments

```js
// GOOD: explains WHY, not just what
// We save answers individually instead of at the end
// because if the browser crashes, no data is lost
async function saveAnswer(answer) { ... }

// BAD: just repeats what the code says
// Set loading to true
setLoading(true)
```

### Functions

```js
// Use function declarations (not arrow functions) for component functions and handlers
// — easier for beginners to read and debug
function handleSubmit() { ... }
function loadTeam() { ... }

// Arrow functions are fine for short callbacks
const names = people.map(p => p.name)
```

### Error handling

```js
// Always wrap async operations in try/catch
// Always set an error state so the user sees something meaningful
async function fetchReport(id) {
  setLoading(true)
  setError(null)
  try {
    const report = await api.getReport(id)
    setReport(report)
  } catch (err) {
    // Show a human-readable error, not the raw error object
    setError('Could not load report. Please try again.')
    console.error('fetchReport failed:', err)
  } finally {
    // Always runs — even if error
    setLoading(false)
  }
}
```

---

## React component rules

### File size

- One component per file
- Maximum ~150 lines per component
- If it's getting longer, split into smaller sub-components

### Component structure (strict order)

```jsx
// 1. Imports
import React, { useState, useEffect } from 'react'
import SharedComponent from '../shared/SharedComponent'
import { apiCall } from '../../services/api'

// 2. Component function
function ComponentName({ prop1, prop2 }) {

  // 3. State (all state at the top, always)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 4. Derived values from state
  const hasData = data !== null

  // 5. useEffect hooks
  useEffect(() => {
    loadData()
  }, [])

  // 6. Handler functions
  async function loadData() { ... }
  function handleClick() { ... }

  // 7. Early returns (loading, error, empty) — ALWAYS include these
  if (loading) return <div>Loading...</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>
  if (!hasData) return <div>Nothing to show</div>

  // 8. Main return — ALWAYS last
  return (
    <div>
      {/* content */}
    </div>
  )
}

// 9. Export — ALWAYS at the bottom
export default ComponentName
```

### Prop naming

```jsx
// Use clear descriptive names
// GOOD
<Button onClick={handleSubmit} disabled={loading} />

// BAD
<Button cb={fn} d={true} />
```

---

## Node.js / Express rules

### Route files — HTTP only

```js
// Routes only:
// 1. Receive the request
// 2. Call a service
// 3. Send the response

// CORRECT
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const result = await interviewService.saveAnswer(req.params.id, req.body)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
})

// WRONG — SQL in a route
router.post('/answer', async (req, res) => {
  const result = await db.query('INSERT INTO answers...') // No! SQL belongs in repositories
  res.json(result)
})
```

### Consistent error responses

```js
// Every error response follows the same shape
res.status(400).json({ success: false, error: 'Email is required' })
res.status(401).json({ success: false, error: 'Not authenticated' })
res.status(404).json({ success: false, error: 'Candidate not found' })
res.status(500).json({ success: false, error: 'Something went wrong' })

// Every success response follows the same shape
res.json({ success: true, data: result })
res.status(201).json({ success: true, data: created })
```

### Environment variables

```js
// Always use process.env — never hardcode values
// CORRECT
const secret = process.env.JWT_SECRET

// WRONG
const secret = 'my_secret_key_123'  // Never commit secrets
```

---

## Database (SQL in repository files)

```js
// Always use parameterized queries — never string concatenation
// CORRECT — safe from SQL injection
const rows = await db.query(
  'SELECT * FROM candidates WHERE id = @id AND company_id = @companyId',
  { id, companyId }
)

// WRONG — SQL injection vulnerability
const rows = await db.query(
  `SELECT * FROM candidates WHERE id = ${id}` // Never do this
)
```

---

## File and folder naming

```
React components:     PascalCase    → Button.jsx, TeamTable.jsx
Hooks:                camelCase     → useAuth.js, useInterview.js
Services:             camelCase     → api.js, helpers.js
Backend routes:       kebab-case    → interview.routes.js
Backend services:     kebab-case    → interview.service.js
Backend repos:        kebab-case    → candidate.repository.js
SQL columns:          snake_case    → first_name, company_id, created
```

---

## What NOT to do (common mistakes)

```js
// ❌ Don't use var
var name = 'test'        // use const or let

// ❌ Don't use .then()/.catch()
fetch('/api/data').then(r => r.json()).then(...)  // use async/await

// ❌ Don't put SQL in routes
router.get('/', async (req, res) => {
  const rows = await db.query('SELECT...')  // Move this to a repository
})

// ❌ Don't hardcode colors
style={{ color: '#5B4FE9' }}  // use var(--brand-500) from tokens.css

// ❌ Don't skip error handling
const data = await api.call()  // Missing try/catch — will crash on error

// ❌ Don't skip loading/error states
if (loading) { /* nothing */ }  // User sees broken UI while loading

// ❌ Don't build duplicate components
// Check shared/ first before building anything new
```
