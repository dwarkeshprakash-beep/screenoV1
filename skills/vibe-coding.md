# Vibe Coding — Screeno

How to work with Claude Code effectively. You direct, Claude executes.

---

## The mindset

Vibe coding is not "let AI do everything and hope it works."
It is: **you understand the system, Claude writes the code.**

- You know what to build — Claude knows how to write it
- You review every line — Claude doesn't catch its own mistakes well
- You make architecture decisions — Claude fills in the implementation
- You debug errors — Claude helps once you understand what's wrong

---

## What Claude is good at

Use Claude for these without hesitation:

- Standard CRUD routes (same pattern, just different table/fields)
- React component structure (forms, tables, modals)
- Writing SQL queries (given the table schema)
- Converting a design/wireframe to JSX
- Writing tests for existing code
- Adding comments to existing code
- Fixing a specific bug you've identified

---

## What you should do yourself (or lead)

Don't outsource these to Claude:

- Architecture decisions ("should we use WebSocket or polling?")
- Understanding a complex error (read the stack trace yourself first)
- Security-sensitive code review
- Performance optimization (profile first, then fix)
- Initial project setup (npm init, create-react-app, SSMS setup)
- Writing seed data or test fixtures (manual is faster)

---

## Prompting strategy for a feature

**Step 1: Plan first (no code yet)**
```
"I want to build the schedule modal.
Can you describe the steps and which files will be created/changed?
Don't write any code yet."
```
Review the plan. Correct it if needed.

**Step 2: Build structure only**
```
"Create ScheduleModal.jsx with:
- Correct imports
- State variables for each step (step, formData, loading, error)
- Empty handler functions with comments
- Just the outer JSX structure (no real content in each step yet)
- Follow the component pattern in frontend/CLAUDE.md"
```

**Step 3: Implement one section at a time**
```
"Now implement Step 1 of the modal — the interview type selection.
Just the JSX for this step, no other steps yet.
Use the shared Button and Card components."
```

**Step 4: Add backend wiring last**
```
"Now add the handleSubmit function that calls POST /api/schedule
Look at how TeamPage.jsx calls the API for the pattern to follow."
```

---

## Before merging any Claude-generated code

Checklist — go through this every time:

- [ ] I have read every line of the generated code
- [ ] I understand what every function does
- [ ] I ran it locally and tested the main flow
- [ ] Loading, error, and empty states are handled
- [ ] No `console.log()` left in (except debug ones I intentionally keep)
- [ ] No hardcoded colors — all use CSS variables
- [ ] No SQL inside route files — only in repositories
- [ ] No hardcoded secrets or API keys

---

## Common Claude output issues — check for these

```js
// ❌ Missing error handling
const data = await api.call()   // what if this fails?

// ❌ SQL in route files
router.get('/', async (req, res) => {
  const rows = await db.query('SELECT...')  // belongs in repository
})

// ❌ Hardcoded colors
style={{ color: '#5B4FE9' }}    // use var(--brand-500)

// ❌ Missing loading state
function Component() {
  const [data] = useState(null)
  return <div>{data.name}</div>  // crashes if data is still null
}

// ❌ var instead of const/let
var loading = false

// ❌ .then() instead of await
fetch('/api')
  .then(r => r.json())
  .then(data => setData(data))
```

---

## When to start a new Claude Code session

Start fresh when:
- You've been in a session for 2+ hours (context gets diluted)
- You're switching from frontend to backend work
- Previous context is confusing Claude (it keeps referencing old code)
- You're starting a completely new feature

Before starting a new session:
- Make sure your code is committed to Git
- CLAUDE.md is up to date
- The relevant CLAUDE.md (frontend or backend) reflects the current state
