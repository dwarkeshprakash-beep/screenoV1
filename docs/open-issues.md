# Open Issues — Screeno Frontend
Last reviewed: 2026-06-12

> Active work queue. Every item here is an open bug or missing feature with exact fix instructions.
> Work through Section 9 (implementation order) to prioritize.
> Context lives in `frontend/CLAUDE.md` and `BRAIN.md` — read those first.

### Token reference (most commonly violated)

| Hardcoded hex | Use this token instead |
|---|---|
| `#0F172A` | `var(--fg-primary)` |
| `#374151` | `var(--fg-body)` |
| `#6B7280` | `var(--fg-muted)` |
| `#94A3B8` | `var(--fg-subtle)` |
| `#5B4FE9` | `var(--brand-500)` |
| `#4A3FCE` | `var(--brand-600)` |
| `#3A31A3` | `var(--brand-700)` |
| `#EFEDFD` | `var(--brand-50)` |
| `#FFFFFF` or `#FFF` | `var(--bg-surface)` |
| `#F8FAFC` | `var(--bg-page)` |
| `#F1F5F9` | `var(--bg-surface-alt)` |
| `#E2E8F0` | `var(--border-default)` |
| `#CBD5E1` | `var(--border-strong)` |
| `#059669` | `var(--success-500)` |
| `#047857` | `var(--success-600)` |
| `#ECFDF5` | `var(--success-50)` |
| `#D97706` | `var(--warning-500)` |
| `#B45309` | `var(--warning-600)` |
| `#FFFBEB` | `var(--warning-50)` |
| `#EF4444` / `#DC2626` | `var(--danger-500)` |
| `#B53618` | `var(--danger-700)` |
| `#FEF2F2` | `var(--danger-50)` |

---

## Section 1: Cross-cutting issues (affect multiple files)

### 1.1 Duplicate local Avatar components — replace with `shared/Avatar.jsx`

Six files define their own inline `Avatar` component instead of importing from `shared/`:

| File | Local name |
|---|---|
| `pages/manager/TeamPage.jsx` | `Avatar` |
| `pages/manager/MemberProfilePage.jsx` | `Avatar` |
| `pages/manager/ManagerProfilePage.jsx` | `Avatar` |
| `pages/interviewer/InterviewerDashboard.jsx` | `Avatar` |
| `pages/candidate/CandidateDashboardPage.jsx` | `V2Av` |
| `components/manager/ScheduleModal.jsx` | `TinyAv` |

**Fix — step 1:** Update `frontend/src/components/shared/Avatar.jsx` to accept numeric pixel sizes in addition to the string enum, so all callers can pass the exact pixel value they need:

```jsx
function Avatar({ src, name = '', size = 'md' }) {
  const presets = { sm: 28, md: 36, lg: 48 }
  const px = typeof size === 'number' ? size : (presets[size] || 36)
  // rest of component unchanged
}
```

**Fix — step 2:** In each file listed above, delete the local Avatar/V2Av/TinyAv function and replace the import with:

```jsx
import Avatar from '../../components/shared/Avatar'  // adjust path depth
```

Then replace every usage:
- `<V2Av name={x} size={32} />` → `<Avatar name={x} size={32} />`
- `<TinyAv name={x} />` → `<Avatar name={x} size={22} />`
- Local `<Avatar name={x} size={64} />` → `<Avatar name={x} size={64} />` (same, just use shared)

### 1.2 Direct `fetch()` calls in ResumeAnalyzerPage — move to api.js

`ResumeAnalyzerPage.jsx` calls `fetch()` directly at two places:

- **Line ~161**: text extraction — should be a named export in `api.js`
- **Line ~207**: AI resume analysis — should be a named export in `api.js`

**Fix:** Add these two exports to `frontend/src/services/api.js`:

```js
export const extractTextFromFile = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return authFetch('/api/upload/extract-text', { method: 'POST', body: fd })
    .then(async r => {
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || 'Extract failed') }
      return r.json()
    })
}

export const analyzeResumeMatch = (jd, resume) =>
  request('/api/upload/analyze-resume', { method: 'POST', body: JSON.stringify({ jd, resume }) })
```

Then in `ResumeAnalyzerPage.jsx`:
- Replace the direct `fetch(...)` call in `extractText()` with `const json = await api.extractTextFromFile(file); return json.data?.text || ''`
- Replace the direct `fetch(...)` call in the AI mode block with `const json = await api.analyzeResumeMatch(jd, resume); if (!json.success) throw new Error(json.error || 'AI analysis failed.'); setRes({ ...json.data, mode: 'ai' })`

### 1.3 alert() used for errors — replace with state

