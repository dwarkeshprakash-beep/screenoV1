# Screeno — Documentation Index

Every markdown file in this project. One place to find anything.

---

## Quick links by what you're trying to do

| I want to... | Go to |
|---|---|
| Understand the app, roles, and critical flows | `BRAIN.md` |
| See what's built, what's open, file map | `BRAIN.md` + `docs/open-issues.md` |
| Understand the full project (tech stack, rules) | `CLAUDE.md` |
| Work on the frontend (patterns, structure) | `frontend/CLAUDE.md` |
| Work on the backend (layers, routes) | `backend/CLAUDE.md` |
| Build the interview audio flow | `.claude/skills/interview-flow.md` |
| Work with the database | `.claude/skills/db-access.md` |
| Deploy the app | `.claude/skills/deployment.md` |
| See coding style rules | `skills/coding-standards.md` |
| Name files and variables | `skills/naming-conventions.md` |
| Work with git | `skills/git-standards.md` |
| Use Claude Code effectively on this project | `assets/prompts/prompts-guide.md` |
| See the database schema | `docs/database-schema.md` |
| See the full folder tree | `docs/folder-structure.md` |
| Understand product requirements | `docs/PRD.md` |
| See all open bugs and issues with exact fixes | `docs/open-issues.md` |
| Understand tech choices | `docs/tech-stack.md` |
| Run smoke tests | `docs/testing.md` |
| Sync and update all docs | `/sync-docs` command |

---

## All files by location

### Root
```
CLAUDE.md               Project context, tech stack, non-negotiable rules — auto-loaded every session
BRAIN.md                What the app does, roles, critical flows, gaps — auto-loaded every session
tokens.css              Shared CSS design tokens — never hardcode hex colors
.claudeignore           Files excluded from Claude Code context
```

### frontend/
```
CLAUDE.md               Stack, folder structure, component rules, hex→token table — auto-loaded
```

### backend/
```
CLAUDE.md               Stack, DB connection, all routes/services/repos — auto-loaded
```

### .claude/commands/ — Slash commands
```
init-agents.md          Reads all MD files + package.json → generates core.md and evolved.md from scratch
senior.md               Deep parallel multi-agent analysis — all relevant senior roles, session report + inline summary
junior.md               Quick 2-3 agent scan — bullets only, inline, no file output
parallel.md             Build backend + frontend via sub-agents
sync-docs.md            Audit and update all MD files to match current implementation
```

### .claude/senior/ — Senior/Junior agent system
```
agents/core.md          Universal agent definitions (Security, Architecture, DB, React, UX, Backend, Product, etc.)
agents/evolved.md       Stack-specific agents — auto-updated when new tech detected (LiveKit, LLM, Supabase, Auth, Piston, PDF)
baseline.md             First-run knowledge baseline — populated on first /senior run
sessions/               Per-run session reports written by /senior (YYYY-MM-DD-HH-MM.md)
```

### .claude/skills/ — Action skills (loaded on demand)
```
interview-flow.md       Complete interview loop — state machine, audio, transcription, report
db-access.md            DB connection — Supabase + SQL Server, @param style queries
deployment.md           Deploy frontend (Vercel) and backend (Railway)
```

### skills/ — Guidelines
```
coding-standards.md     Code style rules for JSX and Node.js
git-standards.md        Branch names, commit format, PR workflow
naming-conventions.md   File, variable, DB column, API endpoint naming
token-saving.md         Model selection and prompt patterns
```

### docs/ — Reference documentation
```
INDEX.md                THIS FILE
open-issues.md          All open bugs + 100%-mock pages — prioritized, with exact code fixes
PRD.md                  Product requirements — what and why
frontend-guide.md       How the built frontend works — patterns, hooks, how to add pages
backend-guide.md        How the built backend works — MVC layers, how to add endpoints
database-schema.md      SQL schema reference (see also backend/migrations/ for source-of-truth SQL)
folder-structure.md     Every file and folder in the project
tech-stack.md           Technology choices with reasoning
testing.md              Smoke test playbook + test credentials
```

### assets/prompts/
```
prompts-guide.md        Effective Claude prompts — keywords, templates, one-liners
```

### backend/migrations/ — Source of truth for DB schema
```
001_initial_schema.sql  Core tables — DO NOT DELETE, required to recreate the DB
002_new_feature_tables.sql
003_missing_columns.sql
(+ any subsequent migration files)
```

---

## How files are loaded by Claude Code

| File | When loaded |
|---|---|
| Root `CLAUDE.md` + `BRAIN.md` | Every session, automatically |
| `frontend/CLAUDE.md` | When working inside `frontend/` |
| `backend/CLAUDE.md` | When working inside `backend/` |
| `.claude/skills/*.md` | On demand — when skill is relevant |
| `skills/*.md` | Only when explicitly referenced |
| `docs/*.md` | Only when explicitly referenced |
