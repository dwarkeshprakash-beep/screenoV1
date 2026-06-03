Read BRAIN.md. Build every unchecked item continuously without stopping.

## Rules
- Follow docs/rules.md for all code
- Follow .claude/skills/ui-replication.md for every screen
- Follow .claude/skills/api-integration.md when wiring frontend to backend
- Follow .claude/skills/interview-flow.md for interview features
- Check frontend/src/components/shared/ before making any new component
- Never touch frontend/src/screens/ or pages/v2-* files (prototype only)

## How to build
Work through BRAIN.md top to bottom.
For each unchecked item:
1. Build backend route + service + repository
2. Build frontend page or component
3. Wire them together using frontend/src/services/api.js
4. Mark [x] in BRAIN.md
5. Move immediately to the next item without stopping

## Only stop if:
- You hit an error you cannot resolve
- A decision is needed that is not in any doc
- A feature depends on something not built yet

## After everything is built:
Run npm run build in frontend to confirm no errors, then report what was completed.