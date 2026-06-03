// backend/src/services/interview.service.js
// Core interview flow — start, answer, complete, report.

const db = require('../db/connection')
const interviewRepository = require('../repositories/interview.repository')
const attemptRepository = require('../repositories/attempt.repository')
const questionRepository = require('../repositories/question.repository')
const answerRepository = require('../repositories/answer.repository')
const reportRepository = require('../repositories/report.repository')
const candidateRepository = require('../repositories/candidate.repository')
const llmService = require('./llm.service')
const transcriptionService = require('./transcription.service')
const emailService = require('./email.service')

/**
 * Start an interview — validate, create attempt, generate questions.
 * @param {number} interviewId
 * @param {number} candidateId - from the session JWT
 * @returns {Promise<Object>}
 */
async function startInterview(interviewId, candidateId) {
  const interview = await interviewRepository.getById(interviewId)
  if (!interview) throw new Error('Interview not found')

  if (interview.candidate_id !== candidateId) throw new Error('Unauthorized')

  const attemptCount = await attemptRepository.countByInterview(interviewId)
  if (interview.max_attempts !== -1 && attemptCount >= interview.max_attempts) {
    throw new Error('All attempts used')
  }

  if (attemptCount > 0) {
    const last = await attemptRepository.getLatest(interviewId)
    if (last && last.ended) {
      const hoursSince = (Date.now() - new Date(last.ended).getTime()) / (1000 * 60 * 60)
      if (hoursSince < interview.cooldown_hours) {
        const wait = Math.ceil(interview.cooldown_hours - hoursSince)
        throw new Error(`Please wait ${wait} more hour${wait !== 1 ? 's' : ''} before your next attempt`)
      }
    }
  }

  const attempt = await attemptRepository.create(interviewId, attemptCount + 1)

  const candidate = await candidateRepository.getById(interview.candidate_id)

  const questions = await llmService.generateQuestions({
    resume: candidate.resume_text,
    jd: interview.jd_text,
    focusAreas: interview.focus_areas,
    difficulty: interview.difficulty,
    count: 10,
    mode: interview.interview_mode,
  })

  await questionRepository.createMany(interviewId, attempt.id, questions)

  return {
    interviewId,
    attemptId: attempt.id,
    attemptNumber: attempt.attempt_num,
    questions,
    firstQuestion: questions[0] || null,
    mode: interview.interview_mode,
    transcriptionMode: interview.transcription_mode,
  }
}

/**
 * Transcribe and save a candidate's answer. For adaptive mode, get next question.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function saveAnswer({ interviewId, attemptId, questionId, audioBuffer, mimeType, mode, transcriptionMode }) {
  let answerText
  try {
    if (transcriptionMode === 'local') {
      answerText = await transcriptionService.transcribeLocal(audioBuffer)
    } else {
      answerText = await transcriptionService.transcribeGroq(audioBuffer, mimeType)
    }
  } catch (err) {
    console.error('Transcription failed:', err)
    answerText = '[Transcription failed — audio could not be processed]'
  }
  // Audio buffer out of scope here — not persisted

  await answerRepository.create({ interviewId, attemptId, questionId, answerText })

  if (mode === 'adaptive') {
    const history = await answerRepository.getHistory(interviewId, attemptId)
    const nextQuestionText = await llmService.getAdaptiveQuestion(history)

    if (!nextQuestionText) {
      return { complete: true, transcribedText: answerText }
    }

    const allQs = await questionRepository.getByInterview(interviewId, attemptId)
    const nextOrderNum = allQs.length + 1

    const savedQ = await questionRepository.create(interviewId, attemptId, {
      text: nextQuestionText,
      phase: 'technical',
      order_num: nextOrderNum,
    })

    return { complete: false, transcribedText: answerText, nextQuestion: savedQ }
  }

  return { complete: false, transcribedText: answerText }
}

/**
 * Mark an attempt as completed and trigger async report generation.
 * @param {number} interviewId
 * @param {number} attemptId
 */
async function completeInterview(interviewId, attemptId) {
  await attemptRepository.updateStatus(attemptId, 'completed', new Date())
  await interviewRepository.updateStatus(interviewId, 'completed')

  // Fire-and-forget report generation
  generateReport(interviewId, attemptId).catch(err =>
    console.error('Report generation failed:', err)
  )
}

/**
 * Log a proctoring event.
 * @param {Object} data
 */
async function logProctoringEvent(data) {
  await db.query(
    `INSERT INTO proctoring_events (interview_id, attempt_id, event_type, severity, occurred, details)
     VALUES (@interviewId, @attemptId, @eventType, @severity, @occurred, @details)`,
    {
      interviewId: data.interviewId,
      attemptId: data.attemptId,
      eventType: data.type,
      severity: data.severity || 'medium',
      occurred: data.occurred || new Date().toISOString(),
      details: data.details || null,
    }
  )
}

/**
 * Generate and save an AI report after interview completion.
 * Called async — does not throw to caller.
 * @param {number} interviewId
 * @param {number} attemptId
 */
async function generateReport(interviewId, attemptId) {
  const answers = await answerRepository.getAllForAttempt(attemptId)
  const interview = await interviewRepository.getById(interviewId)
  const candidate = await candidateRepository.getById(interview.candidate_id)

  if (answers.length === 0) {
    console.error('generateReport: no answers found for attempt', attemptId)
    return
  }

  const qaText = answers.map(a => `Q: ${a.question}\nA: ${a.answer_text}`).join('\n\n')
  const prompt = `Candidate: ${candidate.first_name} ${candidate.last_name}
Role/Resume: ${candidate.resume_text || 'Not provided'}
JD: ${interview.jd_text || 'Not provided'}

Interview Q&A:
${qaText}`

  const reportData = await llmService.generateReport(prompt)

  await reportRepository.create({
    interviewId,
    attemptId,
    candidateId: interview.candidate_id,
    ...reportData,
  })

  // Notify manager
  const managerEmail = interview.manager_email
  if (managerEmail) {
    emailService.sendReportReady(managerEmail, {
      candidate,
      interviewId,
      companyName: '',
    }).catch(err => console.error('sendReportReady failed:', err))
  }
}

module.exports = { startInterview, saveAnswer, completeInterview, logProctoringEvent, generateReport }
