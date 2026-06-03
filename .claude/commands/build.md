Scaffold the project. Do NOT build any features yet — structure only.

Step 1 — Backend scaffold (backend/src/ does not exist yet):
Create these folders and empty placeholder files:
- backend/src/routes/        (auth.routes.js, interview.routes.js, candidate.routes.js, team.routes.js, report.routes.js, schedule.routes.js)
- backend/src/services/      (auth.service.js, interview.service.js, report.service.js, transcription.service.js, llm.service.js, email.service.js, storage.service.js)
- backend/src/repositories/  (user.repository.js, candidate.repository.js, interview.repository.js, answer.repository.js, attempt.repository.js, report.repository.js, file.repository.js)
- backend/src/middleware/     (auth.js, role.js, upload.js)
- backend/src/db/            (connection.js, supabase.connection.js, sqlserver.connection.js)
- backend/src/jobs/          (cleanup.job.js, report.job.js)

Create backend/server.js with:
- Express app setup
- All middleware (cors, express.json, cookie-parser, dotenv)
- All routes imported and mounted
- /health endpoint returning { status: "ok" }
- Server listening on process.env.PORT or 4000
- Full comments explaining every section

Create the three DB connection files using the exact code in .claude/skills/db-access.md.

Step 2 — Frontend scaffold (App.jsx is still Vite default):
Create these folders:
- frontend/src/components/shared/
- frontend/src/components/layout/
- frontend/src/components/interview/
- frontend/src/components/manager/
- frontend/src/components/candidate/
- frontend/src/components/interviewer/
- frontend/src/pages/auth/
- frontend/src/pages/manager/
- frontend/src/pages/candidate/
- frontend/src/pages/interviewer/
- frontend/src/hooks/
- frontend/src/services/
- frontend/src/utils/
- frontend/src/styles/

Create frontend/src/services/api.js — the central fetch wrapper with JWT header and 401 redirect. Use the pattern from docs/rules.md.

Create frontend/src/App.jsx — React Router v6 setup with all routes and a ProtectedRoute component. Placeholder pages only, no real content yet.

Step 3 — After scaffolding:
Update BRAIN.md — mark scaffold as [x] done.
Tell me what was built and confirm it is ready for the first feature.