Files using `alert('...')` in catch blocks: `TemplatesPage.jsx`, and likely others. Replace each `alert(...)` with an `error` state variable that renders an `<ErrorMessage>` component. This is especially important for any CRUD modals.

---

## Section 2: Manager pages

### 2.1 DashboardPage.jsx

File: `frontend/src/pages/manager/DashboardPage.jsx`

**Issues:**
- Activity section uses `color: '#5B4FE9'` hardcoded — replace with `var(--brand-500)`
- Otherwise mostly correct; uses CSS tokens and proper shared components

**Fixes:**
- Replace every `'#5B4FE9'` in inline styles with `'var(--brand-500)'`

---

### 2.2 TeamPage.jsx

File: `frontend/src/pages/manager/TeamPage.jsx`

**Issues:**

**A — Local Avatar (see 1.1)**

**B — External member filter is broken**
The page filters `m.type === 'external'` but the new schema's `team_members` table has no `type` column. The JOIN only returns user data.

**Fix:** Remove the `'external'` tab filter entirely (or replace it with a different grouping such as bench/client_side based on `m.availability`). The simplest fix is to drop the external tab:
- Remove `teamType === 'external'` filter and the tab button for it
- Add a tab or badge filter for `availability: bench / client_side` instead (see item D below)

**C — Hardcoded hex colors throughout**
Replace all inline style hex values with the tokens from section 1 token reference table. Particular violations:
- Stat card `background: '#FEF2F2'` → `var(--danger-50)`
- `background: '#5B4FE9'` → `var(--brand-500)`
- `color: '#64748B'` → `var(--fg-muted)`

**D — Missing availability display**
`m.availability` is returned from `GET /api/team` (the repository SELECTs `u.availability`). Add a small badge next to each team member's name showing bench or client_side status.

```jsx
// Add after the member name in each row
{m.availability && (
  <span style={{
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
    background: m.availability === 'bench' ? 'var(--brand-50)' : 'var(--success-50)',
    color: m.availability === 'bench' ? 'var(--brand-700)' : 'var(--success-600)',
  }}>
    {m.availability === 'client_side' ? 'Client side' : 'Bench'}
  </span>
)}
```

---

### 2.3 MemberProfilePage.jsx

File: `frontend/src/pages/manager/MemberProfilePage.jsx`

**Issues:**

**A — Local Avatar (see 1.1)**

**B — `member.skills` field doesn't exist — use `member.tags`**
The new schema stores skills as `users.tags` (JSON array). Replace every `member.skills` reference with `member.tags`.

Parsing: `const tags = Array.isArray(member.tags) ? member.tags : JSON.parse(member.tags || '[]')`

**C — Score fields are on `scorecards`, not `reports`**
The profile's analysis/report tab reads `report.confidence`, `report.tech_knowledge`, `report.communication`, `report.overall_score`. These columns live on the `scorecards` table. The `getHistoryByUser` query in `report.repository.js` does NOT join scorecards — it only returns `reports` fields.

**Fix option (recommended — backend change):** Update `getHistoryByUser` in `backend/src/repositories/report.repository.js` to LEFT JOIN scorecards:

```sql
SELECT r.*, i.type AS interview_type, i.created AS interview_date,
       sc.overall_score, sc.confidence, sc.tech_knowledge, sc.communication,
       sc.problem_solving, sc.decision
FROM reports r
JOIN interviews i ON i.id = r.interview_id
LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
WHERE i.internal_user_id = @userId
ORDER BY r.created DESC
```

After this backend fix, the frontend can read `report.overall_score`, `report.confidence`, etc. directly.

**Fix option (frontend-only):** If you don't want to change the backend, hide the score section when data is missing: `{report.overall_score != null && <div>...scores...</div>}`

**D — `report.tips` doesn't exist**
There is no `tips` column in the `reports` table. Remove the `tipsList` derived value and any UI that reads `report?.tips`.

**E — Missing availability display**
Add the same availability badge as described in TeamPage (section 2.2 D) to the member profile header area.

**F — Hardcoded hex colors**
Replace all inline hex values with tokens per the reference table.

---

### 2.4 ReportsPage.jsx

File: `frontend/src/pages/manager/ReportsPage.jsx`

**Issues (critical — will show blank data or wrong data for every row):**

**A — Wrong field names from API response**
`getReportsByManager` returns these aliases in the SQL JOIN:
- `candidate_first` (not `first_name`)
- `candidate_last` (not `last_name`)
- `interview_type` (the type column alias)
- `interview_date` (aliased from `i.created`)
- `team_member_id`
- `r.created` for report date

