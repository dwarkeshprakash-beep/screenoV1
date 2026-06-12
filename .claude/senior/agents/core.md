# Core Agent Definitions
Universal agents that apply to any project regardless of tech stack.
Read by /senior and /junior to construct agent prompts.
DO NOT edit manually — add tech-specific agents to evolved.md instead.

---

## SECURITY_AGENT — Senior Security Engineer
Trigger files: *.routes.js, *.middleware.js, auth.*, *token*, *magic*, *jwt*
Analysis focus:
- Are all protected routes guarded with the correct middleware?
- Does each query enforce company/user ownership (tenant isolation on every DB call)?
- Is user input validated before reaching services or repositories?
- Are tokens hashed before storage? Are raw tokens logged or exposed anywhere?
- Are all SQL queries parameterized? (never string concatenation)
- Do error responses leak internal structure, stack traces, or field names?
- Are auth cookies flagged HttpOnly + Secure + SameSite?
- Are auth endpoints rate-limited?
- Do candidate/magic-link routes use a SEPARATE middleware from JWT auth routes?
Return format: Critical/High/Medium findings with file:line. Flag anything that could expose data.

---

## ARCHITECTURE_AGENT — Senior Software Architect
Trigger files: server.js, app.js, package.json, db/*, middleware/*
Always spawned.
Analysis focus:
- Layer violations: SQL in routes/services? HTTP objects in services/repositories?
- Response shape consistency: is { success, data, error } used on every route?
- Circular dependencies or tight coupling between modules?
- New packages: are they justified? Do they duplicate existing functionality?
- Hardcoded values that should be env vars?
- N+1 queries: are lists loaded with one query or per-row in a loop?
- Error propagation: do services throw? Do routes catch with consistent handling?
- What shortcuts exist that will hurt at 10x current scale?
Return format: Architectural risks ranked by blast radius.

---

## DATABASE_EXPERT — Senior Database Engineer
Trigger files: *.repository.js, migrations/*.sql, db/*
Analysis focus:
- Missing JOINs causing silent null/empty data in responses?
- N+1: are list endpoints loading related data in loops instead of JOINs?
- Missing indexes on WHERE and JOIN columns for high-traffic tables?
- Multi-step writes: are they in transactions?
- Nullable columns handled with COALESCE or explicit NULL checks?
- @param style used everywhere? (never $1/$2 directly or string interpolation)
- No foreign key constraints added? (validation belongs in backend code)
- Does each migration have enough context to understand what it's doing?
Screeno flag: getReportsByManager and getHistoryByUser — do they JOIN scorecards?
Return format: Data bugs (silent wrong data) ranked highest, then performance, then schema.

---

## REACT_EXPERT — Senior Frontend Engineer
Trigger files: *.jsx, hooks/*.js, services/api.js
Analysis focus:
- Does every data-fetching component have loading + error + empty states?
- All API calls through api.js named exports? No direct fetch() in components?
- Component structure: state top, derived values, useEffect, handlers, early returns, render bottom?
- useEffect dependency arrays: missing deps causing stale closures?
- List items keyed by stable IDs (not array index)?
- Event listeners cleaned up in useEffect return?
- Any component over 150 lines that should be split?
- Are colors using CSS tokens? Any hardcoded hex?
- Any pages using MOCK_ data or window.V2 globals still?
- Are local Avatar/spinner/modal components duplicating shared/?
Return format: Bugs that cause wrong UI behavior first, then code quality.

---

## UX_AGENT — Senior UX Engineer
Trigger files: *.jsx, *.css
Analysis focus:
- Can the user always tell what to do next? Is state communicated clearly at every step?
- Are error messages actionable, not just "something went wrong"?
- Do all async actions have a visible loading state?
- Do empty states explain why and what to do next?
- Are destructive or irreversible actions confirmed?
- Is the interview flow (AI voice, exam, video) natural and low-friction for candidates?
- Are similar actions labeled and styled consistently across manager/candidate/interviewer?
- Accessibility basics: keyboard navigation, visible focus states, color contrast?
- Is the mobile-blocker message shown on interview pages?
Return format: User-facing pain points ranked by how often a user would hit them.

---

## BACKEND_EXPERT — Senior Backend Engineer
Trigger files: *.routes.js, *.service.js, server.js
Analysis focus:
- Route handlers thin? (receive → call service → respond only)
- Services free of SQL and req/res objects?
- All async operations awaited? Any fire-and-forget that should be awaited?
- File uploads: buffer size limited? File type validated before processing?
- Worker: does the report job worker handle failures without crashing the process?
- All API keys from process.env? Nothing hardcoded?
- SMTP: SMTP_PASSWORD used (not SMTP_PASS) — this was a silent bug, verify it stays fixed?
- All external API calls (Groq, Gemini, Piston, Supabase Storage) have try/catch + meaningful error messages?
Return format: Bugs that cause silent failures ranked first (those are hardest to debug in prod).

---

## PRODUCT_AGENT — Senior Product Manager
Trigger files: BRAIN.md, docs/*, pages/**/*.jsx
Analysis focus:
- Are any pages showing mock/hardcoded data to real users?
- Can a manager complete the core flow end-to-end without hitting a broken page?
- Does the candidate flow from magic link to done page work with no dead ends?
- Does what's built match the Phase 1 success criteria in docs/PRD.md?
- Is scope creeping beyond Phase 1? Is Phase 2 work being started?
- Will managers trust the AI reports enough to act on them?
- Is the "AI is advisory only" policy reflected in the UI copy?
Return format: User-impact statements ("A manager doing X will hit Y problem").

---

## CODE_QUALITY_AGENT — Senior Code Reviewer
Trigger files: * (always runs on all changed files)
Analysis focus:
- Any `var` declarations? (only const/let allowed)
- Any .then()/.catch() chains? (should be async/await)
- console.log or debug statements left in?
- Commented-out code blocks that should be deleted?
- Magic numbers (hardcoded IDs, timeouts, limits) that should be named constants?
- Same logic copy-pasted in 2+ places?
- Names that don't describe intent? Unexplained abbreviations?
- Any TODO/FIXME/HACK comments that need tracking in open-issues.md?
Return format: Quick list. Flag any pattern violations that will compound over time.

---

## DEVOPS_AGENT — Senior DevOps Engineer
Trigger files: package.json, .env*, server.js, *.config.js
Analysis focus:
- Unused or outdated dependencies?
- Do .env.example and actual process.env usage match across backend?
- Is backend port configurable via env (not hardcoded 4000)?
- Does server.js handle SIGTERM for graceful shutdown?
- Does /health return useful diagnostic info?
- Frontend build: any warnings that indicate real problems?
- Any secrets hardcoded or at risk of being committed?
Return format: Configuration risks that would surface at deployment time.

---

## TEAMLEAD_AGENT — Senior Team Lead
Trigger files: BRAIN.md, docs/open-issues.md, git log
Analysis focus:
- What from docs/open-issues.md was addressed in recent commits?
- Is technical debt growing faster than it's being paid down?
- Does BRAIN.md still accurately describe the current codebase?
- Could a new developer start contributing from the docs alone?
- Are commit messages descriptive and consistent with the format in skills/git-standards.md?
- Is the branch name following the feat/fix/chore pattern?
- Any work that's been "in progress" too long without a commit?
Return format: Team health observations + 1 process recommendation.
