# Folder Structure — Screeno

Final confirmed structure. Existing folders: frontend/, backend/, .claude/, docs/, tokens.css, INTEGRATION.md

---

## Root layout

```
screeno/                              ← root of the project
├── frontend/                         ← React JSX app
│   ├── CLAUDE.md                     ← frontend-specific Claude context
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── shared/               ← CHECK HERE FIRST before building any component
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Avatar.jsx
│   │   │   │   ├── Table.jsx
│   │   │   │   ├── Spinner.jsx
│   │   │   │   ├── EmptyState.jsx
│   │   │   │   ├── ErrorMessage.jsx
│   │   │   │   └── FileUpload.jsx
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.jsx     ← sidebar + topbar (manager/interviewer)
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── TopBar.jsx
│   │   │   │   └── CandidateLayout.jsx ← minimal layout for interview screens
│   │   │   ├── interview/            ← shared interview components (all roles)
│   │   │   │   ├── AIVoiceRoom.jsx
│   │   │   │   ├── ExamRunner.jsx
│   │   │   │   ├── ProctoringMonitor.jsx
│   │   │   │   ├── DeviceCheck.jsx
│   │   │   │   ├── ConsentScreen.jsx
│   │   │   │   ├── AIWaveform.jsx
│   │   │   │   ├── TranscriptPanel.jsx
│   │   │   │   └── DesktopOnlyGate.jsx
│   │   │   ├── manager/              ← manager-only components
│   │   │   │   ├── TeamTable.jsx
│   │   │   │   ├── MemberCard.jsx
│   │   │   │   ├── ScheduleModal.jsx
│   │   │   │   ├── CSVImportModal.jsx
│   │   │   │   ├── CalendarGrid.jsx
│   │   │   │   └── ReportCard.jsx
│   │   │   ├── candidate/            ← candidate-only components
│   │   │   │   ├── InterviewLanding.jsx
│   │   │   │   └── FeedbackPanel.jsx
│   │   │   └── interviewer/          ← interviewer-only components
│   │   │       ├── ScorecardForm.jsx
│   │   │       ├── QuestionPanel.jsx
│   │   │       ├── NotesPanel.jsx
│   │   │       └── AISuggestionsPanel.jsx
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.jsx
│   │   │   ├── manager/
│   │   │   │   ├── DashboardPage.jsx
│   │   │   │   ├── TeamPage.jsx
│   │   │   │   ├── MemberProfilePage.jsx
│   │   │   │   ├── SchedulePage.jsx
│   │   │   │   └── ReportsPage.jsx
│   │   │   ├── candidate/
│   │   │   │   ├── InterviewLandingPage.jsx
│   │   │   │   ├── DeviceCheckPage.jsx
│   │   │   │   ├── ConsentPage.jsx
│   │   │   │   ├── AIInterviewPage.jsx
│   │   │   │   ├── ExamPage.jsx
│   │   │   │   └── DonePage.jsx
│   │   │   └── interviewer/
│   │   │       ├── InterviewerDashboard.jsx
│   │   │       ├── LiveRoomPage.jsx
│   │   │       └── ScorecardPage.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js            ← JWT, login/logout, user state
│   │   │   ├── useInterview.js       ← audio recording, transcription, phases
│   │   │   └── useProctoring.js      ← tab detection, fullscreen, face
│   │   ├── services/
│   │   │   └── api.js                ← ALL backend API calls live here
│   │   ├── utils/
│   │   │   └── helpers.js            ← formatDate, truncateText, etc.
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.jsx                   ← routes + auth protection
│   │   └── index.jsx                 ← entry point
│   ├── package.json
│   └── .env
│
├── backend/                          ← Node.js + Express API
│   ├── CLAUDE.md                     ← backend-specific Claude context
│   ├── src/
│   │   ├── routes/                   ← HTTP routes only, no SQL
│   │   │   ├── auth.routes.js
│   │   │   ├── interview.routes.js
│   │   │   ├── candidate.routes.js
│   │   │   ├── team.routes.js
│   │   │   ├── report.routes.js
│   │   │   └── schedule.routes.js
│   │   ├── repositories/             ← ALL SQL queries live here only
│   │   │   ├── base.repository.js    ← DB connection helper
│   │   │   ├── user.repository.js
│   │   │   ├── candidate.repository.js
│   │   │   ├── interview.repository.js
│   │   │   ├── answer.repository.js
│   │   │   ├── report.repository.js
│   │   │   └── file.repository.js
│   │   ├── services/                 ← business logic only
│   │   │   ├── auth.service.js
│   │   │   ├── interview.service.js
│   │   │   ├── report.service.js
│   │   │   ├── transcription.service.js
│   │   │   ├── llm.service.js
│   │   │   ├── email.service.js
│   │   │   └── storage.service.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js    ← validates JWT on protected routes
│   │   │   ├── role.middleware.js    ← checks user role
│   │   │   └── upload.middleware.js  ← multer for file uploads
│   │   ├── db/
│   │   │   └── connection.js         ← mssql connection pool + query helper
│   │   ├── jobs/
│   │   │   ├── cleanup.job.js        ← delete old Cloudinary files
│   │   │   └── report.job.js         ← generate pending reports
│   │   └── app.js                    ← Express setup + middleware
│   ├── migrations/
│   │   └── 001_create_tables.sql     ← run this in SSMS to set up DB
│   ├── server.js                     ← entry point (starts Express)
│   ├── package.json
│   └── .env
│
├── .claude/                          ← Claude Code settings (existing)
│   └── settings.json
│
├── docs/                             ← All project documentation
│   ├── PRD.md                        ← product requirements
│   ├── frontend-prompt.md            ← guide for building frontend
│   ├── backend-prompt.md             ← guide for building backend
│   ├── database-schema.md            ← SQL schema + sample data
│   ├── folder-structure.md           ← THIS FILE
│   ├── tech-stack.md                 ← why each technology was chosen
│   └── discussion.md                 ← resolved decisions log
│
├── skills/                           ← Claude Code skill files
│   ├── coding-standards.md
│   ├── token-saving.md
│   ├── git-standards.md
│   ├── naming-conventions.md
│   └── vibe-coding.md
│
├── assets/
│   ├── logo/                         ← your built logos go here
│   └── prompts/
│       └── asset-generation-prompts.md
│
├── CLAUDE.md                         ← ROOT: Claude Code reads this first
├── .claudeignore                     ← files Claude Code should skip
├── tokens.css                        ← design tokens (existing, shared)
└── INTEGRATION.md                    ← existing integration notes
```

---

## Rules for adding new files

**New component:**
1. Ask: can this be used by more than one role?
   - YES → `frontend/src/components/shared/`
   - NO → role-specific folder (`manager/`, `candidate/`, `interviewer/`)
   - INTERVIEW-related → `frontend/src/components/interview/`

**New API route:**
1. Add route definition to relevant `backend/src/routes/*.routes.js`
2. Add business logic to `backend/src/services/*.service.js`
3. Add SQL query to `backend/src/repositories/*.repository.js`
4. Never mix these three — keep them strictly separated

**New database table:**
1. Write the `CREATE TABLE` SQL in `backend/migrations/`
2. Run it in SSMS first, verify it works
3. Then write the repository file

**New documentation:**
- Project-wide docs → `docs/`
- Claude Code instructions → skills/ or CLAUDE.md files
