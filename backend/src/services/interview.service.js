const interviewRepository = require('../repositories/interview.repository')
const transcriptRepository = require('../repositories/transcript.repository')
const emailDeliveryRepository = require('../repositories/email-delivery.repository')
const reportRepository = require('../repositories/report.repository')
const reportJobRepository = require('../repositories/report-job.repository')
const scorecardRepository = require('../repositories/scorecard.repository')
const candidateIdentityService = require('./candidate-identity.service')
const llmService = require('./llm.service')
const transcriptionService = require('./transcription.service')
const emailService = require('./email.service')
const pdfService = require('./pdf.service')
const storageService = require('./storage.service')
const { parseStoredArray } = require('../utils/parse')

function buildResumeContext(interview) {
  const parts = []
  if (interview.candidate_resume_text) {
    parts.push(`Resume text:\n${String(interview.candidate_resume_text).slice(0, 4000)}`)
  }
  if (interview.candidate_resume_url) {
    parts.push(`Resume file URL: ${interview.candidate_resume_url}`)
  }
  const tags = parseStoredArray(interview.candidate_tags)
  if (tags.length > 0) {
    parts.push(`Candidate resume/profile tags: ${tags.join(', ')}`)
  }
  return parts.join('\n') || null
}

async function getCandidateInterview(interviewId, identity) {
  candidateIdentityService.assertInterviewScope(identity, interviewId)
  const interview = await interviewRepository.getByIdForCandidateIdentity(interviewId, identity)
  if (!interview) throw new Error('Unauthorized')
  if (interview.token_expires && new Date(interview.token_expires) < new Date()) {
    throw new Error('Interview link has expired')
  }
  return interview
}

async function getOrCreateQuestions(interview) {
  const existing = await transcriptRepository.getQuestionRecords(interview.id)
  if (existing.length > 0) return existing

  const count = interview.interview_mode === 'adaptive' ? 1 : interview.question_count
  const generated = await llmService.generateQuestions({
    candidateName: interview.candidate_first,
    resume: buildResumeContext(interview),
    jd: interview.context_text,
    focusAreas: interview.context_focus_areas,
    difficulty: interview.difficulty,
    count,
    mode: interview.interview_mode,
  })
  const questions = generated.length > 0
    ? generated
    : [{ text: 'Can you tell me about yourself?', phase: 'warmup', order_num: 1 }]
  return transcriptRepository.createQuestionRecords(interview.id, questions)
}

async function startInterview(interviewId, identity) {
  const interview = await getCandidateInterview(interviewId, identity)
  if (interview.type !== 'ai_voice') throw new Error('Interview type is not AI voice')
  if (interview.status === 'completed') throw new Error('Interview already completed')
  if (interview.status === 'scheduled') await interviewRepository.markStarted(interviewId)

  const questions = await getOrCreateQuestions(interview)
  const history = questions.filter(question => question.answer)

  return {
    interviewId,
    questions: questions.map(({ answer, ...question }) => question),
    transcript: history.flatMap(item => [
      { who: 'ai', text: item.question },
      { who: 'candidate', text: item.answer },
    ]),
    currentIndex: history.length,
    mode: interview.interview_mode,
    questionCount: interview.question_count,
    transcriptionMode: 'api',
  }
}

async function resolveQuestion(interviewId, questionId, questionText) {
  if (Number.isInteger(Number(questionId))) {
    return transcriptRepository.getQuestionRecord(Number(questionId), interviewId)
  }
  const cleanQuestion = String(questionText || '').trim()
  const questions = await transcriptRepository.getQuestionRecords(interviewId)
  return questions.find(item => !item.answer && item.question === cleanQuestion) || null
}

