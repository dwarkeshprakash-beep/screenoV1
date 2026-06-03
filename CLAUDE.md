# CLAUDE.md — Screeno

> Auto-loaded every Claude Code session. Under 200 lines. See `docs/INDEX.md` for links to all other files.
> Read BRAIN.md first. It shows what is built, what is in progress, and which files are involved.

---
## What this project is

AI interview platform. Managers schedule AI voice interviews and exams for team members. Candidates take them from a browser via magic link. Interviewers conduct live human video interviews.

**Building now:** Manager, Candidate, Interviewer — 3 roles only.

---

## Tech stack

```
Frontend    React 18 (JSX only — no TypeScript), React Router v6, Axios, CSS + tokens.css
Backend     Node.js 20 + Express (single service)
Database    Supabase (PostgreSQL) — current. SQL Server (SSMS) — future option.
            Two DB connection files exist — switch via DB_TYPE env var.
Files       Cloudinary — resumes and reports only (no audio stored)
Video       LiveKit — human interviews
Auth        JWT access token (15 min) + HttpOnly cookie refresh token (7 days)
LLM         Groq Llama 3.3 70B → Gemini 2.0 Flash fallback (both free)
STT         @huggingface/transformers whisper-small (local) OR Groq Whisper API
TTS         browser.speechSynthesis — cross-browser, free, no API key
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