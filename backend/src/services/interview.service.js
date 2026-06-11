// backend/src/services/interview.service.js
const interviewRepository = require('../repositories/interview.repository')
const transcriptRepository = require('../repositories/transcript.repository')
const externalCandidateRepository = require('../repositories/external-candidate.repository')
const userRepository = require('../repositories/user.repository')
const emailDeliveryRepository = require('../repositories/email-delivery.repository')
const reportRepository = require('../repositories/report.repository')
const reportJobRepository = require('../repositories/report-job.repository')
const llmService = require('./llm.service')
const transcriptionService = require('./transcription.service')
const emailService = require('./email.service')
const pdfService = require('./pdf.service')
const storageService = require('./storage.service')

async function startInterview(interviewId, candidateId) {
  const interview = await interviewRepository.getById(interviewId)
  if (!interview) throw new Error('Interview not found')

  // Check identity
  if (interview.internal_user_id !== candidateId && interview.external_candidate_id !== candidateId) {
    throw new Error('Unauthorized')
  }

  if (interview.status === 'completed') {
    throw new Error('Interview already completed')
  }

  if (interview.status === 'pending') {
    await interviewRepository.markStarted(interviewId)
  }

  let candidateName = interview.candidate_first
  let resumeText = null
  if (interview.internal_user_id) {
    // If we wanted to fetch resume text for internal, we would do it here
  }

  // Generate the first question using LLM
  const generatedQuestions = await llmService.generateQuestions({
    candidateName,
    resume: resumeText,
    jd: null,
    focusAreas: null,
    difficulty: interview.difficulty,
    count: 1,
    mode: interview.interview_mode,
  })

  const firstQuestion = generatedQuestions[0] || { text: 'Can you tell me about yourself?' }

  const history = await transcriptRepository.getByInterview(interviewId)

  return {
    interviewId,
    firstQuestion,
    transcript: history.flatMap(item => [
      { who: 'ai', text: item.question },
      { who: 'candidate', text: item.answer },
    ]),
    mode: interview.interview_mode,
    transcriptionMode: 'api',
  }
}

async function saveAnswer({
  interviewId,
  candidateId,
  questionText,
  audioBuffer,
  mimeType,
  developmentFallback,
  manualText,
  clientTranscript,
}) {
  const interview = await interviewRepository.getById(interviewId)
  if (!interview || (interview.internal_user_id !== candidateId && interview.external_candidate_id !== candidateId)) {
    throw new Error('Unauthorized')
  }

  if (interview.status === 'completed') throw new Error('Interview already completed')

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
      console.error('Transcription failed:', err)
      answerText = fallbackText || '[Transcription failed — audio could not be processed]'
    }
  }

  if (!answerText && fallbackText) {
    answerText = fallbackText
  }

  if (answerText.startsWith('[Transcription failed')) {
    throw new Error('Transcription failed')
  }

  await transcriptRepository.create({ 
    interview_id: interviewId, 
    question: questionText || 'Previous Question', 
    answer: answerText 
  })

  const history = await transcriptRepository.getByInterview(interviewId)
  
  if (history.length >= interview.question_count) {
    return { complete: true, transcribedText: answerText }
  }

  const nextQuestionText = await llmService.getAdaptiveQuestion(history, interview.question_count)

  if (!nextQuestionText) {
    return { complete: true, transcribedText: answerText }
  }

  return { complete: false, transcribedText: answerText, nextQuestion: { text: nextQuestionText } }
}

async function completeInterview(interviewId, candidateId, status = 'completed') {
  const interview = await interviewRepository.getById(interviewId)
  if (!interview || (interview.internal_user_id !== candidateId && interview.external_candidate_id !== candidateId)) {
    throw new Error('Unauthorized')
  }

  const finalStatus = status === 'abandoned' ? 'abandoned' : 'completed'
  if (interview.status === finalStatus) return

  await interviewRepository.markCompleted(interviewId, finalStatus)

  if (finalStatus === 'completed') {
    await reportJobRepository.create(interviewId)
  }
}

async function logProctoringEvent(data) {
  const interview = await interviewRepository.getById(data.interviewId)
  if (!interview || (interview.internal_user_id !== data.candidateId && interview.external_candidate_id !== data.candidateId)) {
    throw new Error('Unauthorized')
  }
  
  // Since proctoring_events table is dropped, we just append to the result column
  const warning = `[PROCTORING FLAG: ${data.type} (${data.severity}) at ${data.occurred}]`
  const newResult = interview.result ? interview.result + '\n' + warning : warning
  
  await interviewRepository.markCompleted(data.interviewId, newResult)
}

async function generateReport(interviewId) {
  const existingReport = await reportRepository.getByInterview(interviewId)
  if (existingReport) return existingReport

  const transcripts = await transcriptRepository.getByInterview(interviewId)
  const interview = await interviewRepository.getById(interviewId)
  
  if (transcripts.length === 0) {
    throw new Error(`No transcripts found for interview ${interviewId}`)
  }

  const qaText = transcripts.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')
  const prompt = `Candidate: ${interview.candidate_first} ${interview.candidate_last}
Interview Q&A:
${qaText}`

  const reportData = await llmService.generateReport(prompt)

  const savedReport = await reportRepository.create(
    interviewId,
    reportData.summary,
    reportData.strengths,
    null
  )

  // Notify manager
  const managerEmail = interview.manager_email
  if (managerEmail) {
    emailService.sendReportReady(managerEmail, {
      candidate: { first_name: interview.candidate_first, last_name: interview.candidate_last },
      interviewId,
      companyName: '',
    })
      .then(() => emailDeliveryRepository.create({
        kind: 'report_ready',
        interviewId,
        intendedTo: managerEmail,
        deliveredTo: emailService.getDeliveredRecipients(managerEmail).join(','),
        status: 'sent',
      }))
      .catch(err => {
        const message = (err && err.message) || 'Report email failed. Please contact administration.'
        console.error('sendReportReady failed:', message)
      })
  }
  return savedReport
}

module.exports = { startInterview, saveAnswer, completeInterview, logProctoringEvent, generateReport }
