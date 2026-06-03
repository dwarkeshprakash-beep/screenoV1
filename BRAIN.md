# Screeno — Project Brain
Last updated: [date]

## What is built (update this as features are completed)
- [x] All MD docs, CLAUDE.md, skills files
- [x] Supabase DB schema ready (run screeno_supabase.sql)
- [x] 141 employees CSV ready for seeding
- [ ] Backend Express scaffold
- [ ] Frontend React scaffold  
- [ ] Auth (login + magic link)
- [ ] Everything else

### Infrastructure
- [x] Supabase DB — schema live, 11 tables, 141 employees seeded
- [x] All MD files / CLAUDE.md / skills files set up
- [ ] Express backend scaffold
- [ ] React frontend scaffold

### Auth
- [ ] Login (email + password → JWT)
- [ ] Magic link (candidate interview access)
- [ ] JWT refresh token

### Manager
- [ ] Team page (list, filter, bulk select)
- [ ] Member profile (5 tabs)
- [ ] Schedule modal (4 steps)
- [ ] Calendar view
- [ ] Reports page

### Candidate
- [ ] Device check
- [ ] Consent screen
- [ ] AI interview (simple mode)
- [ ] AI interview (adaptive mode)
- [ ] Exam runner
- [ ] Completion + tips

### Interviewer
- [ ] Dashboard
- [ ] Live room (LiveKit)
- [ ] Scorecard form

## Active feature (what is being built RIGHT NOW)
Feature: [name]
Files involved: [list the files]
Status: [in progress / blocked / done]
Blocked by: [if applicable]

## Key decisions made
- DB: Supabase (PostgreSQL), switch to SSMS later via DB_TYPE env var
- Audio: never stored, transcribe on backend, discard
- STT: local Whisper.js (internal) or Groq API (external) — manager picks at scheduling
- TTS: browser.speechSynthesis — cross-browser, free
- No FK constraints — validated in backend code

## File map (update as files are created)
frontend/src/components/shared/     → Button, Card, Badge, Avatar, Modal, Input
frontend/src/components/interview/  → AIVoiceRoom, ExamRunner, ProctoringMonitor
frontend/src/components/manager/    → TeamTable, ScheduleModal, CalendarGrid
frontend/src/pages/manager/         → DashboardPage, TeamPage, MemberProfilePage
frontend/src/pages/candidate/       → AIInterviewPage, ExamPage, DonePage
backend/src/routes/                 → auth, interview, candidate, team, report
backend/src/services/               → auth, interview, llm, transcription, report
backend/src/repositories/           → user, candidate, interview, answer, report
backend/src/db/                     → connection.js (factory), supabase.connection.js


## Handoff prompts (latest at top)

### 2026-06-01 — Schedule modal done
[paste the generated prompt here]

### 2026-05-30 — Team page done
[paste the generated prompt here]

## Commands

End of session — paste this to get the next handoff prompt:
> Generate a handoff prompt for my next chat. Under 200 words. 
> Cover what was built, files changed, and what to build next. 
> Only include what the next session needs.


## Active feature
Feature: Project scaffold — backend Express + frontend Vite setup
Files involved: backend/package.json, frontend/package.json, backend/src/, frontend/src/
Status: About to start