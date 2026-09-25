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
    App.jsx                 Router: /workspace (module-gated) and /admin shells
    main.jsx                React entry
    services/api.js         Fetch client with auth refresh
    utils/helpers.js        Date, status, parsing helpers
    context/                AccessContext (loads the user's modules/permissions)
    hooks/
      useAccess.js          hasModule() and the loaded access context
      useInterview.js       Candidate AI interview state machine
      useProctoring.js      Tab/fullscreen integrity checks
    components/
      shared/               Button, Modal, DataTable, Pagination, Spinner, EmptyState, etc.
      layout/               AppLayout, Sidebar, TopBar, RequireModule, CandidateLayout
      manager/              Manager modals and panels
        client-mandates/    Mandate detail, list, and all mandate modals
        monthly-assessments/  Monthly subject wizard and detail modal
      admin/                Admin tables, form modals, repair-tool pieces
      candidate/            Candidate-only editor and mandate components
    pages/
      auth/                 Login and password reset surface
      manager/              Dashboard, Team, Monthly, Mandates, Schedule, Reports, Resume Analyzer
      workspace/            A user's own Interviews, Feedback, Outcomes, Profile
      candidate/            Magic-link interview flow: landing, device check, consent, AI/exam, done
      admin/                Dashboard, mandates, interviews, broken states, and RBAC admin
```

## Backend

```text
backend/
  server.js                 Express app, middleware, route mounts, workers
  migrations/               Numbered PostgreSQL migrations, plus migrate.js — applies
                              whatever's pending, on a fresh DB or an existing one
  test/                     Node test runner and API regression
  src/
    routes/                 HTTP handlers only (never import repositories or db)
    services/               Business logic and integrations
    repositories/           SQL query layer, including multi-statement transactions
    middleware/             Auth, access (RBAC), upload, rate-limit
    workers/                Durable email outbox worker
    utils/                  Shared parse/fetch/pagination helpers
    config/                 App and auth settings
    db/                     Connection factory
```

## Current Main Routes

```text
/login
/workspace/dashboard
/workspace/team
/workspace/team/:id
/workspace/monthly
/workspace/clients
/workspace/clients/:mandateId
/workspace/schedule
/workspace/reports
/workspace/interviews
/workspace/feedback
/workspace/outcomes
/workspace/resume-analyzer
/workspace/profile
/admin/dashboard
/admin/mandates
/admin/interviews
/admin/broken-states
/admin/organizations
/admin/roles
/admin/users
/admin/modules
/admin/acls
/admin/permissions
/interview/:token
/interview/:token/device-check
/interview/:token/consent
/interview/:token/ai
/interview/:token/exam
/interview/:token/done
```
