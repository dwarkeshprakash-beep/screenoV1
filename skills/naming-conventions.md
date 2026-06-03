# Naming Conventions — Screeno

Simple, consistent names across the whole project.

---

## Quick reference table

| Context | Convention | Example |
|---|---|---|
| React component file | PascalCase | `ScheduleModal.jsx` |
| React component function | PascalCase | `function ScheduleModal()` |
| Hook file | camelCase | `useInterview.js` |
| Hook function | camelCase + use prefix | `function useInterview()` |
| Utility function | camelCase | `formatDate()` |
| Service file (backend) | kebab-case | `interview.service.js` |
| Route file (backend) | kebab-case | `interview.routes.js` |
| Repository file | kebab-case | `candidate.repository.js` |
| JS variable | camelCase | `const interviewId` |
| JS constant (module-level) | UPPER_SNAKE | `const MAX_ATTEMPTS = 10` |
| DB table | snake_case plural | `candidates` |
| DB column | snake_case | `first_name`, `company_id` |
| API endpoint | kebab-case | `/api/team/member/:id` |
| CSS class | kebab-case | `.schedule-modal` |
| Environment variable | UPPER_SNAKE | `GROQ_API_KEY` |
| Git branch | kebab-case with type prefix | `feat/schedule-modal` |

---

## React components

```jsx
// File name = component name, both PascalCase
// TeamTable.jsx contains function TeamTable()

function TeamTable({ members, onSchedule }) {
  // State: camelCase
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(false)

  // Handlers: camelCase starting with 'handle'
  function handleSelectAll() { ... }
  function handleScheduleClick() { ... }

  return <div>...</div>
}

export default TeamTable
```

---

## Database columns

Short, clear English. No abbreviations unless very obvious.

```sql
-- GOOD
first_name      -- clear
last_name       -- clear
company_id      -- obvious reference to companies table
created         -- when was this created (not created_at)
status          -- clear
resume_url      -- clear
answer_text     -- clear
attempt_num     -- attempt number

-- AVOID
fn              -- unclear abbreviation
lnm             -- unclear
comp_id         -- use company_id instead
createTimestamp -- too long, use created
txt             -- use answer_text
attNum          -- don't mix camelCase in DB
```

---

## API endpoints

```
Use plural nouns for collections, singular for actions.
Use kebab-case, all lowercase.

GET    /api/team                   ← get all team members
POST   /api/team/member            ← add a member
GET    /api/team/member/:id        ← get one member
PATCH  /api/team/member/:id        ← update member
DELETE /api/team/member/:id        ← remove member

POST   /api/interviews/:id/start   ← action verb OK for actions
POST   /api/interviews/:id/answer  ← save an answer
POST   /api/interviews/:id/complete ← mark interview done

POST   /api/candidates/import      ← action on collection
```

---

## Environment variables

```
All uppercase, words separated by underscores.

Database:
DB_SERVER
DB_DATABASE
DB_USER
DB_PASSWORD

Auth:
JWT_SECRET
JWT_EXPIRES_IN
REFRESH_TOKEN_EXPIRES_IN

API keys:
GROQ_API_KEY
GEMINI_API_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

Frontend:
REACT_APP_API_URL          ← React requires REACT_APP_ prefix for env vars
REACT_APP_LIVEKIT_URL
```

---

## What to avoid

```js
// ❌ Abbreviations that aren't obvious
const mgr = ...         // use manager
const cand = ...        // use candidate
const intv = ...        // use interview

// ❌ Generic names
const data = ...        // use candidates, report, answers — be specific
const result = ...      // use createdCandidate, savedAnswer
const temp = ...        // just name it properly

// ❌ Numbers in names
const button1 = ...     // use primaryButton, submitButton
const list2 = ...       // use filteredCandidates, selectedMembers

// ❌ Mixing conventions
const candidateID = ...  // use candidateId (camelCase, not ID)
const First_Name = ...   // use first_name (SQL) or firstName (JS)
```
