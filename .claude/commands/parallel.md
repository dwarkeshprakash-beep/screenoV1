Build backend and frontend in parallel using sub-agents.

## What this does
Spawns two sub-agents simultaneously:
- Agent 1 builds the backend (routes, services, repositories)
- Agent 2 builds the frontend (pages, components, api wiring)

Both run at the same time. Faster than sequential building.

## Instructions for sub-agents

### Agent 1 — Backend
Read backend/CLAUDE.md and docs/rules.md.
Build all unchecked backend items from BRAIN.md:
- Routes in backend/src/routes/
- Services in backend/src/services/
- Repositories in backend/src/repositories/
Each file must have full JSDoc comments and follow the MVC pattern.
Return a summary of every file created.

### Agent 2 — Frontend  
Read frontend/CLAUDE.md and docs/rules.md.
Read .claude/skills/ui-replication.md for exact screen designs.
Build all unchecked frontend items from BRAIN.md:
- Pages in frontend/src/pages/
- Components in frontend/src/components/
- Wire to api.js using .claude/skills/api-integration.md
Each component must have loading, error, and empty states.
Return a summary of every file created.

## After both agents finish
- Wire frontend api.js calls to the real backend endpoints
- Update BRAIN.md marking all completed items [x]
- Run npm run build in frontend to confirm no errors
EOF