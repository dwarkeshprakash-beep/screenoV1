# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Auto-loaded every Claude Code session. See `docs/INDEX.md` for links to all other files.
> Read BRAIN.md first — it shows what is built, what is in progress, and which files are involved.

---

## Dev commands

```bash
# Frontend — Vite dev server at http://localhost:5173
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npm run lint

# Backend — Express on port 4000
cd backend && node server.js           # one-shot
cd backend && npx nodemon server.js    # auto-reload on file change
```

---
## What this project is

AI interview platform. Managers schedule AI voice interviews and exams for team members. Candidates take them from a browser via magic link. Interviewers conduct live human video interviews.

**Status:** Core build is complete and functional for all 3 roles (Manager, Candidate, Interviewer). Now in hardening/audit-fix mode — see `docs/AUDIT-BACKLOG.md` for tracked issues.

---

## Tech stack

```
Frontend    React 19 (JSX only — no TypeScript), React Router v6, fetch via src/services/api.js, CSS + tokens.css
            (no axios — all backend calls go through a hand-rolled fetch client with JWT refresh/retry)
Backend     Node.js 20 + Express 5 (single service)
Database    Supabase (PostgreSQL) — current. SQL Server (SSMS) — future option.
            Two DB connection files exist — switch via DB_TYPE env var.
Files       Supabase Storage (bucket "files") — resumes and reports only (no audio stored)
Video       LiveKit — human interviews (livekit-server-sdk backend, @livekit/components-react frontend)
Auth        JWT access token (15 min) + HttpOnly cookie refresh token (7 days)
LLM         Groq Llama 3.3 70B → Gemini 2.0 Flash fallback, called via plain fetch() to REST endpoints
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

The real implementation is built and wired end-to-end: `backend/src/` has routes/services/repositories/middleware/db/jobs for all 3 roles, and `frontend/src/App.jsx` is the real role-based router (not the Vite placeholder). See `frontend/CLAUDE.md` and `backend/CLAUDE.md` for the actual current file layout and routes.

**Legacy/prototype files still present but unused** — `frontend/src/screens/`, `frontend/src/layouts/`, and several loose files directly under `frontend/src/pages/` (e.g. `v2-manager.jsx`, `v2-candidate.jsx`, `ai-room.jsx`, `hr.jsx`, `interviewer.jsx`, `candidate-flow.jsx`, `exam-runner.jsx`, `helpers.jsx`) are earlier-iteration/v2 prototype screens using inline styles and `window.V2` globals — not imported by `App.jsx`. Treat them as **reference only, do not extend, copy from, or import them**. The real pages live in `frontend/src/pages/{manager,candidate,interviewer,auth}/`.

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