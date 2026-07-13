# Screeno Testing Guide

Run this before a release or after major backend/frontend changes.

## Setup

```powershell
# Backend
cd backend
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
node server.js

# Frontend
cd ..\frontend
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
npm run dev
```

Expected local URLs:

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

Test users should come from the configured database or from test fixtures created by scripts. Do not commit real account credentials. Optional login shortcuts can be enabled only through frontend environment variables:

```dotenv
VITE_SHOW_DEMO_ACCOUNTS=true
VITE_DEMO_ACCOUNTS=[{"role":"manager","name":"Manager Test","sub":"Test account","email":"manager@example.test","password":"replace-locally"}]
```

For production test/demo deployments, `frontend/vercel.json` enables the demo-account UI with `VITE_SHOW_DEMO_ACCOUNTS=true`. Demo passwords still must come from deployment environment variables; do not commit real passwords.

## Automated Checks

```powershell
cd backend
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
node --check server.js
node --check src\routes\upload.routes.js
node --check src\routes\client-template.routes.js
node --check src\services\email.service.js
node --check test\api-regression.js

cd ..\frontend
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
node .\node_modules\eslint\bin\eslint.js .
npm run build

cd ..
git diff --check
```

## API Regression

The regression suite creates unique company/user/candidate records, runs ownership and workflow checks, then removes its fixtures.

```powershell
cd backend
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
$env:API_TEST_BASE_URL = 'http://localhost:4000'
node test\api-regression.js
```

## Manager Smoke Test

1. Sign in with a configured manager account.
2. Open `/manager/dashboard`; stats and activity should load from API data or show empty states.
3. Open `/manager/team`; internal and external tabs should load from the database.
4. Add/edit a member and verify the change persists after refresh.
5. Upload a resume and verify tags persist in the relevant DB-backed tag field.
6. Open `/manager/monthly`; subject library, monthly plan, and yearly calendar should be separate views.
7. Open `/manager/clients`; mandate cards should come from `client_templates`.
8. Create/edit a mandate and verify tags are stored, shown, and used for matching.
9. Open `/manager/schedule`; candidate search should use names, emails, roles, and stored tags.
10. Open `/manager/reports`; report lists should load from API data or show empty states.

## Candidate Smoke Test

1. Schedule an interview or exam for a candidate.
2. Launch the candidate link in a separate browser profile.
3. Complete device checks and consent.
4. For AI voice, answer each generated question and complete the interview.
5. For exams, answer questions and submit.
6. Verify completion queues report generation and the manager report view updates when ready.

## UI Checks

- No page should rely on mock candidate, job, or report data.
- No card grid should overflow horizontally at desktop or mobile widths.
- Empty states should be explicit rather than blank.
- Modals should fit within the viewport and keep action buttons visible.
- Buttons should show disabled/loading states where network work is pending.