**Fix:** Replace every field reference in ReportsPage:
- `r.first_name` → `r.candidate_first`
- `r.last_name` → `r.candidate_last`
- `r.report_date` / `r.completed_date` / `r.scheduled_date` → `r.created`
- `r.type` → `r.interview_type`
- `r.report_id` / `r.attempt_id` (used in row `key` props) → `r.id`

**B — `r.attempts` doesn't exist**
Remove any display of `r.attempts`. The `reports` table has no attempts column.

**C — `r.decision` is always undefined**
`getReportsByManager` does not JOIN the `scorecards` table. Every row shows "Pending" regardless of actual decision.

**Fix — backend:** Add scorecard join to `getReportsByManager` in `backend/src/repositories/report.repository.js`:

```sql
SELECT r.*,
       COALESCE(iu.first_name, ec.first_name) AS candidate_first,
       COALESCE(iu.last_name,  ec.last_name)  AS candidate_last,
       i.type AS interview_type,
       i.created AS interview_date,
       tm.id AS team_member_id,
       sc.decision,
       sc.overall_score
FROM reports r
JOIN interviews i ON i.id = r.interview_id
LEFT JOIN users iu ON iu.id = i.internal_user_id
LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
LEFT JOIN team_members tm ON tm.user_id = i.internal_user_id AND tm.manager_id = i.manager_id
LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
WHERE i.manager_id = @managerId
ORDER BY r.created DESC
```

After this fix, `r.decision` will be `'pass'` / `'maybe'` / `'reject'` / `null` and `r.overall_score` will be available.

**D — Stats API returns only `{ total_reports }` but frontend expects more**
`getStatsByManager` in `report.repository.js` only returns `{ total_reports }`. If the frontend tries to access `stats.passRate`, `stats.averageScore`, etc., they will be `undefined`.

**Fix option 1 (frontend — recommended):** Compute all stats from the `reports` array already loaded:

```jsx
// After loading reports:
const totalCount = reports.length
const passCount = reports.filter(r => r.decision === 'pass').length
const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0
const scores = reports.map(r => r.overall_score).filter(s => s != null)
const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A'
const pending = reports.filter(r => r.status !== 'ready').length
```

Remove the `api.getReportStats()` / `api.getTeamStats()` call from this page if the stats are computed from loaded data.

**Fix option 2 (backend):** Extend `getStatsByManager` to JOIN scorecards and compute pass_count, avg_score, etc.

**E — Hardcoded hex colors**
Replace all inline hex values with tokens.

---

### 2.5 SchedulePage.jsx

File: `frontend/src/pages/manager/SchedulePage.jsx`

**Issues:**

**A — Hardcoded hex in `TYPE_STYLE` object**
The `TYPE_STYLE` constant at the top uses hardcoded hex for all four types. Replace:
```js
const TYPE_STYLE = {
  ai:       { bg: 'var(--warning-50)',  border: 'var(--warning-500)', color: 'var(--warning-700)', label: 'AI screen' },
  human:    { bg: 'var(--brand-50)',    border: 'var(--brand-500)',   color: 'var(--brand-700)',   label: 'Live interview' },
  exam:     { bg: 'var(--info-50)',     border: 'var(--info-500)',    color: 'var(--info-600)',    label: 'Coding exam' },
  ai_voice: { bg: 'var(--warning-50)',  border: 'var(--warning-500)', color: 'var(--warning-700)', label: 'AI screen' },
}
```

**B — Hardcoded hex in calendar grid**
Replace `color: '#5B4FE9'` (today date highlight) with `color: 'var(--brand-500)'` and `color: '#0F172A'` with `color: 'var(--fg-primary)'`.

**C — Functionally correct**
All API calls are real (`api.getCalendarEvents`, `ScheduleModal`). No mock data.

---

### 2.6 TemplatesPage.jsx

File: `frontend/src/pages/manager/TemplatesPage.jsx`

**Issues:**
- Good: already uses CSS tokens (`var(--bg-surface)`, `var(--border-default)`, `var(--radius-lg)`, etc.) throughout
- Good: proper use of shared Modal, Button, EmptyState, ErrorMessage, Spinner
- Minor: error handling uses `alert()` in two places — replace with in-page error state
- "Coming Soon" overlay is intentional — leave it
- No API field mismatches (templates table schema matches)

**Fixes:**
- In `handleCreate` catch: `setError('Could not create template.')` instead of `alert(...)`
- In `handleEdit` catch: same pattern
- Add `const [formError, setFormError] = useState(null)` and display below each form

---

### 2.7 ManagerProfilePage.jsx

