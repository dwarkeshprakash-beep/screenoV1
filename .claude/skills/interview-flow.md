# SKILL: Interview Flow — Screeno

> The most complex feature. The complete interview loop from scheduling to report. Reference this when building any part of the interview system.

---

## Full interview journey

```
Manager schedules interview
    ↓
System creates interview record in DB
System generates magic link token
System sends email to candidate
    ↓
Candidate clicks link → validates token → enters interview flow
    ↓
Device Check → Consent → AI Prep Loader → AI Interview or Exam
    ↓
Each question: AI speaks → Candidate answers → Audio → Backend transcribes → Save to DB
    ↓
Interview complete → Report generates async → Manager notified
```

---

## Interview states (frontend state machine)

The AI interview UI has these phases — always show the correct UI for each:

```
'loading'       → Connecting, "AI is preparing your questions..." spinner
'ai_speaking'   → AI voice playing, waveform animating, Start button disabled
'listening'     → "Your turn", Start Answer button enabled (green)
'recording'     → Mic active, recording indicator pulsing, Stop Answer button enabled (red)
'processing'    → "Processing your answer...", spinner, all buttons disabled (1-2 sec)
'paused'        → Integrity violation (tab switch), overlay shown, resume button
'ended'         → Interview finished, redirect to completion page
'error'         → Something failed, show error + retry option
```

State transitions:
```
loading → ai_speaking (when questions loaded and first question ready to play)
ai_speaking → listening (when speechSynthesis finishes)
listening → recording (when candidate clicks Start Answer)
recording → processing (when candidate clicks Stop Answer)
processing → ai_speaking (for adaptive: next question from LLM) OR listening (for simple: next question)
listening → ended (when all questions done)
any state → paused (tab switch detected)
paused → previous state (candidate clicks "I understand")
```

---

## Frontend implementation

```js
// hooks/useInterview.js
import { useState, useRef, useCallback } from 'react'
import * as api from '../services/api'

function useInterview(interviewId, mode, transcriptionMode) {

  // ── STATE ──
  const [phase, setPhase] = useState('loading')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [attemptNumber, setAttemptNumber] = useState(1)

  // Refs for MediaRecorder (refs don't cause re-renders)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  // ── START INTERVIEW ──
  async function startInterview() {
    setPhase('loading')
    const res = await api.startInterview(interviewId)
    setQuestions(res.data.questions)
    setAttemptNumber(res.data.attemptNumber)
    // Play first question
    speakQuestion(res.data.questions[0].text)
  }

  // ── AI SPEAKS (browser TTS — free, cross-browser) ──
  function speakQuestion(text) {
    setPhase('ai_speaking')

    // Cancel any current speech first
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'   // Indian English accent
    utterance.rate = 0.95

    utterance.onend = () => {
      // AI finished speaking — candidate's turn
      setPhase('listening')
    }

    utterance.onerror = () => {
      // Fallback: just move to listening state
      setPhase('listening')
    }

    window.speechSynthesis.speak(utterance)
  }

  // ── CANDIDATE STARTS SPEAKING ──
  async function startRecording() {
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recorderRef.current = new MediaRecorder(stream)

      // Collect audio chunks as they come
      recorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data)
      }

      recorderRef.current.start()
      setPhase('recording')
    } catch (err) {
      console.error('Microphone access failed:', err)
      // Show error to user
    }
  }

  // ── CANDIDATE STOPS SPEAKING ──
  async function stopRecording() {
    setPhase('processing')

    return new Promise((resolve) => {
      recorderRef.current.onstop = async () => {
        // Combine audio chunks into one blob
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

        // Stop all audio tracks (releases mic indicator in browser)
        recorderRef.current.stream.getTracks().forEach(t => t.stop())

        const currentQuestion = questions[currentIndex]

        try {
          // Send audio to backend — backend transcribes and saves
          const result = await api.saveAnswer(interviewId, {
            questionId: currentQuestion.id,
            mode: mode,            // 'simple' or 'adaptive'
            attemptNumber: attemptNumber,
          }, audioBlob)

          // Add to local transcript for display
          setTranscript(prev => [...prev, {
            question: currentQuestion.text,
            answer: result.data.transcribedText,
          }])

          // Handle next step
          if (result.data.complete) {
            // All questions done
            await handleInterviewComplete()
          } else if (mode === 'adaptive') {
            // Backend returned next question
            const nextQ = result.data.nextQuestion
            setQuestions(prev => [...prev, nextQ])
            setCurrentIndex(prev => prev + 1)
            speakQuestion(nextQ.text)
          } else {
            // Simple mode: go to next question from pre-generated list
            const nextIndex = currentIndex + 1
            if (nextIndex >= questions.length) {
              await handleInterviewComplete()
            } else {
              setCurrentIndex(nextIndex)
              speakQuestion(questions[nextIndex].text)
            }
          }

          resolve(result.data)
        } catch (err) {
          console.error('Save answer failed:', err)
          setPhase('listening') // Resume on error
        }
      }

      recorderRef.current.stop()
    })
  }

  // ── INTERVIEW ENDS ──
  async function handleInterviewComplete() {
    await api.completeInterview(interviewId)
    setPhase('ended')
    // Caller (the page) redirects to done page
  }

  // ── REPEAT QUESTION ──
  function repeatQuestion() {
    if (questions[currentIndex]) {
      speakQuestion(questions[currentIndex].text)
    }
  }

  return {
    phase,
    currentQuestion: questions[currentIndex] || null,
    transcript,
    totalQuestions: questions.length,
    currentIndex,
    startInterview,
    startRecording,
    stopRecording,
    repeatQuestion,
  }
}

export default useInterview
```

