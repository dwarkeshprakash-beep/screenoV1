# Screeno — Backend & Integration Handoff

This prototype (`Screeno v2.html`) is a **front-end-only** clickable mock. All data lives in
`src/v2/v2-data.jsx` (`window.V2` + the in-memory `window.V2Store`) and resets on refresh.
This document lists every place that needs a real backend/3rd-party integration, with the
contract the UI already expects so wiring is mostly "swap the mock for a fetch".

---

## 1. Auth & roles
- 3 roles: `manager`, `interviewer`, `candidate` (no admin by design).
- Replace the demo `LoginScreen` with real SSO / email-OTP. On success return
  `{ token, role, user }` and hydrate `window.V2Store`.
- Gate every screen by role server-side too — the client role switch is for demo only.

## 2. AI question generation (replaces the old Question Bank — now removed)
Questions are **generated dynamically per interview from the JD + resume**. Nothing is stored in a bank,
and the **candidate never receives the full list** — only one question at a time.

- **Endpoint:** `POST /api/interviews/:id/questions:generate`
  - body: `{ jobId, resumeId, focusAreas?, stage }`
  - returns: `[{ id, phase, text, seconds }]` — see `V2_AI_QUESTIONS` shape in `v2-data.jsx`.
- The "AI is preparing your questions" screen (`AIPrepLoader`) is where this call belongs.
  Show it before **both** the exam and the AI voice interview.
- **Security:** serve questions to the candidate **one at a time** (`GET /interviews/:id/next-question`).
  Never send the array to the candidate client. The manager/interviewer only ever see what was
  *actually asked* (the transcript) — there is no "view all questions" screen anywhere.

## 3. AI voice interview (`AIScreenRoom`)
- **Speech-to-text** (streaming): pipe mic audio to a STT provider (Deepgram / Whisper / Google STT);
  append finalized segments to the transcript. The UI's `Start answer` / `Stop answer` controls map to
  start/stop of an answer segment. `Stop` → submit the segment for scoring + fetch next question.
- **Text-to-speech** for the AI question voice (ElevenLabs / Azure TTS / Google).
- **Per-question + total countdown** already exist in the UI; drive them from server-issued limits.
- **Recording:** capture mic (+ optional cam) to object storage; store the playback URL on the attempt.
- On finish: `POST /interviews/:id/submit` → triggers report generation.

## 4. Exam runner (`ExamRunner`)
- MCQs + one coding question. Replace `V2_EXAM` with `GET /exams/:id`.
- **Code execution:** the JS path runs in-browser for the demo. In production route `Run code`
  to a sandboxed executor (Judge0 / Piston / your own gVisor runner): `POST /run { lang, code, tests }`.
  Never execute candidate code on the main server unsandboxed.
- Persist answers + test results on submit: `POST /exams/:id/submit`.

## 5. Proctoring / integrity (`V2_INTEGRITY`, tab-switch overlay)
- Tab/blur detection: `visibilitychange` + `window.blur` → log events with timestamps.
- Face presence + multiple-face + look-away: client face-detection (MediaPipe/FaceMesh) sending
  periodic signals; snapshot frames every ~30s to storage.
- Single-screen / fullscreen checks via the Screen + Fullscreen APIs.
- Aggregate into the integrity score shown on the candidate's **Analysis** tab.

## 6. Human interview — Google Meet & Microsoft Teams
Used in the scheduler (`ScheduleModalV3`, human stage) and the candidate `CandidateLiveVideoJoin` screen.
- **Google Meet:** OAuth (Google Workspace) → Calendar API `events.insert` with
  `conferenceData.createRequest` to mint a Meet link. Store link on the interview.
- **Microsoft Teams:** Microsoft Graph `POST /me/onlineMeetings` (or `/users/{id}/onlineMeetings`).
- **Screeno Room:** built-in WebRTC (LiveKit / Daily / Twilio Video) if no external provider.
- The UI already lets the manager pick the provider and the candidate join; just substitute the
  hard-coded link strings with the real ones returned at scheduling time.
- The interviewer live room (`IVLiveRoom`) should embed/launch the same meeting.

## 7. Resume ↔ JD analyzer (`ResumeAnalyzerScreen`)
Currently a real client-side keyword matcher over pasted text (good enough to demo, modeled on
ATS tools like Jobscan: match-rate %, hard/soft skill gaps, missing keywords, searchability, verdict bands).
For production:
- **Resume parsing:** `POST /resumes:parse` (PDF/DOCX → text + structured sections) — Affinda / Sovren / textract.
- **JD parsing + skill extraction:** NLP/LLM to extract required vs nice-to-have skills (don't rely only on the
  static `V2_HARD_SKILLS`/`V2_SOFT_SKILLS` dictionaries).
- **Scoring:** keep the weighted match (hard skills weighted higher) but add semantic matching
  (embeddings) so synonyms count. Keep the verdict bands (<50 mismatch / 50–64 borderline / 65–84 good / 85+ strong).

## 8. Reports & scorecards
- AI report generation after each attempt (or after all, per the schedule setting): `POST /reports:generate`.
- Interviewer scorecard (`IVScorecard`) is AI-prefilled then human-edited → `PUT /scorecards/:id`.
- Manager **Analysis** tab (`ProfileAnalysis`) shows competency breakdown, JD match, integrity,
  strengths/gaps — all should come from the generated report.

## 9. CRUD endpoints (the in-memory `window.V2Store` maps 1:1)
| UI action | Store op | Backend |
|---|---|---|
| Add member (`AddCandidateModal`) | `team.unshift` | `POST /members` |
| Edit member/candidate (`EditMemberModal`) | mutate record | `PATCH /members/:id` / `PATCH /candidates/:id` |
| Remove (`EditMemberModal`) | filter out | `DELETE /members/:id` |
| Candidate self-edit (`CandidateProfileScreen`) | `candidate` | `PATCH /me` |
| Manager profile (`ManagerProfileScreen`) | `manager` | `PATCH /me` |
| Settings toggles | `settings` | `PATCH /me/settings` |
| Schedule interview (`ScheduleModalV3`) | — | `POST /interviews` (creates link + email) |
| CSV import (`CSVImportModal`) | — | `POST /candidates:bulk` |

## 10. Notifications
- Email (invites, reminders, reports): SendGrid / SES, driven by the settings toggles.
- In-app bell (`V2NotifPanel`): WebSocket / SSE feed of pipeline events.

---

### Where things live in the code
- Data + store: `src/v2/v2-data.jsx`
- Shell/nav/avatars/toggle: `src/v2/v2-shell.jsx`
- Manager screens (team, profile, analysis, compare, job candidates): `src/v2/v2-manager.jsx`
- Candidate flow (device → consent → prep loader → AI room / exam → completion, self-edit): `src/v2/v2-candidate.jsx`
- Interviewer (dashboard, live room, scorecard): `src/v2/v2-interviewer.jsx`
- Scheduler + CSV + add modals: `src/v2/v2-schedule.jsx`
- Router + resume analyzer + login: `src/v2/v2-app.jsx`