File: `frontend/src/pages/manager/ManagerProfilePage.jsx`

**Issues:**

**A — Local Avatar (see 1.1)**

**B — Local Toggle component**
A small `Toggle` component is defined inline. This is profile-page-specific — it's acceptable to keep it local, but move it above the main component function (not inside it).

**C — Hardcoded hex colors**
Replace all inline hex with tokens. Key violations:
- `background: '#FFF'` → `var(--bg-surface)`
- `border: '1px solid #E2E8F0'` → `var(--border-default)`
- `color: '#5B4FE9'` → `var(--brand-500)`
- `color: '#0F172A'` → `var(--fg-primary)`
- `color: '#6B7280'` → `var(--fg-muted)`
- eyebrow `color: '#5B4FE9'` → `var(--brand-500)`

**D — `handleSave` only sends `firstName` and `lastName`**
The PATCH `/api/profile` endpoint supports more fields. This is fine for now — just ensure the form only marks `name` as editable and the others as read-only (already done).

**E — Notification toggles don't persist**
Toggle state saves to local `notifs` state only — no API call. This is acceptable if notifications/2FA are not yet implemented on the backend. No fix needed unless backend is wired.

---

### 2.8 ResumeAnalyzerPage.jsx

File: `frontend/src/pages/manager/ResumeAnalyzerPage.jsx`

**Issues:**

**A — Direct `fetch()` calls (see 1.2 for fix)**
Two places call `fetch()` directly. Fix described in cross-cutting section 1.2.

**B — Hardcoded hex colors**
Replace all inline hex with tokens. This file has many, but the most important are the verdict/score colors which are semantic — map them to token variables:
- `#047857` (pass green) → `var(--success-600)`
- `#B45309` (borderline) → `var(--warning-600)`
- `#B53618` (fail red) → `var(--danger-700)`
- `#ECFDF5` (green bg) → `var(--success-50)`
- `#FEF2F2` (red bg) → `var(--danger-50)`
- `#FFFBEB` (yellow bg) → `var(--warning-50)`

**C — Functionally correct**
Library mode analysis is all client-side. AI mode fallbacks correctly. No mock data.

---

### 2.9 ClientInterviewsPage.jsx — FULL API INTEGRATION NEEDED

File: `frontend/src/pages/manager/ClientInterviewsPage.jsx`

**Current state:** 100% mock. Uses `MOCK_TEMPLATES` array, WizardModal has no state or API calls, detail view shows placeholder text.

**Complete rewrite required. Implement the following:**

#### State to add

```jsx
const [templates, setTemplates] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
const [wizardOpen, setWizardOpen] = useState(false)
const [selectedTemplate, setSelectedTemplate] = useState(null)
const [templateDetail, setTemplateDetail] = useState(null)  // full template with matches
const [detailLoading, setDetailLoading] = useState(false)
const [tab, setTab] = useState('overview')
```

#### Load templates on mount

```jsx
useEffect(() => { loadTemplates() }, [])

async function loadTemplates() {
  setLoading(true); setError(null)
  try {
    const res = await api.getClientTemplates()
    setTemplates(res.data || [])
  } catch { setError('Could not load client templates.') }
  finally { setLoading(false) }
}
```

#### Template card display (replace MOCK_TEMPLATES)

The API returns fields: `id`, `client_name`, `job_title`, `headcount`, `tags` (JSON string), `resume_deadline`, `created`. Parse tags: `JSON.parse(t.tags || '[]')`. Match count is NOT returned by `getClientTemplates` — either add it to the backend query, or fetch it per-template lazily, or remove the "X Matches" badge from the list view and show it only in the detail view.

Template card:
```jsx
{templates.map(t => {
  const tags = (() => { try { return JSON.parse(t.tags || '[]') } catch { return [] } })()
  return (
    <div key={t.id} onClick={() => openDetail(t)} style={{ /* card styles using tokens */ }}>
      <h3>{t.job_title}</h3>
      <p>{t.client_name}{t.headcount ? ` • ${t.headcount} needed` : ''}</p>
      <div>{tags.map(tag => <span key={tag}>{tag}</span>)}</div>
    </div>
  )
})}
```

#### Opening detail view

When clicking a template card:
```jsx
async function openDetail(t) {
  setSelectedTemplate(t)
  setTab('overview')
  setDetailLoading(true)
  try {
    const [detailRes, matchRes] = await Promise.all([
      api.getClientTemplate(t.id),
      api.getTemplateMatches(t.id),
    ])
    setTemplateDetail({ ...detailRes.data, matches: matchRes.data || [] })
  } catch { /* show error in detail view */ }
  finally { setDetailLoading(false) }
}
```