---

## Backend: Start interview

```js
// services/interview.service.js
async function startInterview(interviewId, candidateUserId) {

  // 1. Load interview config from DB
  const interview = await interviewRepository.getById(interviewId)

  // 2. Check this candidate is allowed (token matches)
  if (interview.candidate_id !== candidateUserId) {
    throw new Error('Unauthorized')
  }

  // 3. Check attempt count
  const attemptCount = await attemptRepository.countByInterview(interviewId)
  if (interview.max_attempts !== -1 && attemptCount >= interview.max_attempts) {
    throw new Error('All attempts used')
  }

  // 4. Check cooldown (time since last attempt)
  if (attemptCount > 0) {
    const lastAttempt = await attemptRepository.getLatest(interviewId)
    const hoursSinceLast = (Date.now() - new Date(lastAttempt.ended).getTime()) / (1000 * 60 * 60)
    if (hoursSinceLast < interview.cooldown_hours) {
      throw new Error(`Please wait ${Math.ceil(interview.cooldown_hours - hoursSinceLast)} more hours`)
    }
  }

  // 5. Create new attempt record
  const attempt = await attemptRepository.create(interviewId, attemptCount + 1)

  // 6. Generate questions using LLM
  const candidate = await candidateRepository.getById(interview.candidate_id)
  const questions = await llmService.generateQuestions({
    resume: candidate.resume_text,
    jd: interview.jd_text,
    focusAreas: interview.focus_areas,
    difficulty: interview.difficulty,
    count: 10,
    mode: interview.interview_mode,
  })

  // 7. Save questions to DB (they're linked to this attempt)
  await questionRepository.createMany(interviewId, attempt.id, questions)

  return {
    interviewId,
    attemptId: attempt.id,
    attemptNumber: attempt.attempt_num,
    questions: questions,  // full list for 'simple' mode
    firstQuestion: questions[0],
    mode: interview.interview_mode,
    transcriptionMode: interview.transcription_mode,
  }
}
```

---

## Backend: Save answer + transcribe

