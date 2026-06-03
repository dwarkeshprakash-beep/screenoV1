# Tech Stack — Screeno

Why each technology was chosen and what was considered.

---

## Frontend

| Technology | Why chosen |
|---|---|
| **React 18 + JSX** | Most widely used, huge community, easy to find help. JSX (not TypeScript) for beginner-friendly readability. |
| **React Router v6** | Standard routing, built-in protected routes, clean nested layout support |
| **Axios** | Cleaner API calls than raw fetch, automatic JSON parsing, easy interceptors for auth |
| **CSS Variables (tokens.css)** | Design tokens already defined, consistent theming, no extra library needed |
| **speechSynthesis (browser built-in)** | Free, cross-browser, no API key, no server call |
| **MediaRecorder (browser built-in)** | Cross-browser audio recording, works on Chrome/Firefox/Safari/Edge |
| **LiveKit** | Best-in-class WebRTC SDK, free tier, reliable for human video interviews |

Rejected: TypeScript (too complex for beginner), Tailwind (setup overhead, tokens.css already exists), Redux (overkill for current scope)

---

## Backend

| Technology | Why chosen |
|---|---|
| **Node.js 20 + Express** | Same language as frontend (JS throughout), massive ecosystem, simple routing |
| **mssql** | Official Microsoft SQL Server driver for Node.js, well-maintained, supports connection pooling |
| **jsonwebtoken** | Standard JWT library, widely used, simple API |
| **bcryptjs** | Password hashing, pure JS (no C++ native binding issues), reliable |
| **multer** | Standard file upload handling for Express |
| **node-cron** | Lightweight cron jobs for cleanup and report generation |
| **Groq SDK** | Fast LLM inference, generous free tier, simple API |
| **@huggingface/transformers** | Run Whisper locally in Node.js, completely free, no API dependency |
| **@google/generative-ai** | Gemini as LLM fallback, free tier, reliable |
| **cloudinary** | Official Cloudinary SDK, reliable, 25GB free tier |

Rejected: .NET (adds complexity, Node.js more natural with the JS frontend), Fastify (slightly more complex for beginners than Express), Redis (not needed for single company), Socket.io (not needed since no real-time state sync between users)

---

## Database

| Technology | Why chosen |
|---|---|
| **SQL Server (SSMS)** | Familiar tooling, stored procedures, views, SQL Server Agent for jobs, enterprise-appropriate for company internal data |
| **DB-first approach** | Design tables in SSMS first — see structure before writing code |
| **Repository pattern** | Keeps SQL in one place, makes future Supabase/PostgreSQL support easy to add |

Future: Supabase (PostgreSQL) can be added as an alternative connection — same repository interface, different SQL dialect files.

---

## AI / Voice

| Technology | Why chosen |
|---|---|
| **Groq Llama 3.3 70B** | Free tier, fast inference (~500ms), best free model for technical interview reasoning |
| **Google Gemini 2.0 Flash** | LLM fallback, free tier, reliable, handles code/technical questions well |
| **Groq Whisper Large v3** | Free tier STT, excellent accuracy for technical English, accepts all common audio formats |
| **@huggingface/transformers (Whisper)** | Self-hosted STT option, completely free, runs in Node.js via WASM, MIT license |
| **browser.speechSynthesis** | TTS for AI voice, built into every modern browser, cross-browser, zero cost |
| **MediaRecorder API** | Audio capture, built into every modern browser, cross-browser |

---

## Infrastructure / Services

| Technology | Why chosen |
|---|---|
| **Cloudinary** | 25GB free storage, auto-transforms PDFs, reliable CDN, good SDK |
| **LiveKit** | Open source WebRTC, 10K free minutes/month, excellent SDK, self-hostable |
| **Resend** | Clean email API, 3K free emails/month, better DX than SendGrid |

---

## Interview audio strategy — Two modes

Manager chooses when scheduling:

| Mode | When to use | How it works |
|---|---|---|
| **Local (Whisper.js)** | Internal team assessments | Browser records with MediaRecorder → audio sent to backend → `@huggingface/transformers` transcribes on server → audio discarded |
| **API (Groq Whisper)** | External candidate screening | Browser records with MediaRecorder → audio sent to backend → Groq Whisper API transcribes → audio discarded |

In both modes: audio is never stored permanently, transcription happens on backend, only text is saved.

---

## Cost (Phase 1 — single company internal use)

| Item | Cost |
|---|---|
| Groq API | Free (generous rate limits) |
| Gemini API | Free |
| @huggingface/transformers | Free (self-hosted) |
| browser APIs (speechSynthesis, MediaRecorder) | Free |
| SQL Server | Paid if using Azure SQL ($5-15/mo), Free with SSMS on own machine |
| Cloudinary | Free (25GB) |
| LiveKit | Free (10K min/month) |
| **Total monthly** | **$0 - $15** depending on where DB is hosted |
