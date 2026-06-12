# Frontend Developer Guide — Screeno

> How the frontend is built, how to navigate it, and how to add new features.
> Read `frontend/CLAUDE.md` for folder structure and `BRAIN.md` for current build state.

---

## How the app is organized

Three role areas, one router. `App.jsx` is the entire route tree — everything branches from there.

```
/login                          → LoginPage (auth)
/manager/*                      → RequireAuth(role=manager) → AppLayout → manager pages
/candidate/*                    → magic-link guard → CandidateLayout → candidate pages
/interviewer/*                  → RequireAuth(role=interviewer) → AppLayout → interviewer pages
```

`RequireAuth` reads the JWT from `localStorage`, checks the role claim, redirects to `/login` if invalid. The magic-link flow for candidates skips login — the token is in the URL query param.

---

## Key patterns every page uses

### Data fetching
Every page that loads data follows this exact shape:
```jsx
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  async function load() {
    try {
      const res = await api.getSomething()
      setData(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  load()
}, [])

if (loading) return <Spinner center />
if (error) return <ErrorMessage message={error} />
if (!data.length) return <EmptyState message="Nothing here yet" />
```

### API calls
All backend calls go through `src/services/api.js` — never call `fetch()` directly in a component. The client handles JWT bearer headers, HttpOnly refresh cookies, 401 refresh-and-retry, and redirect-to-login automatically.

```js
// Adding a new API call — always goes in api.js
export const getMyNewData = () => request('GET', '/api/new-route')
export const createSomething = (body) => request('POST', '/api/new-route', body)
```

### Shared components — check these before building anything
```
Button      — primary/secondary/danger variants, loading state built in
Card        — white container with consistent padding/shadow
Badge       — status chips (green/yellow/red/grey)
Avatar      — initials-based, consistent sizing
Modal       — overlay with backdrop, close button
Input       — label + field + error message
Spinner     — loading indicator, accepts `center` prop
EmptyState  — consistent empty-list message
ErrorMessage — consistent error display
ErrorBoundary — wraps App in main.jsx, catches uncaught renders
```

---

## The AI interview flow

Lives in `hooks/useInterview.js` — a state machine with these phases:

```
loading → ai_speaking → listening → recording → processing → (repeat) → ended
                                                           ↘ error
                                                           ↘ paused
```

- AI speaks via `window.speechSynthesis` (no TTS API, cross-browser)
- Candidate audio captured via `MediaRecorder` (cross-browser)
- Audio blob sent to `POST /api/interviews/:id/answer` as `multipart/form-data`
- Backend transcribes via Groq Whisper, discards audio, saves text answer
- Next question comes from `POST /api/interviews/:id/next-question` (adaptive LLM call)

---

## The exam flow

`ExamPage.jsx` handles MCQ + open-ended + LeetCode-style coding questions in one component.

- Coding questions use `@uiw/react-codemirror` editor with JS/Python syntax highlighting
- Test cases panel shows visible cases; hidden cases run server-side on submit
- Submit hits `POST /api/exam/:attemptId/submit` — grading happens in the backend judge service
- All question types feed into the same LLM report-scoring pipeline

---

## How to add a new manager page

1. Create `frontend/src/pages/manager/MyNewPage.jsx`
2. Add route in `App.jsx` inside the manager `<Route>` block
3. Add nav link in `Sidebar.jsx` manager section
4. Create the API function in `api.js`
5. Follow the data-fetching pattern above (loading/error/empty states required)

---

## CSS and design tokens

All colors, fonts, spacing, and radii come from `tokens.css` at the project root. **Never hardcode hex values.**

```css
/* Use tokens — not hardcoded values */
color: var(--color-primary);        /* brand purple */
background: var(--color-surface);   /* white */
color: var(--color-text-secondary); /* grey text */
```

---

## Known legacy files — do not touch

`src/screens/`, `src/layouts/`, and loose `src/pages/*.jsx` files (`v2-*.jsx`, `ai-room.jsx`, `candidate-flow.jsx`, etc.) are earlier-iteration prototypes. `App.jsx` does not import them. They exist as visual reference only.

---

## Common Claude prompts for frontend work

```
"Add a new page to the manager area: [describe what it shows].
Follow the data-fetching pattern in docs/frontend-guide.md.
Use shared components from frontend/src/components/shared/."

"Fix the [PageName] — it shows [describe bug].
See frontend/src/pages/manager/[PageName].jsx."

"The [feature] in [PageName] isn't working.
Check the API call in src/services/api.js and the backend route in backend/src/routes/."
```
