# Frontend Developer Guide - Screeno

> How the frontend is built, how to navigate it, and how to add new features.
> Read `frontend/CLAUDE.md` for folder structure and `BRAIN.md` for current build state.

---

## How the app is organized

Four entry areas, one router. `App.jsx` is the entire route tree.

```
/login                          -> LoginPage (auth)
/manager/*                      -> RequireAuth(role=manager) -> AppLayout -> manager pages
/candidate/*                    -> RequireAuth(role=candidate) -> CandidateLayout -> overview/interviews/monthly/mandates/profile
/interview/:token/*             -> magic-link interview flow -> CandidateLayout -> landing/device/consent/AI/exam/done
```

`RequireAuth` checks that `accessToken` exists and compares the requested role with the stored `user.role` object in `localStorage`. Token refresh, bearer headers, interview-scoped auth, and redirects live in `src/services/api.js`.

The magic-link interview flow validates `/interview/:token`, swaps the emailed token for a short-lived interview-scoped session token, and skips normal dashboard login.

---

## Key patterns every page uses

### Data fetching

Every page that loads data follows this shape:

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

All backend calls go through `src/services/api.js`; do not call `fetch()` directly in a component. The client handles JWT bearer headers, HttpOnly refresh cookies, 401 refresh-and-retry, interview-scoped auth, and redirect-to-login behavior.

```js
export const getMyNewData = () => request('/api/new-route')
export const createSomething = body =>
  request('/api/new-route', { method: 'POST', body: JSON.stringify(body) })
```

### Shared components

```
Button       - primary/secondary/danger variants, loading state built in
Avatar       - initials-based, consistent sizing
Modal        - overlay with backdrop, close button
Spinner      - loading indicator, accepts `center` prop
EmptyState   - consistent empty-list message
ErrorMessage - consistent error display
```

---

## The AI interview flow

Lives in `hooks/useInterview.js` as a state machine:

```
loading -> ai_speaking -> listening -> recording -> processing -> repeat -> ended
                                                     -> error
                                                     -> paused
```

- AI speaks via `window.speechSynthesis`.
- Candidate audio is captured via `MediaRecorder`.
- Audio answers are sent to `POST /api/interviews/:id/answer` as `multipart/form-data`.
- Text answers are also sent to `POST /api/interviews/:id/answer`.
- The backend transcribes, discards audio, saves transcript text, and can return the next adaptive question in the answer response.
- There is no frontend `/next-question` call.

---

## The exam flow

`ExamPage.jsx` handles MCQ, open-ended, and coding questions in one component.

- Coding questions use `@uiw/react-codemirror` with JS/Python syntax highlighting.
- Test cases panel shows visible cases; hidden cases are evaluated by backend exam/report logic.
- Submit hits `POST /api/exam/:token/submit`.
- All question types feed into the report-scoring pipeline.
- Answers auto-save locally during the exam.
- Exam duration is stored per interview.

---

## Manager and candidate surfaces

Manager pages include dashboard, team, schedule, monthly assessments, client mandates, reports, resume analyzer, and profile.

Candidate dashboard pages include overview, interviews, monthly assessments, client mandates, and profile. Magic-link interview pages live under `/interview/:token/*` and do not require the normal candidate dashboard session.

---

## How to add a new manager page

1. Create `frontend/src/pages/manager/MyNewPage.jsx`.
2. Add a route in `App.jsx` inside the manager route block.
3. Add a nav link in the manager layout/sidebar.
4. Create the API function in `api.js`.
5. Follow the data-fetching pattern above.

---

## CSS and design tokens

All colors, fonts, spacing, and radii come from shared CSS tokens. Prefer existing classes and shared components before adding local inline styles.

---

## Known legacy files

Older prototype files are retained only as visual/reference material when present. `App.jsx` is the source of truth for active routes.
