# Screeno

AI interview platform. Managers schedule AI voice interviews, exams, Google Meet-backed human interviews, client mandate work, and monthly assessments. Candidates take work from a browser dashboard or a magic link.

**Status:** Core build is complete for the active V2 surface: Manager, Candidate, and Admin repair pages. Interviewer/LiveKit runtime pages are no longer mounted. Current gaps are tracked in `docs/open-issues.md`.

---

## Tech stack

```
Frontend    React 19 (JSX only - no TypeScript), React Router v6, fetch via src/services/api.js, CSS + tokens.css
Backend     Node.js 20 + Express 5 (single service)
Database    PostgreSQL (currently hosted on Supabase) - plain `pg`, portable to any Postgres host
Files       Supabase Storage locally, S3 in production (STORAGE_PROVIDER env var) - resumes and reports only (no audio stored)
Video       Human interviews use manager-provided or Google Meet links
Auth        JWT access token (15 min) + HttpOnly cookie refresh token (7 days)
LLM         Groq gpt-oss-120b -> Gemini 3.6 Flash fallback, called via plain fetch() to REST endpoints
STT         Groq Whisper API (whisper-large-v3)
TTS         browser.speechSynthesis - cross-browser, free, no API key
Email       nodemailer over SMTP (Brevo)
```

---

## Project structure

```
screenoV1/
├── frontend/           React app (Vite)
├── backend/            Express API
├── docs/               Reference docs - see docs/INDEX.md
├── skills/              Guidelines
├── .claude/skills/      Action skills for Claude Code
├── assets/
├── CLAUDE.md            Instructions for Claude Code (tech stack, rules)
├── BRAIN.md              What the app does, roles, critical flows
└── tokens.css            Design tokens shared across the frontend
```

- Backend layout, all routes, and full DB connection code: `backend/CLAUDE.md`
- Frontend layout, routes, and component rules: `frontend/CLAUDE.md`
- Full DB access/connection walkthrough: `.claude/skills/db-access.md`
- Full file tree: `docs/folder-structure.md`

---

## Prerequisites

- Node.js 20+
- npm
- A PostgreSQL database (the project currently uses a Supabase-hosted Postgres instance)
- A Supabase project with a public **"files"** storage bucket (for resumes/reports)
- API keys: Groq, Gemini, SMTP credentials (see `.env` setup below)

---

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/dwarkeshprakash-beep/screenoV1
cd screenoV1

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure the backend `.env`

Copy `backend/.env.example` to `backend/.env` and fill in the values:

```bash
cd backend
cp .env.example .env
```

See `.env.example` for the full list of variables and what each one is for.

Full DB connection details (host, port, pooling) are in `.claude/skills/db-access.md`.

### 3. Configure the frontend `.env`

Copy `frontend/.env.example` to `frontend/.env` and fill in the values:

```bash
cd frontend
cp .env.example .env
```

### 4. Run database migrations

From `backend/`:

```bash
npm run migrate
```

This applies whatever numbered `.sql` file in `backend/migrations/` hasn't been applied yet, tracked in a `schema_migrations` table. It works against a brand-new database or the existing live database.

### 5. Seed an admin user (first run only)

```bash
cd backend && npm run seed:admin
```

---

## Running the project

Run backend and frontend in two separate terminals.

**Backend** (Express on port 4000):

```bash
cd backend
npm start        # one-shot
npm run dev      # auto-reload on file change (nodemon)
```

**Frontend** (Vite dev server on port 5173):

```bash
cd frontend
npm run dev
```

Once both are running, open [http://localhost:5173](http://localhost:5173).

---

## Other useful commands

```bash
# Frontend
cd frontend && npm run build             # production build
cd frontend && npm run lint              # ESLint
cd frontend && npm run check:deployment  # validate deployment config

# Backend
cd backend && npm test                   # unit tests (node:test)
cd backend && npm run test:api           # API regression suite
cd backend && npm run check              # syntax check server.js
```

---

## Non-negotiable rules (summary)

See `CLAUDE.md` for the full list. Highlights:

- No foreign key constraints in the DB - primary keys only, validation in backend code
- SQL only in `backend/src/repositories/` - never in routes
- Backend layers never mix: routes (HTTP only) -> services (business logic) -> repositories (SQL)
- Frontend is JSX only - no TypeScript
- All frontend API calls go through `frontend/src/services/api.js` - no direct `fetch`/`axios` in components
- No hardcoded hex colors in the frontend - use tokens from `tokens.css`
- Audio is never stored - transcribed on the backend and discarded immediately

---

## Documentation

See `docs/INDEX.md` for the full documentation index, including the database schema, open issues, and folder structure.