async function saveAnswer({
  interviewId,
  identity,
  questionId,
  questionText,
  audioBuffer,
  mimeType,
  developmentFallback,
  manualText,
  clientTranscript,
}) {
  const interview = await getCandidateInterview(interviewId, identity)
  if (interview.status === 'completed') throw new Error('Interview already completed')

  const question = await resolveQuestion(interviewId, questionId, questionText)
  if (!question) throw new Error('Invalid question')
  if (question.answer) throw new Error('Question already answered')
  if (questionText && question.question !== String(questionText).trim()) {
    throw new Error('Invalid question')
  }

  const fallbackText = typeof clientTranscript === 'string' ? clientTranscript.trim() : ''
  let answerText
  if (manualText && manualText.trim()) {
    answerText = manualText.trim()
  } else if (developmentFallback && process.env.NODE_ENV !== 'production') {
    answerText = '[Development test answer: microphone permission was unavailable]'
  } else {
    try {
      answerText = await transcriptionService.transcribeGroq(audioBuffer, mimeType)
    } catch (err) {
      console.error('Transcription failed:', err.message)
      answerText = fallbackText
    }
  }

  if (!answerText && fallbackText) answerText = fallbackText
  if (!answerText) throw new Error('Transcription failed')

  const saved = await transcriptRepository.answerQuestion(
    question.id,
    interviewId,
    answerText
  )
  if (!saved) throw new Error('Question already answered')

  const history = await transcriptRepository.getByInterview(interviewId)
  if (history.length >= interview.question_count) {
    return { complete: true, transcribedText: answerText }
  }

  if (interview.interview_mode !== 'adaptive') {
    const questions = await transcriptRepository.getQuestionRecords(interviewId)
    return {
      complete: history.length >= questions.length,
      transcribedText: answerText,
    }
  }

  const nextQuestionText = await llmService.getAdaptiveQuestion(history, interview.question_count)
  if (!nextQuestionText) {
    return { complete: true, transcribedText: answerText }
  }

  const nextQuestion = await transcriptRepository.createQuestion(interviewId, {
    text: nextQuestionText,
    phase: 'adaptive',
    order_num: history.length + 1,
  })
  return { complete: false, transcribedText: answerText, nextQuestion }
}

async function completeInterview(interviewId, identity, status = 'completed') {
  const interview = await getCandidateInterview(interviewId, identity)
  const result = status === 'abandoned' ? 'failed_mid_interview' : 'success'
  if (interview.status === 'completed') {
    // Completion is idempotent, but report creation must also recover if a
    // previous request saved the interview and failed before queuing the job.
    await reportJobRepository.create(interviewId)
    return
  }

  await interviewRepository.markCompleted(interviewId, result)
  if (result === 'failed_mid_interview') {
    const interviewFlowService = require('./interview-flow.service')
    await interviewFlowService.handleInterviewResult(interviewId, 'fail', 0)
      .catch(err => console.error('Flow progression failed:', err.message))
  }
  await reportJobRepository.create(interviewId)
}

async function logProctoringEvent(data) {
  const interview = await getCandidateInterview(data.interviewId, data.identity)
  if (interview.status === 'completed') {
    return { warning: false, terminated: interview.result === 'cheating_attempt' }
  }

  if (interview.result === 'proctoring_warning') {
    await interviewRepository.markCompleted(data.interviewId, 'cheating_attempt')
    const scorecard = await scorecardRepository.upsert({
      interviewId: data.interviewId,
      overall: 0,
      confidence: 0,
      techKnowledge: 0,
      communication: 0,
      problemSolving: 0,
      decision: 'fail',
      reason: 'Interview terminated after a repeated proctoring violation.',
    })
    const report = await reportRepository.upsertGenerating({
      interviewId: data.interviewId,
      scorecardId: scorecard.id,
      summary: 'Interview terminated after a repeated proctoring violation.',
      strengths: [],
    })
    await reportRepository.updateStatus(report.id, 'ready')
    const job = await reportJobRepository.create(data.interviewId)
    await reportJobRepository.markCompleted(job.id)
    const interviewFlowService = require('./interview-flow.service')
    await interviewFlowService.handleInterviewResult(data.interviewId, 'fail', 0)
      .catch(err => console.error('Flow progression failed:', err.message))
    return { warning: false, terminated: true }
  }

  await interviewRepository.updateResult(data.interviewId, 'proctoring_warning')
  return {
    warning: true,
    terminated: false,
    message: 'Warning: another tab or fullscreen violation will end the interview.',
  }
}

async function sendReportNotification(interview, interviewId) {
  const recipients = [
    ...String(interview.report_emails || '').split(','),
  ].map(value => value && value.trim()).filter(Boolean)
  const uniqueRecipients = [...new Set(recipients)]
  if (uniqueRecipients.length === 0) return

  try {
    await emailService.sendReportReady(uniqueRecipients, {
      candidate: {
        first_name: interview.candidate_first,
        last_name: interview.candidate_last,
      },
      interviewId,
      companyName: '',
    })
    await emailDeliveryRepository.create({
      kind: 'report_ready',
      interviewId,
      intendedTo: uniqueRecipients.join(','),
      deliveredTo: emailService.getDeliveredRecipients(uniqueRecipients).join(','),
      status: 'sent',
    })
  } catch (err) {
    console.error('sendReportReady failed:', err.message)
    await emailDeliveryRepository.create({
      kind: 'report_ready',
      interviewId,
      intendedTo: uniqueRecipients.join(','),
      deliveredTo: emailService.getDeliveredRecipients(uniqueRecipients).join(','),
      status: 'failed',
      error: err.message,
    })
  }
}

