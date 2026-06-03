# Library Rules & Architecture — Screeno

> Claude Code must read this before installing any package or writing any code.
> This project is built for a beginner developer. Every rule here exists for a reason.

---

## The one rule for libraries

**Only install a library if writing it yourself would take more than a day and the result would be worse.**

If an external API has a REST endpoint → use `fetch`. No SDK needed.
If a task can be done in 20 lines of plain JavaScript → write it. No library.

---

## Approved libraries — ONLY these, nothing else

### Frontend (3 packages)

| Package | What it does | Why we need it |
|---|---|---|
| `react` + `react-dom` | The UI framework | The whole frontend is React |
| `react-router-dom` | Page routing | No built-in browser alternative |
| `lucide-react` | Icons | Already installed, tiny, tree-shakable |

**Everything else — NO.** No axios, no framer-motion, no zustand, no tanstack-query,
no shadcn, no tailwind, no radix. Use plain CSS and the browser's built-in `fetch`.

### Backend (8 packages)

| Package | What it does | Why we need it |
|---|---|---|
| `express` | HTTP server framework | The whole backend is Express |
| `pg` | PostgreSQL driver | Connects to Supabase — no alternative |
| `jsonwebtoken` | Sign + verify JWT tokens | Node crypto has no JWT built-in |
| `bcryptjs` | Hash passwords | Node crypto cannot do bcrypt |
| `multer` | Parse file uploads | Parses multipart form data |
| `cors` | Set CORS headers | 40 lines of headers, not worth writing |
| `dotenv` | Load `.env` file | Makes env vars explicit |
| `cookie-parser` | Read cookies | Parses HttpOnly refresh token cookie |

**Everything else — install when the feature needs it, not before.**

---

## What we removed and why

| Removed package | Use this instead |
|---|---|
| `axios` | `fetch` — built into every browser and Node 18+ |
| `groq-sdk` | `fetch` to `https://api.groq.com/openai/v1/chat/completions` |
| `@google/generative-ai` | `fetch` to the Gemini REST API |
| `cloudinary` | `fetch` + `FormData` to the Cloudinary REST API |
| `resend` | `fetch` to `https://api.resend.com/emails` |
| `node-cron` | `setInterval` or a simple interval function |
| `mssql` | Add when switching to SQL Server (Phase 2) |
| `@huggingface/transformers` | Add in Phase 2 for local Whisper transcription |

### The fetch pattern (replaces all removed SDKs)

```js
// backend/src/services/llm.service.js
// This is how we call Groq without their SDK — plain fetch, dead simple

async function askGroq(messages, systemPrompt) {
  // Build the request to Groq's OpenAI-compatible API
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // API key from .env — never hardcode this
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

  // Check if the request worked
  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`)
  }

  const data = await response.json()

  // Return just the text content
  return data.choices[0].message.content
}
```

Same exact pattern works for Gemini, Cloudinary, and Resend — just change the URL and body shape.

---

## Architecture — MVC + Service Layer

```
HTTP Request
     ↓
┌─────────────────────────────────────────────────────────────┐
│  ROUTE (Controller)  — backend/src/routes/                  │
│  Job: receive request, call service, send response          │
│  Rule: NO SQL here, NO business logic here                  │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SERVICE  — backend/src/services/                           │
│  Job: all business decisions and logic                      │
│  Rule: NO SQL here, NO req/res objects here                 │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  REPOSITORY  — backend/src/repositories/                    │
│  Job: all SQL queries                                       │
│  Rule: ONLY SQL here, no logic, no decisions                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                       Database
```

**How to know where code goes:**
- "Does it touch the database?" → Repository
- "Does it make a decision based on data?" → Service
- "Does it receive a request or send a response?" → Route

### Example of correct separation

```js
// ✅ CORRECT

// routes/team.routes.js — only HTTP
router.get('/', async (req, res) => {
  const members = await teamService.getTeam(req.user.companyId)
  res.json({ success: true, data: members })
})

// services/team.service.js — only logic
async function getTeam(companyId) {
  const members = await teamRepository.getByCompany(companyId)
  // Add business logic here — e.g. sort by status, filter inactive
  return members.filter(m => m.status === 'active')
}

// repositories/team.repository.js — only SQL
async function getByCompany(companyId) {
  return db.query(
    'SELECT * FROM users WHERE company_id = @companyId ORDER BY first_name',
    { companyId }
  )
}
```

```js
// ❌ WRONG — SQL inside a route

router.get('/', async (req, res) => {
  // This mixes HTTP handling with database access — do not do this
  const result = await db.query('SELECT * FROM users WHERE company_id = @id', { id: req.user.companyId })
  res.json(result)
})
```

---

## Frontend architecture — Component hierarchy

```
Page                       ← one per route, composes components, fetches data
  └── Section Component    ← one logical section of a page
        └── Shared Component ← Button, Card, Badge, Input, etc.
```

**Before building any new component, check `frontend/src/components/shared/`.
If a similar component exists there — use it, do not build a new one.**

Decision rule:
- Will this be used by more than one role or page? → `shared/`
- Is it specific to manager screens only? → `manager/`
- Is it specific to the interview flow? → `interview/`

---

## CSS rules — no libraries, plain CSS with tokens

```css
/* CORRECT — uses design tokens from tokens.css */
.button-primary {
  background: var(--brand-500);
  color: var(--fg-on-brand);
  border-radius: var(--radius-md);
}

/* WRONG — hardcoded hex color */
.button-primary {
  background: #5B4FE9;
}
```

The full token set is in `tokens.css` at the project root.
Every CSS value that is a color, font, spacing, shadow, or radius must use a token.

---

## Code style rules — beginner-readable always

```js
// Every function gets a comment above it explaining what it does
// and what it returns

/**
 * Get all active team members for a company
 * @param {number} companyId - the company ID from the JWT
 * @returns {Promise<Array>} - array of user rows from the database
 */
async function getTeam(companyId) {
  // Get members from repository — only active ones (deleted = null)
  const members = await teamRepository.getByCompany(companyId)

  // Sort by first name so the list is always alphabetical
  return members.sort((a, b) => a.first_name.localeCompare(b.first_name))
}
```

Rules:
- `const` and `let` always — never `var`
- `async/await` always — never `.then().catch()`
- One file per component or service
- Max ~150 lines per file — split if longer
- Comments explain WHY, not just WHAT the code does
- Every component: loading state, error state, empty state

---

## When to add a new library (checklist)

Before running `npm install anything`, answer all of these:

- [ ] Can I do this with `fetch` + 20 lines of code? If yes → write it
- [ ] Is this package maintained (last commit < 6 months ago)? If no → do not use
- [ ] Does it have zero or few dependencies itself? If it pulls in 50 packages → do not use
- [ ] Does it solve a problem that genuinely cannot be solved in a day? If no → write it
- [ ] Is it listed in the approved list above? If no → discuss before installing