# Folder Structure - Screeno

Actual high-level structure on `dev`. Detailed route and layer notes live in `frontend/CLAUDE.md` and `backend/CLAUDE.md`.

## Root

```text
screeno/
  frontend/                 React 19 + Vite app
  backend/                  Node.js + Express API
  docs/                     Product, schema, audit, and handoff docs
  assets/                   Static design/reference assets
  skills/                   Repo-specific coding and git guidelines
  BRAIN.md                  Current product/context summary
  CLAUDE.md                 Root engineering instructions
  tokens.css                Shared design tokens
```

## Frontend

```text
frontend/
  src/
    App.jsx                 Role-based router
    main.jsx                React entry
    services/api.js         Fetch client with auth refresh
    utils/helpers.js        Date, status, parsing helpers
    hooks/
      useInterview.js       Candidate AI interview state machine
      useProctoring.js      Tab/fullscreen integrity checks
    components/
      shared/               Button, Modal, Spinner, EmptyState, etc.
      layout/               AppLayout, Sidebar, TopBar, candidate layouts
      manager/              Manager modals and monthly/report helpers
      candidate/            Candidate-only editor components
    pages/
      auth/                 Login and password reset surface
      manager/              Dashboard, Team, Monthly, Mandates, Schedule, Reports, Profile
      candidate/            Dashboard tabs, interview launch, device check, consent, AI/exam, done
      admin/                Admin dashboard, mandates, interviews, broken-state repair
```

## Backend

```text
backend/
  server.js                 Express app, middleware, route mounts, workers
  setup-db.js               Applies migrations 001-018 to new databases
  migrations/               Numbered PostgreSQL migrations
  test/                     Node test runner and API regression
  src/
    routes/                 HTTP handlers only
    services/               Business logic and integrations
    repositories/           SQL query layer
    middleware/             Auth, role, upload, rate-limit
    workers/                Durable email outbox worker
    utils/                  Shared parse/fetch helpers
    db/                     Connection factory and schema reference
```

## Current Main Routes

```text
/login
/manager/dashboard
/manager/team
/manager/monthly
/manager/clients
/manager/schedule
/manager/reports
/manager/resume-analyzer
/manager/profile
/candidate/overview
/candidate/interviews
/candidate/monthly
/candidate/feedback
/candidate/mandates
/candidate/outcomes
/candidate/profile
/admin/dashboard
/admin/mandates
/admin/interviews
/admin/broken-states
/interview/:token
/interview/:token/device-check
/interview/:token/consent
/interview/:token/ai
/interview/:token/exam
/interview/:token/done
```
