# Backend Prompt — Screeno (Node.js + Express)

> Use this when building backend code. Reference backend/CLAUDE.md for folder structure.

---

## Core rules

- Express routes only handle HTTP — no SQL, no business logic
- All SQL queries live in `repositories/` — nowhere else
- All business logic lives in `services/`
- Never store audio files permanently — transcribe and discard
- Always validate JWT before any protected route
- Return consistent JSON shape: `{ success: true/false, data: ..., error: ... }`

---

## App setup

```js
// backend/src/app.js
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

// Import all route files
const authRoutes = require('./routes/auth.routes')
const interviewRoutes = require('./routes/interview.routes')
const candidateRoutes = require('./routes/candidate.routes')
const teamRoutes = require('./routes/team.routes')
const reportRoutes = require('./routes/report.routes')
const scheduleRoutes = require('./routes/schedule.routes')

const app = express()

// ── MIDDLEWARE ──
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,  // allow cookies
}))
app.use(express.json({ limit: '50mb' }))        // parse JSON body
app.use(express.urlencoded({ extended: true })) // parse form data
app.use(cookieParser())                          // parse cookies (for refresh token)

// ── ROUTES ──
app.use('/api/auth', authRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/candidates', candidateRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/schedule', scheduleRoutes)

// ── HEALTH CHECK ──
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  })
})

module.exports = app
```

---

## All API endpoints

```
AUTH
POST   /api/auth/login                  → email + password → tokens
POST   /api/auth/logout                 → clear refresh cookie
POST   /api/auth/refresh                → read cookie → new access token
POST   /api/auth/magic-link/:token      → candidate enters interview

TEAM (Manager)
GET    /api/team                        → get all team members
POST   /api/team/member                 → add single member
POST   /api/team/import                 → bulk CSV import
GET    /api/team/member/:id             → get member profile
PATCH  /api/team/member/:id             → update member
DELETE /api/team/member/:id             → remove member

CANDIDATES (Manager + Interviewer)
GET    /api/candidates                  → list external candidates
POST   /api/candidates                  → add candidate manually
POST   /api/candidates/import           → bulk CSV import

SCHEDULE (Manager)
POST   /api/schedule                    → schedule an interview
GET    /api/schedule/calendar           → get calendar events

INTERVIEWS (Candidate + Manager)
POST   /api/interviews/:id/start        → validate token, return first question
POST   /api/interviews/:id/answer       → save answer, transcribe, return next (adaptive)
POST   /api/interviews/:id/proctoring   → log proctoring event
POST   /api/interviews/:id/complete     → mark done, trigger report

REPORTS (Manager)
GET    /api/reports/team                → team summary
GET    /api/reports/:candidateId        → full candidate report
```

---

## Interview flow (the core backend logic)

### Start interview

```js
// routes/interview.routes.js
router.post('/:id/start', candidateAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const interview = await interviewService.startInterview(id, req.user)
    res.json({ success: true, data: interview })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
})

// services/interview.service.js
async function startInterview(interviewId, candidate) {
  // 1. Get interview config from DB
  const interview = await interviewRepository.getById(interviewId)

  // 2. Generate questions from JD + resume using LLM
  const questions = await llmService.generateQuestions({
    resume: candidate.resume_text,
    jd: interview.jd_text,
    difficulty: interview.difficulty,
    count: 10,
    mode: interview.interview_mode,  // 'simple' or 'adaptive'
  })

  // 3. Save questions to DB for this session
  await interviewRepository.saveQuestions(interviewId, questions)

  // 4. Return first question
  return {
    interviewId,
    firstQuestion: questions[0],
    totalQuestions: questions.length,
    mode: interview.interview_mode,
    transcriptionMode: interview.transcription_mode,
  }
}
```

### Save answer (called after each question)

```js
// routes/interview.routes.js
router.post('/:id/answer', candidateAuthMiddleware, upload.single('audio'), async (req, res) => {
  try {
    const { id } = req.params
    const { questionId, mode, attemptNumber } = req.body
    const audioFile = req.file  // multer processed the upload

    const result = await interviewService.saveAnswer({
      interviewId: id,
      questionId,
      audioBuffer: audioFile.buffer,
      mimeType: audioFile.mimetype,
      mode,
      attemptNumber,
    })

    res.json({ success: true, data: result })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
})

// services/interview.service.js
async function saveAnswer({ interviewId, questionId, audioBuffer, mimeType, mode, attemptNumber }) {

  // 1. Transcribe audio — choose method based on interview config
  const interview = await interviewRepository.getById(interviewId)
  const answerText = await transcriptionService.transcribe(
    audioBuffer,
    mimeType,
    interview.transcription_mode  // 'local' or 'api'
  )

  // 2. Immediately discard audio — we only need the text
  // (audioBuffer goes out of scope and is garbage collected)

  // 3. Save answer text to DB
  await answerRepository.create({ interviewId, questionId, answerText, attemptNumber })

  // 4. For adaptive mode — generate next question based on this answer
  if (mode === 'adaptive') {
    const conversationHistory = await answerRepository.getHistory(interviewId)
    const nextQuestion = await llmService.getAdaptiveQuestion(conversationHistory)

    if (!nextQuestion) {
      // Interview complete
      return { complete: true }
    }

    return {
      complete: false,
      nextQuestion,
      transcribedText: answerText,
    }
  }

  // 5. For simple mode — frontend handles next question index
  return {
    complete: false,
    transcribedText: answerText,
  }
}
```