#### Detail view tabs

Replace `<p>Content for {tab} goes here...</p>` with real content:

- **overview tab:** Show `templateDetail.client_name`, `templateDetail.job_title`, `templateDetail.requirements`, `templateDetail.resume_deadline`, created date
- **candidates tab:** Render `templateDetail.matches` array (from `GET /:id/matches`). Each entry has `first_name`, `last_name`, `match_score`, `matched_tags`, `availability`. Add checkboxes to select candidates, then a "Send JD to selected" button that calls `api.sendJDToTeam(templateDetail.id, { userIds: selectedUserIds, deadline: templateDetail.resume_deadline })`.
- **jd tab:** Show `templateDetail.jd_text` in a formatted block
- **reports tab:** (Leave as placeholder for now, or load reports filtered by `client_template_id` when that route exists)

#### WizardModal — full rewrite

Replace the uncontrolled inputs with controlled state:

```jsx
function WizardModal({ open, onClose, onDone }) {
  const [step, setStep] = useState(1)
  const [clientName, setClientName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [headcount, setHeadcount] = useState('')
  const [jdText, setJdText] = useState('')
  const [resumeDeadline, setResumeDeadline] = useState('')
  const [tags, setTags] = useState([])   // extracted by AI
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleExtractTags() {
    if (!jdText.trim()) return
    setExtracting(true)
    try {
      const res = await api.extractTemplateTags(jdText)
      setTags(res.data || [])
      setStep(2)
    } catch { setError('Could not extract tags.') }
    finally { setExtracting(false) }
  }

  async function handleSave() {
    if (!clientName.trim() || !jobTitle.trim()) { setError('Client name and role are required.'); return }
    setSaving(true)
    try {
      await api.createClientTemplate({
        client_name: clientName,
        job_title: jobTitle,
        headcount: headcount ? parseInt(headcount, 10) : null,
        jd_text: jdText,
        tags,
        resume_deadline: resumeDeadline || null,
      })
      onDone && onDone()
      onClose()
    } catch (err) { setError(err.message || 'Could not save template.') }
    finally { setSaving(false) }
  }

  // Step 1: form fields (controlled)
  // Step 2: show extracted tags, allow editing, confirm save
  // ...
}
```

Tags in step 2 should be editable (allow user to remove a tag by clicking an × on each chip, and show an "Extract tags again" option).

---

### 2.10 MonthlyAssessmentPage.jsx — FULL API INTEGRATION NEEDED

File: `frontend/src/pages/manager/MonthlyAssessmentPage.jsx`

**Current state:** 100% mock. Uses `MOCK_SUBJECTS` and `MOCK_CALENDAR`, WizardModal has no state or API calls.

**Complete rewrite required. Implement the following:**

#### State to add

```jsx
const [assessments, setAssessments] = useState([])
const [calendarData, setCalendarData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
const [tab, setTab] = useState('subjects')
const [wizardOpen, setWizardOpen] = useState(false)
```

#### Load data on mount

```jsx
useEffect(() => { loadAll() }, [])

async function loadAll() {
  setLoading(true); setError(null)
  try {
    const [subjRes, calRes] = await Promise.all([
      api.getMonthlyAssessments(),
      api.getMonthlyAssessmentCalendar(),
    ])
    setAssessments(subjRes.data || [])
    setCalendarData(calRes.data || [])
  } catch { setError('Could not load assessments.') }
  finally { setLoading(false) }
}
```

#### Subjects table

Replace `MOCK_SUBJECTS` with `assessments`. API response fields per assessment:
- `id`, `subject`, `topic`, `sub_topics` (JSON string), `difficulty`, `jd_text`, `duration_months`, `status`, `manager_id`, `created`
- `enrollments` (array, from the GET / route which fetches them): each enrollment has `team_member_id`, `status`, `availability`, `month_progress` (JSON array)

Columns to show: Subject (`a.subject`), Topic (`a.topic`), Difficulty (`a.difficulty`), Duration (`a.duration_months + ' months'`), Enrolled (count: `a.enrollments?.length || 0`), Status (from `a.status`)

#### Calendar (Year View)

The calendar API (`GET /api/assessments/monthly/calendar`) returns enrollment rows. Transform them into the per-member, per-month grid. The `getCalendarByManager` query returns:
```
{ enrollment_id, team_member_id, first_name, last_name, month_progress, interview_status, assessment_subject }
```

Transform for the year grid:
```jsx
// Group by team_member_id, then show 12 cells using month_progress JSON array
const calRows = calendarData.map(row => ({
  name: `${row.first_name} ${row.last_name}`,
  months: JSON.parse(row.month_progress || '[]')
}))
```

