# /sync-docs — Synchronize All Project Documentation

You are doing a full documentation audit for Screeno. The goal is to make every MD file
accurately reflect the current codebase — no stale info, no gaps, no duplication.

---

## Understand BRAIN.md's purpose first

BRAIN.md is NOT a tech-stack or architecture doc — those live in CLAUDE.md files.
BRAIN.md answers: what does the app do, who can do what, what are the critical flows,
what changes when feature X is added, and what gaps exist right now.

It should NOT duplicate content from `backend/CLAUDE.md`, `frontend/CLAUDE.md`, or root `CLAUDE.md`.

---

## Step 1 — Read current state

Read these files to understand what is actually built right now:
- `backend/CLAUDE.md` — actual routes, services, repositories
- `frontend/CLAUDE.md` — actual pages, components, hooks
- `frontend/src/App.jsx` — actual route tree
- `frontend/src/pages/` — list all page files, check for mock data (grep: `MOCK_`, `window.V2`)
- `frontend/src/components/shared/` — current shared component list
- `backend/migrations/` — list all migration files (source of truth for DB schema)

---

## Step 2 — Audit each file

### BRAIN.md
Check each section against actual code:
- **Roles**: do the listed capabilities match actual routes and page components?
- **Data relationships**: is the team_members vs candidates ID namespace warning still accurate?
- **Critical flows**: does the auth flow match actual middleware files?
- **Feature impact map**: are the file paths correct?
- **Current gaps**: grep for `MOCK_`, hardcoded mock arrays (`MOCK_TEMPLATES`, `MOCK_SUBJECTS`), local Avatar components — are they still there or fixed?
- Update the "Last updated" date

### docs/open-issues.md
- Mark any issue as `✓ Fixed: [date]` if the code shows it's resolved (grep for the specific symptom)
- Do NOT delete fixed items — they are a history of what was wrong and how it was fixed
- Add any new issues discovered during this audit

### docs/database-schema.md
- Compare against `backend/migrations/*.sql` — those SQL files are the source of truth
- Update any table or column that doesn't match the migrations
- Note which migration added each table

### backend/CLAUDE.md
- Routes list: compare against actual files in `backend/src/routes/`
- Services list: compare against `backend/src/services/`
- Repositories list: compare against `backend/src/repositories/`
- Add any new files, remove any deleted ones

### frontend/CLAUDE.md
- Pages list: compare against actual files in `frontend/src/pages/`
- Shared components: compare against `frontend/src/components/shared/`
- Hooks: compare against `frontend/src/hooks/`

### docs/folder-structure.md
- Run a mental diff against actual project structure
- Add new files/folders, remove deleted ones

### docs/INDEX.md
- Add links to any new files
- Remove links to deleted files

---

## Step 3 — Check for files to delete

Delete an MD file only if ALL three are true:
1. The content it describes no longer exists or was superseded
2. It has no ongoing reference value (not a decision log, not an active task list)
3. It is not linked from `docs/INDEX.md`

Never delete:
- `backend/migrations/*.sql` — required to recreate the DB
- `docs/open-issues.md` — active sprint backlog
- `docs/testing.md` — has real test credentials and smoke test playbook
- Any `.claude/skills/` file still referenced by current features

---

## Step 4 — Senior dev scan (go beyond the obvious)

While auditing, flag any of the following:
- Pages still serving 100% mock data (grep for `MOCK_`, hardcoded arrays)
- Components with local copies instead of using `shared/` (grep for function definitions named `Avatar`, `TinyAv`, `V2Av`)
- Direct `fetch()` calls in page components (should all go through `api.js`)
- Hardcoded hex colors (grep for `#[0-9A-Fa-f]{3,6}` in `.jsx` files)
- Missing scorecard JOIN in report queries (check `report.repository.js`)
- Any env var names that differ between `.env.example` and actual service code

---

## Step 5 — Report

Output a short summary:

```
## Sync complete — [date]

Updated:
- [file] — [what changed]

Issues still open in docs/open-issues.md:
- [list any newly discovered issues]

Issues now fixed (mark in open-issues.md):
- [list]

Files deleted:
- [file] — [why]

Attention — senior dev flags:
- [any pattern violations, mock data still present, data bugs, etc.]
```
