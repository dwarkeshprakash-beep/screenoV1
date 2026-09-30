// backend/src/services/question-context.service.js
// What the LLM is told an interview is about, shared by initial question generation
// (AI voice + exam) and adaptive follow-ups so all three see the same syllabus.
//
// Subject-based interviews (monthly subjects, general assessments) are "subjectFocused":
// questions must test the subject and its sub-topics, and the resume only sets depth.
// Client-mandate interviews keep the JD + tags + resume behavior.
const monthlyAssessmentRepository = require('../repositories/monthly-assessment.repository')
const { parseStoredArray } = require('../utils/parse')

/**
 * @param {object} interview - a row carrying the INTERVIEW_COLS context fields
 * @returns {Promise<{ subject: string|null, focusAreas: string[], material: string,
 *   fileName: string|null, fileText: string, subjectFocused: boolean }>}
 */
async function buildQuestionContext(interview) {
  if (interview.monthly_assessment_id) {
    const subject = await monthlyAssessmentRepository.getQuestionContext(interview.monthly_assessment_id)
    if (subject) {
      return {
        subject: subject.subject_name || null,
        focusAreas: parseStoredArray(subject.sub_topics),
        material: subject.ai_generated_jd || '',
        fileName: subject.study_material_file_name || null,
        fileText: subject.study_file_text || '',
        subjectFocused: true,
      }
    }
  }

  // General assessments carry their subject on the interview; mandates never do.
  const subjectFocused = !interview.client_template_id && Boolean(interview.subject_name)
  return {
    subject: subjectFocused ? interview.subject_name : null,
    focusAreas: parseStoredArray(interview.context_focus_areas),
    material: interview.context_text || '',
    fileName: null,
    fileText: '',
    subjectFocused,
  }
}

module.exports = { buildQuestionContext }