Status color map (matches current mock colors):
- `'completed'` → green (`var(--success-500)`)
- `'scheduled'` → blue (`var(--info-500)`)
- `'cancelled'` → red (`var(--danger-500)`)
- `'pending'` → grey (`var(--bg-surface-alt)`)

#### WizardModal — full rewrite

```jsx
function WizardModal({ open, onClose, onDone }) {
  const [step, setStep] = useState(1)
  // Step 1 state
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  // Step 2 state
  const [subTopics, setSubTopics] = useState('')
  const [generating, setGenerating] = useState(false)
  // Step 3 state
  const [jdText, setJdText] = useState('')
  const [generatingJd, setGeneratingJd] = useState(false)
  // Step 4 state
  const [durationMonths, setDurationMonths] = useState(3)
  const [teamList, setTeamList] = useState([])
  const [selectedMemberIds, setSelectedMemberIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      api.getTeam().then(r => setTeamList(r.data || [])).catch(() => {})
    }
  }, [open])

  async function handleGenerateSubtopics() {
    if (!subject) return
    setGenerating(true)
    try {
      const res = await api.generateSubtopics({ subject, topic, difficulty })
      // res.data is an array of subtopic strings
      setSubTopics(Array.isArray(res.data) ? res.data.join('\n') : res.data)
    } catch { setError('Could not generate subtopics.') }
    finally { setGenerating(false) }
  }

  async function handleGenerateJD() {
    setGeneratingJd(true)
    try {
      const topics = subTopics.split('\n').map(t => t.trim()).filter(Boolean)
      const res = await api.generateAssessmentJD({ subject, subTopics: topics, difficulty })
      setJdText(typeof res.data === 'string' ? res.data : JSON.stringify(res.data))
    } catch { setError('Could not generate study material.') }
    finally { setGeneratingJd(false) }
  }

  async function handleCreate() {
    if (!subject) { setError('Subject is required.'); return }
    setSaving(true)
    try {
      const topics = subTopics.split('\n').map(t => t.trim()).filter(Boolean)
      await api.createMonthlyAssessment({
        subject,
        topic,
        sub_topics: JSON.stringify(topics),
        difficulty,
        jd_text: jdText,
        duration_months: durationMonths,
        team_member_ids: selectedMemberIds,
      })
      onDone && onDone()
      onClose()
    } catch (err) { setError(err.message || 'Could not create assessment.') }
    finally { setSaving(false) }
  }

  // Step 1: subject/topic/difficulty fields (controlled)
  // Step 2: subtopics textarea + "Generate with AI" button calling handleGenerateSubtopics
  // Step 3: JD display area + "Generate study material" button calling handleGenerateJD
  // Step 4: duration_months input + team member multi-select + enforced rules block (static)
}
```

For step 4 team member selection, use a checkbox list rendered from `teamList`:
```jsx
{teamList.map(m => (
  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 }}>
    <input
      type="checkbox"
      checked={selectedMemberIds.includes(m.id)}
      onChange={() => setSelectedMemberIds(prev =>
        prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
      )}
    />
    {m.first_name} {m.last_name}
    {m.availability && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>• {m.availability}</span>}
  </label>
))}
```

---

## Section 3: Candidate pages

### 3.1 CandidateDashboardPage.jsx

File: `frontend/src/pages/candidate/CandidateDashboardPage.jsx`

**Issues:**

**A — Local V2Av Avatar (see 1.1)**
`V2Av` is used inside the page but only for the upcoming interview cards. Replace with `shared/Avatar`.

**B — Resume upload is mocked**
`handleResumeUpload` uses `setTimeout` and hardcodes `['React', 'Node.js', 'TypeScript']` as the extracted tags.

**Fix:** Wire to real `api.uploadResume`. The candidate needs to send their user ID, not a team_member ID. Two options:

Option 1 (simplest — no backend change): The `uploadResume` API function sends `teamMemberId` in FormData. Since candidates added to teams have a team_member record, the candidate's team_member ID would be needed. However, the candidate's localStorage `user` object only has `user.id` (user ID). This won't work with the current upload endpoint.

Option 2 (add a `/api/profile/resume` endpoint — recommended): Add a new backend route that handles resume upload for the currently authenticated user without requiring teamMemberId:

