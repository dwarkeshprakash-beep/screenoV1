# PRD — Screeno

Product Requirements Document, Phase 1.

---

## What is Screeno

An AI-powered interview platform. Managers use it to assess their team members before sending them to client interviews. HR uses it to screen external candidates. The platform runs AI voice interviews, coding exams, and facilitates human video interviews — all in one place.

---

## Phase 1 scope — what we are building

Three roles:
1. **Manager** — schedule interviews, view team, read reports
2. **Candidate** — take AI interview or exam via magic link (no login needed)
3. **Interviewer** — conduct live human video interviews, fill scorecards

---

## Why this exists

Managers currently send team members to client interviews without knowing how ready they are. The interview outcome is a surprise to everyone. Screeno solves this:

- Manager schedules an AI interview for a candidate
- Candidate takes the interview (voice or exam) from any browser
- AI analyzes the answers and generates a report
- Manager reads the report and knows if the candidate is ready
- Manager makes an informed decision

---

## User stories

**Manager**
- I can log in and see my team members with their assessment status
- I can schedule an AI voice interview or exam for one or multiple team members
- I can upload a JD and add focus areas for the AI to use when generating questions
- I can choose between Simple (10 questions pre-generated) and Adaptive (AI follows up) interview modes
- I can see a calendar of all scheduled interviews
- I can view a candidate's full profile: resume, past interviews, reports, notes
- I can see a report after the interview with: summary, strengths, improvement tips
- I can import candidates from CSV
- I receive an email when a report is ready

**Candidate**
- I receive an email with a magic link — no account or login needed
- I do a device check before my interview (camera, mic, network)
- I give consent before recording starts
- I take an AI voice interview: AI asks questions aloud, I answer, AI follows up
- I take a coding exam: MCQ, written answers
- After completing, I see improvement tips (no scores)
- I can use any modern browser on my desktop or laptop

**Interviewer**
- I see my scheduled interviews for today
- I can view the candidate's CV and past interview notes before the call
- During the call, I see a question bank panel, notes panel, and AI suggestions
- After the call, I fill a scorecard (AI pre-fills it, I review and submit)

---

## Interview types

**AI Voice Interview**
- AI reads questions aloud using browser TTS (speechSynthesis)
- Candidate presses Start Answer / Stop Answer
- Audio captured with MediaRecorder, sent to backend, transcribed with Whisper
- Transcript linked to question, audio discarded
- Two modes:
  - Simple: 10 questions generated from JD + resume at start
  - Adaptive: LLM generates next question based on previous answer

**Exam**
- MCQ questions
- Written answer questions
- Section-based, timed
- Auto-saves every question answered

**Human Video Interview**
- LiveKit video call in browser
- Interviewer side panel with questions, notes, AI suggestions
- AI-generated scorecard after interview

---

## Proctoring

For all interview types:
- Tab switch detection (logged, candidate warned)
- Fullscreen exit detection (logged)
- If no camera: degraded mode — tab monitoring still runs, flagged in report

Candidate sees on consent screen exactly what is monitored. No hidden tracking.

---

## Reports

What the manager sees:
- Overall assessment
- Strengths
- Improvement areas
- Summary

What the candidate sees:
- Improvement tips only (no scores)

---

## Non-goals (Phase 1)

- HR role (Phase 2)
- Super Admin role (Phase 2)
- Mobile interviews (desktop only — mobile shows a blocker)
- Code execution in exam (LLM grades code, doesn't run it)
- Dark mode
- AI video avatar
- ATS integrations
- SSO

---

## Success for Phase 1

Manager schedules an AI interview for a team member → candidate completes it → manager receives a report → manager feels confident about what to expect in the actual client interview.

That end-to-end flow working reliably is the definition of Phase 1 success.
