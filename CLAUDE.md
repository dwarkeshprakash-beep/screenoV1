# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Auto-loaded every Claude Code session. See `docs/INDEX.md` for links to all other files.
> Also read `BRAIN.md` — it covers roles, critical flows, feature impact map, and current gaps.
> This file covers tech stack, rules, and commands. BRAIN.md covers what the app does and how to reason about it.

---

## Dev commands

```bash
# Frontend — Vite dev server at http://localhost:5173
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npm run lint

# Backend — Express on port 4000
cd backend && npm start                # one-shot
cd backend && npm run dev              # auto-reload on file change (nodemon)
```

---
## What this project is

AI interview platform. Managers schedule AI voice interviews, exams, Google Meet-backed human interviews, client mandate work, and monthly assessments. Candidates take work from a browser dashboard or a magic link.

**Status:** Core build is complete for the active V2 surface: Manager, Candidate, and Admin repair pages. Interviewer/LiveKit runtime pages are no longer mounted. Current gaps are tracked in `docs/open-issues.md`.

---

## Tech stack

```
Frontend    React 19 (JSX only — no TypeScript), React Router v6, fetch via src/services/api.js, CSS + tokens.css
            (no axios — all backend calls go through a hand-rolled fetch client with JWT refresh/retry)
Backend     Node.js 20 + Express 5 (single service)
Database    PostgreSQL (currently hosted on Supabase) — plain `pg`, portable to any Postgres host
            by changing DATABASE_URL. No SQL Server support.
Files       Supabase Storage (bucket "files") — resumes and reports only (no audio stored)
Video       Human interviews use manager-provided or Google Meet links; LiveKit is not part of the active V2 runtime
Auth        JWT access token (15 min) + HttpOnly cookie refresh token (7 days)
LLM         Groq gpt-oss-120b → Gemini 3.6 Flash fallback, called via plain fetch() to REST endpoints
            (no SDK packages — see backend/src/services/llm.service.js)
STT         Groq Whisper API (whisper-large-v3) — see backend/src/services/transcription.service.js
TTS         browser.speechSynthesis — cross-browser, free, no API key
Email       nodemailer over SMTP (Brevo) — see backend/src/services/email.service.js
```

---

## Current DB — Supabase (PostgreSQL)

```
Host:     aws-1-ap-southeast-1.pooler.supabase.com
Port:     6543  (transaction pooler)
Database: postgres
User:     postgres.zhnxfghnujizjslygjfs
Package:  pg (node-postgres)
```

Full connection setup: `.claude/skills/db-access.md`

---

## Build state

The real implementation is built and wired end-to-end: `backend/src/` has routes/services/repositories/middleware/db/workers for the active roles, and `frontend/src/App.jsx` is the real role-based router (not the Vite placeholder). See `frontend/CLAUDE.md` and `backend/CLAUDE.md` for the actual current file layout and routes.

Legacy prototype screens and page dumps have been removed from the active repo. The real pages live in `frontend/src/pages/{manager,candidate,admin,auth}/`.

---

## Folder overview

```
screeno/
├── frontend/           ← React app        → see frontend/CLAUDE.md
├── backend/            ← Express API       → see backend/CLAUDE.md
├── .claude/skills/     ← Action skills     → see docs/INDEX.md
├── skills/             ← Guidelines
├── docs/               ← Reference docs    → see docs/INDEX.md for all links
├── assets/
├── CLAUDE.md           ← This file
├── .claudeignore
└── tokens.css
```

Full file tree: `docs/folder-structure.md`

---

## Non-negotiable rules

**Database**
- No foreign key constraints — primary keys only, validation in backend code
- Simple column names: `first_name`, `created`, `status`
- SQL queries only in `backend/src/repositories/` — never in route files
- Use `@param` style for all SQL params — connection layer handles DB differences

**Frontend**
- JSX files only — no TypeScript, no `.tsx`
- Variables at top, return/render at bottom, heavy comments
- Check `frontend/src/components/shared/` before building any new component
- Use design tokens from `tokens.css` — no hardcoded hex colors

**Backend**
- Routes: HTTP only (receive → call service → respond)
- Services: business logic only
- Repositories: SQL queries only
- Never mix these three layers

**AI interview**
- Audio never stored — transcribe on backend, discard immediately
- Save each answer to DB individually as candidate answers
- `MediaRecorder` for capture (cross-browser), `speechSynthesis` for AI voice (cross-browser)

**Code**
- `const`/`let` only — never `var`
- `async/await` — never `.then().catch()`
- One file per component, max ~150 lines
- Loading + error + empty states in every data-fetching component

---

## Senior lens — apply to every response

Before giving any code, fix, or architectural guidance, silently check through these:

- **Security**: does this introduce auth bypass, token exposure, missing ownership check, or SQL injection?
- **Data correctness**: does the query return the right data? Any missing JOINs? Any field name mismatch between API and frontend?
- **Architecture**: does the change stay in the right layer? SQL in repositories, logic in services, HTTP in routes?
- **UI/UX**: does the user know what's happening? Loading + error + empty states present?
- **Performance**: any N+1 queries, unbounded loops, missing indexes, or objects recreated on every render?
- **Product**: does this serve an actual user need? Does it match Phase 1 scope?

Surface concerns proactively in one sentence. Don't wait to be asked. Run `/senior` for deep analysis, `/junior` for quick scans.

---

## All documentation

See `docs/INDEX.md` for a full list of every file and what it covers.

---

## Git

```
Repo:   https://github.com/dwarkeshprakash-beep/screenoV1
Flow:   main → dev → feat/fix/chore branches
Format: feat: add schedule modal
        fix: audio not recording on Firefox
```

---
## Rules
See `docs/rules.md` — read this before writing any code or installing any package.
