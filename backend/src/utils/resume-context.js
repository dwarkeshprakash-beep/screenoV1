// backend/src/utils/resume-context.js
// Builds the candidate-resume prompt context shared by AI interview and exam generation.

const { parseStoredArray } = require('./parse')

/**
 * Summarise the candidate's resume text, resume file URL, and profile tags for an LLM prompt.
 * @param {{candidate_resume_text?: string, candidate_resume_url?: string, candidate_tags?: any}} interview
 * @returns {string|null} null when there is nothing to include
 */
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

module.exports = { buildResumeContext }
