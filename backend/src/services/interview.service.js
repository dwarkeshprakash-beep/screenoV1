// backend/src/services/interview.service.js
// Core interview flow — start, answer, complete, report.

const interviewRepository = require('../repositories/interview.repository')
const attemptRepository = require('../repositories/attempt.repository')
const questionRepository = require('../repositories/question.repository')
const answerRepository = require('../repositories/answer.repository')
const proctoringRepository = require('../repositories/proctoring.repository')
const reportRepository = require('../repositories/report.repository')
const candidateRepository = require('../repositories/candidate.repository')
const emailDeliveryRepository = require('../repositories/email-delivery.repository')
const llmService = require('./llm.service')
const transcriptionService = require('./transcription.service')
const emailService = require('./email.service')
const pdfService = require('./pdf.service')
const storageService = require('./storage.service')

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
  const latestAttempt = attemptCount > 0
    ? await attemptRepository.getLatest(interviewId)
    : null

  if (latestAttempt && latestAttempt.status === 'in_progress' && !latestAttempt.ended) {
    const existingQuestions = await questionRepository.getByInterview(
      interviewId,
      latestAttempt.id
    )
    if (existingQuestions.length > 0) {
      const answeredQuestionIds = await answerRepository.getAnsweredQuestionIds(latestAttempt.id)
      const answeredSet = new Set(answeredQuestionIds)
      const pendingQuestions = existingQuestions.filter(question => !answeredSet.has(question.id))
      const history = await answerRepository.getHistory(interviewId, latestAttempt.id)

      return {
        interviewId,
        attemptId: latestAttempt.id,
        attemptNumber: latestAttempt.attempt_num,
        questions: pendingQuestions,
        firstQuestion: pendingQuestions[0] || null,
        transcript: history.flatMap(item => [
          { who: 'ai', text: item.question },
          { who: 'candidate', text: item.answer },
        ]),
        mode: interview.interview_mode,
        transcriptionMode: interview.transcription_mode,
      }
    }
  }

  if (interview.max_attempts !== -1 && attemptCount >= interview.max_attempts) {
    throw new Error('All attempts used')
  }

  if (attemptCount > 0) {
    const last = latestAttempt
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

  const generatedQuestions = await llmService.generateQuestions({
    resume: candidate.resume_text,
    jd: interview.jd_text,
    focusAreas: interview.focus_areas,
    difficulty: interview.difficulty,
    count: interview.interview_mode === 'adaptive' ? 1 : 10,
    mode: interview.interview_mode,
  })

  const questions = await questionRepository.createMany(
    interviewId,
    attempt.id,
    generatedQuestions
  )

  return {
    interviewId,
    attemptId: attempt.id,
    attemptNumber: attempt.attempt_num,
    questions,
    firstQuestion: questions[0] || null,
    transcript: [],
    mode: interview.interview_mode,
    transcriptionMode: interview.transcription_mode,
  }
}

/**
 * Transcribe and save a candidate's answer. For adaptive mode, get next question.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function saveAnswer({
  interviewId,
  candidateId,
  attemptId,
  questionId,
  audioBuffer,
  mimeType,
  mode,
  developmentFallback,
  manualText,
}) {
  const interview = await interviewRepository.getByIdForCandidate(interviewId, candidateId)
  if (!interview) throw new Error('Unauthorized')
  const attempt = await attemptRepository.getByIdForInterview(attemptId, interviewId)
  if (!attempt || attempt.status !== 'in_progress') throw new Error('Invalid attempt')
  const question = await questionRepository.getByIdForInterview(questionId, interviewId, attemptId)
  if (!question) throw new Error('Invalid question')

  let answerText
  if (manualText && manualText.trim()) {
    answerText = manualText.trim()
  } else if (developmentFallback && process.env.NODE_ENV !== 'production') {
    answerText = '[Development test answer: microphone permission was unavailable]'
  } else {
    try {
      answerText = await transcriptionService.transcribeGroq(audioBuffer, mimeType)
    } catch (err) {
      console.error('Transcription failed:', err)
      answerText = '[Transcription failed — audio could not be processed]'
    }
  }
  // Audio buffer out of scope here — not persisted

  if (answerText.startsWith('[Transcription failed')) {
    throw new Error('Transcription failed')
  }
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
async function completeInterview(interviewId, attemptId, candidateId, status = 'completed') {
  const interview = await interviewRepository.getByIdForCandidate(interviewId, candidateId)
  if (!interview) throw new Error('Unauthorized')
  const attempt = await attemptRepository.getByIdForInterview(attemptId, interviewId)
  if (!attempt) throw new Error('Invalid attempt')

  const finalStatus = status === 'abandoned' ? 'abandoned' : 'completed'
  if (attempt.status === finalStatus) return

  await attemptRepository.updateStatus(attemptId, finalStatus, new Date())
  await interviewRepository.updateStatus(interviewId, finalStatus)

  if (finalStatus === 'completed') {
    const reportJobRepository = require('../repositories/report-job.repository')
    await reportJobRepository.enqueue(interviewId, attemptId)
  }
}

/**
 * Log a proctoring event.
 * @param {Object} data
 */
