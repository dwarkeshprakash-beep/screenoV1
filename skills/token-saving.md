# Token Saving — Screeno

How to get the best output from Claude Code while using the fewest tokens.

---

## Model selection

| Task | Use this model | Why |
|---|---|---|
| Building a complex feature (AI interview, schedule modal) | claude-sonnet-4-6 | Needs reasoning |
| Simple CRUD (add/edit/delete routes) | claude-haiku-4-5 | Pattern matching, fast, cheap |
| Writing CSS / styling adjustments | claude-haiku-4-5 | Mechanical |
| Generating test data / mock data | claude-haiku-4-5 | Mechanical |
| Debugging a complex error | claude-sonnet-4-6 | Needs reasoning |
| Writing SQL queries | claude-sonnet-4-6 | Schema reasoning matters |
| Writing comments for existing code | claude-haiku-4-5 | Simple |
| Security review | claude-sonnet-4-6 | Critical |

Switch models in Claude Code:
```
/model claude-haiku-4-5    (cheap tasks)
/model claude-sonnet-4-6   (complex tasks)
```

---

## Do manually — don't spend tokens on these

These take 5-15 minutes to do yourself and cost zero tokens:

- `create-react-app` or Vite setup
- `npm install` / `npm init`
- Creating `.env` files from examples
- Setting up SQL Server and running migration scripts in SSMS
- Creating GitHub repo and pushing initial commit
- Setting up Cloudinary account and getting API keys
- Getting Groq API key from console.groq.com
- Getting Gemini API key from aistudio.google.com
- Adding environment variables to Render/Railway hosting

---

## Context management

### Keep CLAUDE.md lean — it's read every session

Every line in CLAUDE.md costs tokens on every Claude Code session. Keep it:
- Under 200-250 lines
- No code examples (link to skill files instead)
- Only essential decisions and rules

### .claudeignore keeps context clean

Files in .claudeignore are never read into context. Always ignore:
- `node_modules/`
- Build output folders (`.next/`, `build/`, `dist/`)
- Lock files (`package-lock.json`)
- Binary and media files

### Per-task context — only give what's needed

```
# Good — focused context
"Build the ScheduleModal component.
It lives in frontend/src/components/manager/ScheduleModal.jsx
It uses the shared Button and Modal components from shared/
It calls POST /api/schedule on submit
Look at the existing TeamTable.jsx for styling reference"

# Bad — dumps everything
"Here is my entire codebase. Build me a schedule modal."
```

---

## Build in small vertical slices

Don't ask for everything at once. Build in this order:

```
Step 1: Structure only
"Create TeamPage.jsx with the correct file structure,
all state variables defined, and placeholder UI (no real data)"

Step 2: Add API call
"Now add the useEffect to call GET /api/team
and handle loading/error/empty states"

Step 3: Wire up the data
"Now replace the placeholder with the real TeamTable component
using the data from the API"

Step 4: Add actions
"Now add the bulk-select and Schedule button functionality"
```

Each step is small, Claude makes fewer mistakes, fewer retries needed.

---

## Prompting patterns that save tokens

### Reference files, don't paste them

```
# Good — reference by path
"Follow the same component pattern as frontend/src/components/manager/TeamTable.jsx"

# Wastes tokens — pasting 200 lines
"Here is my TeamTable component: [200 lines of code]..."
```

### Constrain what NOT to build

Claude will over-build if you don't limit it:
```
"Build the DeviceCheck component.
- Camera check only for now
- DO NOT add microphone check yet (separate task)
- DO NOT add actual getUserMedia calls — use a mock function
- DO NOT add animations — plain UI first"
```

### Be specific about existing patterns

```
"Build the SaveAnswer route in interview.routes.js
following the same pattern as the existing routes in that file.
The service function to call is interviewService.saveAnswer()"
```

---

## Iteration strategy

### First pass: skeleton with comments

Ask Claude to create the file structure with TODO comments instead of full implementation. Review the structure before asking for the code.

```
"Create AIInterviewPage.jsx with:
- Correct imports
- All state variables listed with // TODO comments
- Empty handler functions with descriptions
- Basic layout structure
- Don't implement any logic yet"
```

### Second pass: implement one section at a time

```
"Now implement just the audio recording section of AIInterviewPage.jsx —
the startRecording and stopRecording functions.
Leave everything else as TODO."
```

---

## Budget estimates

| Task | Approx tokens | Notes |
|---|---|---|
| Full new page from scratch | 8K-15K | Split into structure + data + actions |
| Single reusable component | 3K-6K | Use Haiku |
| API endpoint (simple CRUD) | 2K-4K | Use Haiku |
| AI interview service (complex) | 15K-25K | Use Sonnet, multiple passes |
| Database migration file | 3K-6K | Use Sonnet for schema reasoning |
| Debugging with stack trace | 2K-8K | Usually fast with good context |

---

## Red flags — you're wasting tokens if...

- You're re-explaining the project stack in every message (it's in CLAUDE.md)
- Claude is regenerating code it already wrote — ask for a diff/patch instead
- You're asking Claude to review its own just-written code for bugs (review it yourself first)
- You're generating large amounts of placeholder/seed data (write it manually, it's faster)
- You're running the same failing command 3+ times without understanding the error first
- You paste the entire file when only one function needs changing (select just that function)
