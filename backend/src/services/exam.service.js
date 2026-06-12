const interviewRepository = require('../repositories/interview.repository')
const transcriptRepository = require('../repositories/transcript.repository')
const examRepository = require('../repositories/exam.repository')
const reportJobRepository = require('../repositories/report-job.repository')
const llmService = require('./llm.service')

function validateInterview(interview) {
  if (!interview || interview.type !== 'exam') throw new Error('Invalid or expired link')
  if (interview.token_expires && new Date(interview.token_expires) < new Date()) {
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

async function getExam(token) {
  const interview = await interviewRepository.getByToken(token)
  validateInterview(interview)
  if (interview.status === 'completed') throw new Error('Exam already completed')

  let questions = await transcriptRepository.getQuestionRecords(interview.id)
  if (questions.length === 0) {
    const generated = await llmService.generateExamQuestions({
      resume: null,
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
    },
    questions: questions.map(publicQuestion),
  }
}

async function submitExam(token, submittedAnswers) {
  const interview = await interviewRepository.getByToken(token)
  validateInterview(interview)
  if (interview.status === 'completed') throw new Error('Exam already completed')
  if (!Array.isArray(submittedAnswers) || submittedAnswers.length === 0) {
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
      answer = String(submitted.code || '').trim()
    } else {
      answer = String(submitted.answerText || '').trim()
    }
    if (!answer) throw new Error('Invalid question submission')
    answers.push({ questionId, answer })
  }

  await examRepository.submit(interview.id, answers)
  await reportJobRepository.create(interview.id)
  return { completed: true }
}

module.exports = { getExam, submitExam, publicQuestion }