async function logProctoringEvent(data) {
  const interview = await interviewRepository.getByIdForCandidate(data.interviewId, data.candidateId)
  if (!interview) throw new Error('Unauthorized')
  const attempt = data.attemptId
    ? await attemptRepository.getByIdForInterview(data.attemptId, data.interviewId)
    : await attemptRepository.getLatest(data.interviewId)

  if (!attempt) throw new Error('Interview attempt not found')

  await proctoringRepository.create({
    interviewId: data.interviewId,
    attemptId: attempt.id,
    eventType: data.type,
    severity: data.severity || 'medium',
    occurred: data.occurred || new Date().toISOString(),
  })
}

/**
 * Generate and save an AI report after interview completion.
 * Called async — does not throw to caller.
 * @param {number} interviewId
 * @param {number} attemptId
 */
async function generateReport(interviewId, attemptId) {
  const existingReport = await reportRepository.getByAttempt(attemptId)
  if (existingReport) return existingReport

  const answers = await answerRepository.getAllForAttempt(attemptId)
  const interview = await interviewRepository.getById(interviewId)
  const candidate = await candidateRepository.getById(interview.candidate_id)

  if (answers.length === 0) {
    throw new Error(`No answers found for attempt ${attemptId}`)
  }

  const qaText = answers.map(a => `Q: ${a.question}\nA: ${a.answer_text}`).join('\n\n')
  const prompt = `Candidate: ${candidate.first_name} ${candidate.last_name}
Role/Resume: ${candidate.resume_text || 'Not provided'}
JD: ${interview.jd_text || 'Not provided'}

Interview Q&A:
${qaText}`

  const reportData = await llmService.generateReport(prompt)

  const savedReport = await reportRepository.create({
    interviewId,
    attemptId,
    candidateId: interview.candidate_id,
    ...reportData,
  })

  // Generate PDF and upload to Cloudinary — fire-and-forget, don't block email notify
  pdfService.generateReportPdf({ candidate, interview, report: savedReport })
    .then(buffer => storageService.uploadReport(buffer, savedReport.id))
    .then(({ url }) => reportRepository.updatePdfUrl(savedReport.id, url))
    .catch(err => console.error('PDF generation/upload failed:', err))

  // Notify manager
  const managerEmail = interview.manager_email
  if (managerEmail) {
    emailService.sendReportReady(managerEmail, {
      candidate,
      interviewId,
      companyName: '',
    })
      .then(() => emailDeliveryRepository.create({
        kind: 'report_ready',
        interviewId,
        candidateId: candidate.id,
        intendedTo: managerEmail,
        deliveredTo: emailService.getDeliveredRecipients().join(','),
        status: 'sent',
      }))
      .catch(err => {
        console.error('sendReportReady failed:', err)
        return emailDeliveryRepository.create({
          kind: 'report_ready',
          interviewId,
          candidateId: candidate.id,
          intendedTo: managerEmail,
          deliveredTo: emailService.getDeliveredRecipients().join(','),
          status: 'failed',
          error: err.message || 'Report email failed. Please contact administration.',
        })
      })
      .catch(err => console.error('report email delivery log failed:', err.message))
  }
  return savedReport
}

module.exports = { startInterview, saveAnswer, completeInterview, logProctoringEvent, generateReport }
