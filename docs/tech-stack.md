# Tech Stack — Screeno

What's actually running and why. Updated to reflect current implementation.

---

## Frontend

| Technology | Why |
|---|---|
| **React 19 + JSX** | Widely used, beginner-readable. JSX not TypeScript — lower friction, easier onboarding |
| **React Router v6** | Standard routing, nested layouts, built-in auth guard pattern |
| **fetch() only** | No Axios — built-in, no dependency, api.js wraps it with JWT + refresh logic |
| **CSS Variables (tokens.css)** | Design tokens defined once, referenced everywhere — no UI library needed |
| **speechSynthesis** | Browser built-in TTS — free, cross-browser, zero latency, no API key |
| **MediaRecorder** | Browser built-in audio capture — cross-browser, works on all major browsers |
| **@uiw/react-codemirror** | Syntax-highlighting code editor for LeetCode questions in ExamPage (only sanctioned exception to build-from-scratch rule) |
| **lucide-react** | Tree-shakable icon library, already installed |

Rejected: TypeScript (friction), Tailwind (tokens.css already exists), Redux (overkill), Axios (fetch built-in)

---

## Backend

| Technology | Why |
|---|---|
| **Node.js 20 + Express 5** | Same language as frontend, simple routing, huge ecosystem |
| **pg** | PostgreSQL driver for Supabase — official, minimal, no ORM overhead |
| **jsonwebtoken + bcryptjs** | Standard, pure-JS (no native bindings), widely used |
| **multer** | Standard file upload parsing in Express (memory storage — no disk writes) |
| **nodemailer** | Transactional email over Brevo SMTP — simple, no vendor lock-in |
| **@supabase/supabase-js** | File storage only (resumes/reports to bucket "files") |
| **pdfkit + pdf-parse + mammoth** | PDF generation (reports), PDF/docx parsing (resume analysis) |

All LLM, STT, and Piston calls use plain `fetch()` — no SDK packages for Groq, Gemini, or Cloudinary.

Rejected: Axios (fetch built-in), node-cron (setInterval polling loop instead), @huggingface/transformers (Groq Whisper API used instead)

---

## Database

| Technology | Why |
|---|---|
| **Supabase (PostgreSQL)** | Hosted Postgres, free tier, Supabase Storage for files, same project |
| **Repository pattern** | All SQL in one layer — easy to swap DB host, easy to audit queries |
| **@param style SQL** | Readable named params, translated to `$1, $2` by the connection layer |
| **No foreign keys** | Simpler migrations, no cascade failures, validation in backend code |

---

## AI / Voice

| Technology | Why |
|---|---|
| **Groq gpt-oss-120b** | Fast inference (~500ms), free tier, best free model for technical reasoning |
| **Gemini 3.6 Flash** | LLM fallback — Groq failures auto-fallback here, free tier |
| **Groq Whisper large-v3** | STT, free tier, high accuracy for technical English |
| **browser.speechSynthesis** | TTS — built in, free, cross-browser, zero server cost |
| **MediaRecorder API** | Audio capture — built in, cross-browser |
| **Piston API (emkc.org)** | Code execution for exam coding questions — free, no API key, no SLA |

Audio strategy: `MediaRecorder` → backend → Groq Whisper → text saved → audio discarded. Never stored.

---

## Infrastructure

| Technology | Why |
|---|---|
| **Supabase Storage** | Resumes + PDF reports, same project as DB, simple SDK |
| **Google Meet links** | Human interviews use manager-created Google Meet links when Calendar credentials are configured |
| **Brevo SMTP** | Transactional email, free tier, nodemailer compatible |

---

## Cost (Phase 1 — single company internal)

| Item | Cost |
|---|---|
| Groq API (LLM + Whisper) | Free tier |
| Gemini API | Free tier |
| Piston (code judge) | Free, no key |
| Browser APIs (TTS, MediaRecorder) | Free |
| Supabase (DB + Storage) | Free tier |
| Google Meet | Included with existing Google Workspace setup |
| Brevo SMTP | Free tier |
| **Total** | **$0** at current scale |