```js
// backend/src/routes/profile.routes.js — add to existing file
router.post('/resume', upload.single('resume'), async (req, res) => {
  try {
    // Same logic as /api/upload/resume but uses req.user.id directly
    const buffer = req.file.buffer
    const resumeUrl = await storageService.uploadResume(req.user.id, buffer, req.file.originalname)
    await userRepository.updateProfile(req.user.id, { resumeUrl })
    // async tag extraction
    pdfService.extractTextFromBuffer(buffer).then(async text => {
      if (text) {
        const tags = await llmService.extractTagsFromText(text)
        await userRepository.updateProfile(req.user.id, { tags })
      }
    }).catch(() => {})
    res.json({ success: true, data: { resumeUrl } })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Upload failed' })
  }
})
```

Then add to `api.js`:
```js
export const uploadOwnResume = (file) => {
  const fd = new FormData(); fd.append('resume', file)
  return authFetch('/api/profile/resume', { method: 'POST', body: fd })
    .then(async r => {
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || 'Upload failed') }
      return r.json()
    })
}
```

Then update `handleResumeUpload` in the dashboard:
```jsx
async function handleResumeUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  setResumeUploading(true)
  try {
    await api.uploadOwnResume(file)
    // Tags are extracted async on the server — reload profile to get updated tags
    const profRes = await api.updateCandidateProfile({}) // or a getProfile call
    // display tags from refreshed profile if available
  } catch { alert('Upload failed') }
  finally { setResumeUploading(false) }
}
```

Note: Tags are extracted asynchronously on the server after upload. The simplest UX is to show a "Resume uploaded — tags will appear shortly" message and omit the immediate tags display.

**C — `handleStatusChange` sends wrong field name**
The code calls `api.updateCandidateProfile({ status: s })`. The DB column is `availability`, not `status`. Fix:
```jsx
await api.updateCandidateProfile({ availability: s })
```

**D — Initial status reads `user.status` — should be `user.availability`**
```jsx
const [status, setStatus] = useState(user.availability || 'bench')
```

**E — `c.score` on completed interviews is undefined**
Interviews from `getCandidateInterviews` don't include score data. The `avgScore` calculation will always be `'N/A'`. Either remove the "Average Score" stat card or use `c.overall_score` if added to the candidate interviews response.

For now, remove `Average Score` and `Total Attempts` stat cards, or show them as `'N/A'`/`'0/0'` with a `—` instead of `NaN`.

**F — Hardcoded hex colors throughout**
Replace all inline hex with tokens. This file has extensive violations including the `AV_COLORS` array, info banner, stat cards, and button styles.

---

## Section 4: Interviewer pages

### 4.1 InterviewerDashboard.jsx

File: `frontend/src/pages/interviewer/InterviewerDashboard.jsx`

**Issues:**

**A — Local Avatar (see 1.1)**

**B — Hardcoded hex throughout**
The `card` const object and all inline styles use hardcoded hex. Replace with tokens. Key:
- `card.background: '#FFF'` → `var(--bg-surface)`
- `card.border: '1px solid #E2E8F0'` → `var(--border-default)`
- `color: '#0F172A'` → `var(--fg-primary)`
- `color: '#6B7280'` → `var(--fg-muted)`
- Brand badges (`background: '#EFEDFD', color: '#5B4FE9'`) → `var(--brand-50)`, `var(--brand-500)`

**C — Functionally correct**
Real API calls, loading/error/empty states, pagination via `today` / `upcoming` derived values.

---

### 4.2 ScorecardPage.jsx

File: `frontend/src/pages/interviewer/ScorecardPage.jsx`

**Issues:**

**A — Hardcoded hex throughout**
Replace all inline hex with tokens. The `DECISIONS` array and `EvidenceField` component are the main sources.

**B — `onMouseEnter/onMouseLeave` for submit button hover**
The submit button uses JS hover handlers instead of CSS. This is fine for inline styles since CSS pseudo-classes don't work there — no change needed.

**C — Functionally correct**
Real API calls (`getScorecardData`, `submitScorecard`), loading/error states, AI pre-fill from transcript.

---

### 4.3 InterviewerProfilePage.jsx

File: `frontend/src/pages/interviewer/InterviewerProfilePage.jsx`

**Issues (assumed — same pattern as ManagerProfilePage):**
- Likely defines a local Avatar
- Hardcoded hex colors

Apply same fixes as ManagerProfilePage (2.7): replace local Avatar, replace hex with tokens.

---

## Section 5: Shared components

### 5.1 Avatar.jsx — update to accept numeric size

File: `frontend/src/components/shared/Avatar.jsx`

See section 1.1 for the specific one-line fix. No other changes needed.

### 5.2 ScheduleModal.jsx

File: `frontend/src/components/manager/ScheduleModal.jsx`

**Issues:**

**A — Local TinyAv Avatar (see 1.1)**

