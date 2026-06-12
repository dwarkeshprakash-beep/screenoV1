# Evolved Agent Registry
Auto-updated by /senior when new technologies are detected in package.json.
DO NOT edit manually. This file grows as the project grows.

Last updated: 2026-06-12
Baseline technologies: React 19, Express 5, pg (Supabase/PostgreSQL), LiveKit,
  Groq REST, Gemini REST, Piston REST, Supabase Storage (@supabase/supabase-js),
  nodemailer, @uiw/react-codemirror, jsonwebtoken, bcryptjs, multer, pdfkit, pdf-parse, mammoth

---

## Senior LiveKit/WebRTC Expert
Added: 2026-06-12
Trigger files: HumanInterviewPage.jsx, LiveRoomPage.jsx, interviewer.routes.js, *livekit*
Analysis focus:
- Room lifecycle: is cleanup called on disconnect AND unmount?
- Token expiry: are room tokens short-lived (minutes, not hours)?
- Rejoin flow: does onDisconnected show rejoin UI without starting a brand-new session?
- Track handling: are video/audio tracks subscribed/unsubscribed correctly?
- Security: are room tokens ALWAYS generated server-side? Never in the frontend?
- Room naming: collision-resistant? (should use interview IDs, not user names)
- Error recovery: does the UI recover gracefully from connection drops mid-interview?

## Junior LiveKit Reviewer
Added: 2026-06-12
Trigger files: HumanInterviewPage.jsx, LiveRoomPage.jsx
Quick checks:
- onDisconnected handler present and shows rejoin option?
- Room token fetched from backend (not generated client-side)?
- Cleanup on component unmount (disconnect called in useEffect return)?

---

## Senior LLM Integration Expert
Added: 2026-06-12
Trigger files: llm.service.js, transcription.service.js, judge.service.js, exam.routes.js
Analysis focus:
- Prompt injection: is user-supplied text (transcripts, JD text, resumes) sanitized before LLM insertion?
- Token limits: are prompts bounded? What happens with a very long interview transcript?
- Fallback completeness: does EVERY LLM function have Groq → Gemini fallback?
- JSON parsing: is every JSON.parse() on LLM output in a try/catch?
- Hallucination defense: are LLM-generated values validated before storage? (e.g., coding question solutions validated via Piston — verify this pattern is consistent)
- Timeout: do all Groq/Gemini fetch calls have a request timeout?
- Cost: how many LLM calls per complete interview? Any unbounded retries?

## Junior LLM Reviewer
Added: 2026-06-12
Trigger files: llm.service.js
Quick checks:
- Groq → Gemini fallback in every exported function?
- JSON.parse from LLM output wrapped in try/catch?
- No API keys hardcoded anywhere?

---

## Senior Supabase/PostgreSQL Expert
Added: 2026-06-12
Trigger files: *.repository.js, migrations/*.sql, supabase.connection.js, db/*
Analysis focus:
- @param style: all queries use @param (never string interpolation or $1/$2 directly)?
- No FK constraints: schema must have no foreign key constraints — relational logic in backend only
- NULL safety: COALESCE for nullable columns in aggregations
- Indexes: are WHERE-clause columns indexed on high-traffic tables (users.email, interviews.manager_id, attempts.interview_id)?
- Pool config: is pg pool size set appropriately for expected concurrency?
- Storage paths: are file paths collision-resistant? Is overwrite:true used where intentional?
- Migration order: do migrations run sequentially without dependencies on unrun future migrations?

## Junior Supabase Reviewer
Added: 2026-06-12
Trigger files: *.repository.js
Quick checks:
- @param style used (not string concatenation or template literals)?
- Result accessed as result.rows[0] or result.rows (not result directly)?
- No new FK constraints added?

---

## Senior Auth/JWT Expert
Added: 2026-06-12
Trigger files: auth.service.js, auth.middleware.js, magicLink.middleware.js, auth.routes.js
Analysis focus:
- JWT claims: do claims always include company_id for tenant isolation?
- Refresh token: is hash stored in DB (not raw token)?
- Magic link: is token single-use and time-bounded?
- Middleware separation: candidate routes → magicLink.middleware ONLY, never auth.middleware
- bcrypt rounds: 10+ always? (never lower for "performance")
- Token leakage: are tokens or password hashes ever in logs or error responses?
- Cookie security: HttpOnly + Secure + SameSite=Strict on the refresh cookie?

## Junior Auth Reviewer
Added: 2026-06-12
Trigger files: auth.*, *middleware*
Quick checks:
- All protected routes have the right middleware?
- Candidate routes use magicLink (not JWT auth)?
- No tokens exposed in response bodies that should be cookie-only?

---

## Senior Piston/Code Judge Expert
Added: 2026-06-12
Trigger files: judge.service.js, exam.routes.js, ExamPage.jsx
Analysis focus:
- No-SLA resilience: if Piston returns 5xx/timeout, is result stored as "not_evaluated" (not a crash)?
- Fetch timeout: is there a hard timeout on Piston calls? (free API, can hang)
- Language version map: is LANGUAGE_VERSIONS used consistently? (never raw string "javascript")
- Injection safety: is submitted code sent directly to Piston without being used in SQL or HTML anywhere?
- Reference solution validation: do all new coding questions have their reference solution executed through judge before storage?
- Error messages: if judge fails, does the candidate get a clear "could not evaluate" message (not a 500)?

## Junior Piston Reviewer
Added: 2026-06-12
Trigger files: judge.service.js, exam.routes.js
Quick checks:
- 5xx and timeout handled (not_evaluated, no crash)?
- Fetch has explicit timeout?
- LANGUAGE_VERSIONS map used (not hardcoded strings)?

---

## Senior PDF/Document Expert
Added: 2026-06-12
Trigger files: pdf.service.js, storage.service.js, upload.routes.js, *resume*
Analysis focus:
- Memory safety: are buffers bounded? What's the max upload size enforced by multer?
- File type validation: is MIME type checked before processing (not just file extension)?
- PDF parsing errors: if pdf-parse or mammoth fails on a malformed file, is it caught gracefully?
- Storage paths: are resume paths collision-resistant (using stable candidate ID)?
- Overwrite behavior: does re-upload correctly overwrite (not duplicate)?
- Text extraction timeout: can a huge PDF cause the request to hang?

## Junior PDF Reviewer
Added: 2026-06-12
Trigger files: upload.routes.js, *resume*
Quick checks:
- Multer file size limit set?
- File type checked before processing?
- PDF parse errors caught (try/catch around pdfService calls)?
