const interviewRepository = require('../repositories/interview.repository')
const transcriptRepository = require('../repositories/transcript.repository')
const examRepository = require('../repositories/exam.repository')
const reportJobRepository = require('../repositories/report-job.repository')
const reportRepository = require('../repositories/report.repository')
const scorecardRepository = require('../repositories/scorecard.repository')
const llmService = require('./llm.service')
const judgeService = require('./judge.service')
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

function validateInterview(interview) {
  if (!interview || interview.type !== 'exam') throw new Error('Invalid or expired link')
  if (!interview.token_expires || new Date(interview.token_expires) < new Date()) {
    throw new Error('Invalid or expired link')
  }
}

function publicQuestion(question) {
  const {
    answer,
    correct_answer,
    reference_solution,
    ...safe
  } = question
  if (Array.isArray(safe.test_cases)) {
    safe.test_cases = safe.test_cases.map(testCase =>
      testCase.hidden ? { hidden: true } : testCase
    )
  }
  return safe
}

function getDurationSeconds(interview) {
  const configured = Number(interview.duration_minutes)
  if (Number.isInteger(configured) && configured > 0) return configured * 60
  const qCount = Number(interview.question_count) || 10
  return Math.min(90 * 60, Math.max(15 * 60, qCount * 4 * 60))
}

async function getExam(token) {
  const interview = await interviewRepository.getByToken(token)
  validateInterview(interview)
  if (interview.status === 'completed') throw new Error('Exam already completed')

  let questions = await transcriptRepository.getQuestionRecords(interview.id)
  if (questions.length === 0) {
    const generated = await llmService.generateExamQuestions({
      resume: buildResumeContext(interview),
      jd: interview.context_text,
      focusAreas: interview.context_focus_areas,
      difficulty: interview.difficulty,
      count: interview.question_count || 10,
    })
    questions = await transcriptRepository.createQuestionRecords(interview.id, generated)
  }
  if (interview.status === 'scheduled') await interviewRepository.markStarted(interview.id)

  return {
    interview: {
      id: interview.id,
      type: interview.type,
      interviewMode: interview.interview_mode,
      difficulty: interview.difficulty,
      questionCount: interview.question_count || 10,
      durationMinutes: interview.duration_minutes || Math.round(getDurationSeconds(interview) / 60),
    },
    questions: questions.map(publicQuestion),
  }
}

async function completeTimedOutBlankExam(interview) {
  await interviewRepository.markCompleted(interview.id, 'timed_out')
  const scorecard = await scorecardRepository.upsert({
    interviewId: interview.id,
    overall: 0,
    confidence: 0,
    techKnowledge: 0,
    communication: 0,
    problemSolving: 0,
    decision: 'fail',
    reason: 'Exam timed out with no submitted answers.',
  })
  const report = await reportRepository.upsertGenerating({
    interviewId: interview.id,
    scorecardId: scorecard.id,
    summary: 'Exam timed out with no submitted answers.',
    strengths: ['Review the assessment topics and retry under the configured time window.'],
  })
  await reportRepository.updateStatus(report.id, 'ready')
  const job = await reportJobRepository.create(interview.id)
  await reportJobRepository.markCompleted(job.id)
  return { completed: true, timedOut: true }
}

async function formatCodingAnswer(question, submitted) {
  const code = String(submitted.code || '').trim()
  if (!code) return ''

  const testCases = Array.isArray(question.test_cases) ? question.test_cases : []
  if (testCases.length === 0) return `Code submission:\n${code}`

  const results = await judgeService.runTestCases(
    question.language || 'javascript',
    code,
    testCases
  )
  const visibleTotal = testCases.filter(testCase => !testCase.hidden).length
  const hiddenTotal = testCases.filter(testCase => testCase.hidden).length
  const visiblePassed = testCases
    .filter((testCase, index) => !testCase.hidden && results[index]?.passed)
    .length
  const hiddenPassed = testCases
    .filter((testCase, index) => testCase.hidden && results[index]?.passed)
    .length
  const passed = results.filter(result => result.passed).length
  const failures = results
    .map((result, index) => ({ result, index }))
    .filter(item => !item.result.passed)
    .slice(0, 3)
    .map(item => {
      const testCase = testCases[item.index]
      return testCase.hidden
        ? `hidden case ${item.index + 1}: ${item.result.error || 'wrong output'}`
        : `case ${item.index + 1}: ${item.result.error || 'wrong output'}`
    })

  return [
    `Code submission:\n${code}`,
    '',
    `Judge result: ${passed}/${testCases.length} test cases passed (${visiblePassed}/${visibleTotal} visible, ${hiddenPassed}/${hiddenTotal} hidden).`,
    failures.length > 0 ? `Failed checks: ${failures.join('; ')}` : 'All judge checks passed.',
  ].join('\n')
}

async function submitExam(token, submittedAnswers, options = {}) {
  const interview = await interviewRepository.getByToken(token)
  validateInterview(interview)
  if (interview.status === 'completed') throw new Error('Exam already completed')
  if (!Array.isArray(submittedAnswers) || submittedAnswers.length === 0) {
    if (options.timedOut === true) return completeTimedOutBlankExam(interview)
    throw new Error('At least one answer is required')
  }

  const questions = await transcriptRepository.getQuestionRecords(interview.id)
  const questionsById = new Map(questions.map(question => [Number(question.id), question]))
  const seen = new Set()
  const answers = []

  for (const submitted of submittedAnswers) {
    const questionId = Number(submitted.questionId)
    const question = questionsById.get(questionId)
    if (!question || seen.has(questionId) || question.answer) {
      throw new Error('Invalid question submission')
    }
    seen.add(questionId)

    let answer = ''
    if (question.question_type === 'mcq') {
      const selectedOption = Number(submitted.selectedOption)
      if (!Number.isInteger(selectedOption) || !question.options?.[selectedOption]) {
        throw new Error('Invalid question submission')
      }
      answer = `Selected option ${selectedOption + 1}: ${question.options[selectedOption]}`
    } else if (question.question_type === 'coding') {
      answer = await formatCodingAnswer(question, submitted)
    } else {
      answer = String(submitted.answerText || '').trim()
    }
    if (!answer) throw new Error('Invalid question submission')
    answers.push({ questionId, answer })
  }

  await examRepository.submit(interview.id, answers, options.timedOut === true ? 'timed_out' : 'success')
  await reportJobRepository.create(interview.id)
  return { completed: true, timedOut: options.timedOut === true }
}

module.exports = { getExam, submitExam, publicQuestion }