```js
// services/interview.service.js
async function saveAnswer({ interviewId, attemptId, questionId, audioBuffer, mimeType, mode, transcriptionMode }) {

  // 1. Transcribe audio — choose method from interview config
  let answerText
  if (transcriptionMode === 'local') {
    // Internal teams — local Whisper running on server
    answerText = await transcriptionService.transcribeLocal(audioBuffer)
  } else {
    // External candidates — Groq Whisper API
    answerText = await transcriptionService.transcribeGroq(audioBuffer, mimeType)
  }
  // Audio buffer goes out of scope here — not stored anywhere

  // 2. Save answer text to DB
  await answerRepository.create({ interviewId, attemptId, questionId, answerText })

  // 3. For adaptive mode — ask LLM what to ask next
  if (mode === 'adaptive') {
    const conversationHistory = await answerRepository.getHistory(interviewId, attemptId)
    const nextQuestion = await llmService.getAdaptiveQuestion(conversationHistory)

    if (!nextQuestion) {
      // LLM decided interview is complete
      return { complete: true, transcribedText: answerText }
    }

    // Save next question to DB
    const savedQ = await questionRepository.create(interviewId, attemptId, nextQuestion)
    return { complete: false, transcribedText: answerText, nextQuestion: savedQ }
  }

  // 4. Simple mode — frontend knows the next question already
  return { complete: false, transcribedText: answerText }
}
```

---

## Report generation (async after interview)

```js
// jobs/report.job.js — triggered by POST /api/interviews/:id/complete

async function generateReport(interviewId, attemptId) {

  // 1. Get all Q&A from this attempt
  const answers = await answerRepository.getAllForAttempt(attemptId)
  const interview = await interviewRepository.getById(interviewId)
  const candidate = await candidateRepository.getById(interview.candidate_id)

  // 2. Check if we should generate report now (for 'all' mode, wait for all attempts)
  if (interview.report_timing === 'all') {
    const attemptCount = await attemptRepository.countCompleted(interviewId)
    // For unlimited mode — generate every N attempts
    if (interview.max_attempts === -1) {
      if (attemptCount % interview.report_every_n !== 0) {
        return // Not time yet
      }
    } else {
      // Finite attempts — only generate after the last one
      if (attemptCount < interview.max_attempts) {
        return // Not all attempts done yet
      }
    }
  }

  // 3. Build LLM prompt and generate report
  const prompt = buildReportPrompt(candidate, answers, interview)
  const reportJson = await llmService.generateReport(prompt)

  // 4. Save report to DB
  await reportRepository.create({
    interviewId,
    attemptId: interview.report_timing === 'each' ? attemptId : null,
    candidateId: interview.candidate_id,
    ...reportJson
  })

  // 5. Send email to manager (and any extra report_emails)
  const emails = [interview.manager_email, ...(JSON.parse(interview.report_emails || '[]'))]
  for (const email of emails) {
    await emailService.sendReportReady(email, { candidate, interviewId })
  }
}
```

---

## Proctoring (frontend, background component)

```js
// hooks/useProctoring.js
import { useEffect } from 'react'
import { logProctoringEvent } from '../services/api'

function useProctoring(interviewId, onViolation) {

  useEffect(() => {
    // Tab switch detection
    function handleVisibilityChange() {
      if (document.hidden) {
        logProctoringEvent(interviewId, { type: 'tab_switch', severity: 'medium', occurred: new Date().toISOString() })
        onViolation('tab_switch')  // Tells parent to show the overlay
      }
    }

    // Fullscreen exit detection
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        logProctoringEvent(interviewId, { type: 'fullscreen_exit', severity: 'low', occurred: new Date().toISOString() })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    // Cleanup when interview ends
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [interviewId])
}

export default useProctoring
```

---

## Magic link validation (candidate enters interview)

```js
// backend: POST /api/auth/magic-link/:token
async function validateMagicLink(token) {

  // 1. Hash the token and find in DB
  const interview = await interviewRepository.getByToken(token)

  if (!interview) throw new Error('Invalid link')
  if (new Date() > new Date(interview.window_closes)) throw new Error('Link has expired')
  if (interview.status === 'completed') throw new Error('Interview already completed')

  // 2. Issue a short-lived JWT for this interview session
  const sessionJWT = jwt.sign(
    {
      interviewId: interview.id,
      candidateId: interview.candidate_id,
      role: 'candidate',
    },
    process.env.JWT_SECRET,
    { expiresIn: '4h' }  // Enough for a full interview
  )

  return { sessionToken: sessionJWT, interview }
}
```
