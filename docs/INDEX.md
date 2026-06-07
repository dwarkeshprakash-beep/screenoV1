# Screeno — Documentation Index

Every markdown file in this project. One place to find anything.

---

## Quick links by what you're trying to do

| I want to... | Go to |
|---|---|
| Understand the full project | `CLAUDE.md` |
| Build a frontend screen | `.claude/skills/ui-replication.md` |
| Wire a screen to the real API | `.claude/skills/api-integration.md` |
| Build the interview audio flow | `.claude/skills/interview-flow.md` |
| Work with the database | `.claude/skills/db-access.md` |
| Deploy the app | `.claude/skills/deployment.md` |
| Write code (style guide) | `skills/coding-standards.md` |
| Name files and variables | `skills/naming-conventions.md` |
| Work with git | `skills/git-standards.md` |
| Save Claude Code tokens | `skills/token-saving.md` |
| Understand AI-assisted development | `skills/vibe-coding.md` |
| See the database schema | `docs/database-schema.md` |
| See the full folder tree | `docs/folder-structure.md` |
| Understand product requirements | `docs/PRD.md` |
| Review known bugs and decisions | `docs/AUDIT-BACKLOG.md` |
| Build the frontend (detailed) | `docs/frontend-prompt.md` |
| Build the backend (detailed) | `docs/backend-prompt.md` |
| Understand tech choices | `docs/tech-stack.md` |
| See all decisions made | `docs/discussion.md` |
| Generate assets (logo/illustrations) | `assets/prompts/asset-generation-prompts.md` |

---

## All files by location

### Root
```
CLAUDE.md               Main project context — Claude reads this every session
.claudeignore           Files excluded from Claude Code context
tokens.css              Shared CSS design tokens (colors, fonts, spacing)
INTEGRATION.md          Original integration notes
```

### frontend/
```
CLAUDE.md               Frontend-specific context — loaded when Claude works in frontend/
```

### backend/
```
CLAUDE.md               Backend-specific context — loaded when Claude works in backend/
```

### .claude/skills/ — Action skills (Claude loads on demand)
```
ui-replication.md       Every screen from v2 prototype cataloged — layout, states, components
api-integration.md      How to replace mock data with real API calls, screen by screen
interview-flow.md       Complete interview loop — state machine, audio, transcription, report
db-access.md            Database connection — Supabase + SQL Server, two-file pattern
deployment.md           How to deploy frontend and backend to production
```

### skills/ — Guidelines (human reference docs)
```
coding-standards.md     Code style rules for JSX and Node.js with examples
git-standards.md        Branch names, commit format, PR workflow
naming-conventions.md   File names, variables, DB columns, API endpoints
token-saving.md         Model selection, prompt patterns, token budget
vibe-coding.md          AI-assisted development philosophy and checklist
```

### docs/ — Reference documentation
```
INDEX.md                THIS FILE — links to everything
AUDIT-BACKLOG.md        Prioritized bugs, risks, fixes, alternatives, and product opportunities
PRD.md                  Product requirements — what we're building and why
frontend-prompt.md      Detailed frontend build guide — components, hooks, patterns
backend-prompt.md       Detailed backend build guide — routes, services, repos, LLM
database-schema.md      Full SQL schema — PostgreSQL (Supabase) + SQL Server versions
folder-structure.md     Every file and folder in the project
tech-stack.md           Technology choices with reasoning and cost breakdown
discussion.md           All decisions made — what, why, what was rejected
```

### assets/prompts/
```
asset-generation-prompts.md   AI prompts for logo, illustrations, favicon, OG image
```

---

## How files are loaded by Claude Code

| File | When loaded |
|---|---|
| Root `CLAUDE.md` | Every session, automatically |
| `frontend/CLAUDE.md` | When Claude navigates into `frontend/` |
| `backend/CLAUDE.md` | When Claude navigates into `backend/` |
| `.claude/skills/*.md` | On demand — when Claude decides the skill is relevant |
| `skills/*.md` | Only when explicitly referenced |
| `docs/*.md` | Only when explicitly referenced |

**Tip:** When asking Claude to build something, tell it which skill to use:
> "Build the TeamPage using the patterns in `.claude/skills/ui-replication.md` and `.claude/skills/api-integration.md`"