async function generateReport(interviewId) {
  const existingReport = await reportRepository.getByInterview(interviewId)
  if (existingReport?.status === 'ready') {
    const existingScorecard = await scorecardRepository.getByInterview(interviewId)
    if (existingScorecard) {
      const interviewFlowService = require('./interview-flow.service')
      await interviewFlowService.handleInterviewResult(
        interviewId,
        existingScorecard.decision,
        existingScorecard.overall
      )
    }
    return existingReport
  }

  const [transcripts, interview] = await Promise.all([
    transcriptRepository.getByInterview(interviewId),
    interviewRepository.getById(interviewId),
  ])
  if (!interview) throw new Error(`Interview ${interviewId} not found`)
  if (interview.result === 'cheating_attempt') {
    throw new Error(`Interview ${interviewId} ended because of a proctoring violation`)
  }
  const endedEarly = interview.result === 'failed_mid_interview'
  if (transcripts.length === 0 && !endedEarly) {
    throw new Error(`No transcripts found for interview ${interviewId}`)
  }

  // Cap each entry to keep the combined prompt within LLM context limits
  const qaText = transcripts.slice(0, 30).map(item => {
    const q = String(item.question || '').slice(0, 500)
    const a = String(item.answer || '').slice(0, 800)
    const expected = interview.type === 'exam'
      ? item.question_type === 'mcq'
        ? `\nExpected option index: ${item.correct_answer}`
        : item.reference_solution
          ? `\nReference solution: ${String(item.reference_solution).slice(0, 300)}`
          : ''
      : ''
    return `Q: ${q}${expected}\nA: ${a}`
  }).join('\n\n')
  const reportData = transcripts.length === 0
    ? {
        overall_score: 0,
        confidence: 0,
        tech_knowledge: 0,
        communication: 0,
        problem_solving: 0,
        decision: 'fail',
        summary: 'The candidate ended the interview before answering any questions.',
        strengths: [],
      }
    : await llmService.generateReport(
        `Candidate: ${interview.candidate_first} ${interview.candidate_last}\nInterview Q&A:\n${qaText}`
      )
  if (endedEarly) {
    reportData.decision = 'fail'
    reportData.summary = `Interview ended early by the candidate. ${reportData.summary || ''}`.trim()
  }
  const decision = endedEarly ? 'fail' : reportData.decision || (
    reportData.overall_score >= 7
      ? 'pass'
      : reportData.overall_score >= 5 ? 'borderline' : 'fail'
  )

  const scorecard = await scorecardRepository.upsert({
    interviewId,
    overall: reportData.overall_score,
    confidence: reportData.confidence,
    techKnowledge: reportData.tech_knowledge,
    communication: reportData.communication,
    problemSolving: reportData.problem_solving,
    decision,
    reason: reportData.summary,
  })

  const savedReport = await reportRepository.upsertGenerating({
    interviewId,
    scorecardId: scorecard.id,
    summary: reportData.summary,
    strengths: reportData.strengths,
  })

  // Flow progression is based on the persisted scorecard decision and must
  // not be blocked by PDF generation, storage, or notification failures.
  const interviewFlowService = require('./interview-flow.service')
  await interviewFlowService.handleInterviewResult(interviewId, decision, reportData.overall_score)

  try {
    const pdfBuffer = await pdfService.generateReportPdf({
      candidate: {
        first_name: interview.candidate_first,
        last_name: interview.candidate_last,
        email: interview.candidate_email,
      },
      interview,
      report: reportData,
    })
    const uploaded = await storageService.uploadReportAsset(pdfBuffer, savedReport.id)
    const readyReport = await reportRepository.updateStatus(savedReport.id, 'ready', uploaded.path)
    await sendReportNotification(interview, interviewId)
    return readyReport
  } catch (err) {
    await reportRepository.updateStatus(savedReport.id, 'error')
    throw err
  }
}

module.exports = {
  startInterview,
  saveAnswer,
  completeInterview,
  logProctoringEvent,
  generateReport,
}
