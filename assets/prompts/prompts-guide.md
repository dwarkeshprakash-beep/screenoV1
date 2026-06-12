# Effective Prompts Guide — Screeno

> A reference for prompts that work well when using Claude Code on this project.
> Covers: adding features, fixing bugs, DB work, debugging, and doc updates.

---

## Keywords that orient Claude quickly

Always include these in prompts when relevant — they load the right context automatically:

| Keyword | What it loads |
|---|---|
| "frontend", "JSX", "page", "component" | `frontend/CLAUDE.md` patterns |
| "backend", "route", "service", "repository" | `backend/CLAUDE.md` patterns |
| "database", "SQL", "query", "migration" | `.claude/skills/db-access.md` |
| "interview", "audio", "transcription", "AI interview" | `.claude/skills/interview-flow.md` |
| "deploy", "Railway", "Vercel" | `.claude/skills/deployment.md` |
| "BRAIN.md" | Current build state and active features |

---

## Adding a new feature

```
Add [feature description] to the [manager|candidate|interviewer] area.

Backend:
- New route: POST /api/[path] in backend/src/routes/[name].routes.js
- Business logic in backend/src/services/[name].service.js  
- SQL in backend/src/repositories/[name].repository.js

Frontend:
- New page: frontend/src/pages/[role]/[Name]Page.jsx
- API call added to frontend/src/services/api.js
- Use shared components from frontend/src/components/shared/
- Follow loading/error/empty state pattern

Rules: JSX only, no TypeScript, @param SQL style, no hardcoded colors.
```

---

## Fixing a bug

```
Bug: [describe what happens vs what should happen]
Location: [file path if known]

Check:
- [what to look at — e.g., "the API call in api.js", "the SQL query in repository"]
- [any known constraint — e.g., "candidates.id and team_members.id are separate namespaces"]

Fix only the bug — don't refactor surrounding code.
```

---

## Database work

```
Add column [name] ([type]) to table [table_name].

1. Create migration: backend/migrations/[NNN]_[description].sql
   (both Postgres and SQL Server versions if the table exists in both schemas)
2. Update repository: backend/src/repositories/[name].repository.js
   - Add @param style queries only
3. Update service if business logic changes
4. Do NOT add foreign key constraints

Run: node backend/setup-db.js to apply migration to Supabase.
```

---

## Updating docs after a feature

```
Feature "[name]" is complete. Update BRAIN.md:
- Move to [x] the checklist items that are now done
- Update "Active Feature" section to reflect current work
- Remove handoff entries older than 2 sessions
- Date: [today's date]

Also update docs/INDEX.md if any new files were added.
```

---

## Running a doc sync

```
/sync-docs
```

This command (`.claude/commands/sync-docs.md`) audits all MD files, updates stale content, removes outdated items, and keeps every file aligned with the current implementation.

---

## Useful one-liners

```
"Check BRAIN.md and tell me what's left to build."
"Audit frontend/src/pages/manager/ against the route list in App.jsx — anything missing?"  
"Is the [feature] wired end-to-end? Trace: api.js → route → service → repository → DB."
"What does backend/src/services/[name].service.js do? Summarize in 3 bullet points."
"Show me all places that write to the [table] table."
```