---

## LLM prompt for generating questions

```js
// services/llm.service.js

async function generateQuestions({ resume, jd, difficulty, count, mode }) {

  const difficultyGuide = {
    easy:   '70% basic conceptual, 30% experience-based',
    medium: '40% conceptual, 40% experience-based, 20% problem-solving',
    hard:   '20% conceptual, 30% experience-based, 50% in-depth technical',
  }

  const prompt = `
    You are an experienced technical interviewer.

    Candidate resume:
    ${resume}

    ${jd ? `Job description:\n${jd}` : 'No specific JD provided — base questions on resume only.'}

    Your task:
    - Generate ${count} interview questions
    - Difficulty: ${difficulty} (${difficultyGuide[difficulty]})
    - 70% based on the candidate's actual resume (their specific experience, projects, tech stack)
    - 30% general role-based questions
    - Start with 2 warm-up questions (intro, background) to ease the candidate
    - Questions should feel like a real interview conversation

    Return ONLY a valid JSON array in this format:
    [
      { "id": "q1", "text": "...", "phase": "warmup" },
      { "id": "q2", "text": "...", "phase": "technical" },
      ...
    ]

    phase must be one of: warmup, technical, scenario, closing
  `

  const response = await chat([{ role: 'user', content: prompt }], '')
  return JSON.parse(response)
}

async function getAdaptiveQuestion(conversationHistory) {
  const prompt = `
    You are conducting a technical interview. Here is the conversation so far:
    ${JSON.stringify(conversationHistory, null, 2)}

    Based on the candidate's last answer, what is the best follow-up question?
    Consider:
    - If they mentioned something worth exploring deeper, ask about it
    - If they struggled, try a slightly easier related question
    - If they answered strongly, challenge them further
    - If we've covered enough on this topic, move to the next topic

    Return ONLY a JSON object:
    {
      "text": "the question to ask",
      "phase": "technical",
      "reasoning": "why this question follows naturally"
    }

    If the interview should end (enough questions asked, all topics covered), return:
    { "end": true }
  `

  const response = await chat([{ role: 'user', content: prompt }], '')
  const parsed = JSON.parse(response)

  if (parsed.end) return null
  return parsed
}
```

---

## Report generation

Runs async after interview is marked complete.

```js
// services/report.service.js

async function generateReport(interviewId) {

  // Get all answers from DB
  const answers = await answerRepository.getAllForInterview(interviewId)
  const interview = await interviewRepository.getById(interviewId)
  const candidate = await candidateRepository.getById(interview.candidate_id)

  const prompt = `
    You are evaluating a technical interview.

    Candidate: ${candidate.first_name} ${candidate.last_name}
    Role: ${interview.role}
    Difficulty: ${interview.difficulty}

    Interview transcript:
    ${answers.map(a => `Q: ${a.question_text}\nA: ${a.answer_text}`).join('\n\n')}

    Evaluate the candidate and return a JSON report:
    {
      "overall_score": 1-10,
      "confidence": 1-10,
      "technical_knowledge": 1-10,
      "communication": 1-10,
      "strengths": ["strength 1", "strength 2"],
      "improvement_tips": ["tip 1", "tip 2", "tip 3"],
      "summary": "2-3 sentence overall summary for the manager"
    }

    Important: improvement_tips should be specific and actionable.
    The candidate will ONLY see improvement_tips — not scores.
  `

  const response = await llmService.chat([{ role: 'user', content: prompt }], '')
  const report = JSON.parse(response)

  // Save report to DB
  await reportRepository.create({ interviewId, ...report })

  // Send email notification to manager
  await emailService.sendReportReady(interview.manager_email, { candidate, interviewId })

  return report
}
```

---

## Cleanup job — delete old Cloudinary files

```js
// jobs/cleanup.job.js
const cron = require('node-cron')

// Runs daily at 2 AM — deletes files older than retention period
cron.schedule('0 2 * * *', async () => {
  console.log('Running cleanup job...')

  const retentionDays = 30  // configurable per tenant in future
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  // Get files to delete from DB
  const files = await fileRepository.getFilesOlderThan(cutoffDate)

  for (const file of files) {
    await cloudinary.uploader.destroy(file.cloudinary_id)
    await fileRepository.markDeleted(file.id)
    console.log(`Deleted: ${file.cloudinary_id}`)
  }

  console.log(`Cleanup done. Deleted ${files.length} files.`)
})
```