**B — Hardcoded hex throughout**
The `field` style object, `onFocusField`, `modeBtn`, and `pillBtn` functions use hardcoded hex. The stepper uses hardcoded hex. Replace with tokens.

**C — Functionally correct**
All 4 steps are properly wired. Submits to `api.createSchedule()`. No mock data.

---

## Section 6: Sidebar navigation — check for missing links

File: `frontend/src/components/layout/Sidebar.jsx`

**Check (read the file before editing):** Confirm that the sidebar navigation includes links to:
- `/manager/monthly` (Monthly Assessments)
- `/manager/clients` (Client Interviews)

These routes exist in `App.jsx` but the sidebar may not have links to them yet. If missing, add them after `/manager/reports` in the navigation list.

---

## Section 7: api.js additions summary

All new named exports to add to `frontend/src/services/api.js`:

```js
// Profile resume upload (for candidate own upload)
export const uploadOwnResume = (file) => { ... }  // see section 3.1 B

// Resume analyzer helper functions (replaces direct fetch calls)
export const extractTextFromFile = (file) => { ... }    // see section 1.2
export const analyzeResumeMatch = (jd, resume) => { ... }  // see section 1.2
```

The following exports already exist in api.js and are correct:
- `getClientTemplates`, `createClientTemplate`, `updateClientTemplate`, `getClientTemplate`
- `extractTemplateTags`, `getTemplateMatches`, `sendJDToTeam`
- `getMonthlyAssessments`, `createMonthlyAssessment`, `getMonthlyAssessmentCalendar`
- `generateSubtopics`, `generateAssessmentJD`
- `updateCandidateProfile`

---

## Section 8: Backend changes required

These are backend changes needed to support the frontend fixes above. All are in `backend/src/`:

### 8.1 Add scorecard JOIN to `getReportsByManager` (supports ReportsPage decision + score)

File: `backend/src/repositories/report.repository.js`, function `getReportsByManager`

Add `LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id` and select `sc.decision, sc.overall_score`. (Full SQL in section 2.4 C above.)

### 8.2 Add scorecard JOIN to `getHistoryByUser` (supports MemberProfilePage scores)

File: `backend/src/repositories/report.repository.js`, function `getHistoryByUser`

Add `LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id` and select `sc.overall_score, sc.confidence, sc.tech_knowledge, sc.communication, sc.problem_solving, sc.decision`. (Full SQL in section 2.3 C above.)

### 8.3 Add `/api/profile/resume` endpoint (supports candidate self-upload)

File: `backend/src/routes/profile.routes.js`

Add `POST /resume` route using multer upload middleware. Uses `req.user.id` directly, uploads to Supabase Storage, updates `users.resume_url`, fires async tag extraction. (Full route code in section 3.1 B above.)

---

## Section 9: Implementation order (suggested)

Work in this order to get the most value per change:

1. **Section 1.1** — Update `shared/Avatar.jsx` to accept numeric size (one line, unblocks all Avatar replacements)
2. **Section 8.1 + 8.2** — Backend: add scorecard JOINs to both report queries (unblocks ReportsPage and MemberProfilePage)
3. **Section 2.4** — ReportsPage: fix all 5 field name bugs (will be blank/wrong until fixed)
4. **Section 2.3 B/C/D** — MemberProfilePage: fix tags/scores/tips fields
5. **Section 2.2 B/D** — TeamPage: fix external type filter + add availability badge
6. **Section 3.1 B/C/D** — CandidateDashboardPage: wire real resume upload + fix availability field
7. **Section 2.9** — ClientInterviewsPage: full API integration
8. **Section 2.10** — MonthlyAssessmentPage: full API integration
9. **Section 6** — Sidebar: add missing nav links
10. **Token + Avatar replacements** — All pages: replace hex with tokens, replace local Avatars (can be done page by page)

---

## Section 10: What NOT to change

- `ResumeAnalyzerPage.jsx` skill dictionaries (`HARD_SKILL_PATTERNS`, `SOFT_SKILL_PATTERNS`) — these are correct intentional code
- `ScheduleModal.jsx` wizard logic — fully functional, only visual token fixes needed
- `TemplatesPage.jsx` "Coming Soon" overlay — intentional
- Candidate interview flow pages (`AIInterviewPage`, `ExamPage`, `HumanInterviewPage`, `DeviceCheckPage`, `ConsentPage`, `DonePage`, `InterviewLandingPage`) — these are separate from this audit
- `App.jsx` routes — `monthly` and `clients` routes already registered correctly
- `api.js` existing named exports — all correct, only add new ones
- `backend/src/repositories/team-member.repository.js` — already SELECTs `u.availability` and `u.tags`
