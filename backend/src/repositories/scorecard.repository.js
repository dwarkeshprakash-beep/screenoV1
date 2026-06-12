// backend/src/repositories/scorecard.repository.js
const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO scorecards
       (interview_id, overall, confidence, tech_knowledge, communication, problem_solving, decision, reason)
     VALUES
       (@interview_id, @overall, @confidence, @tech_knowledge, @communication, @problem_solving, @decision, @reason)
     RETURNING *`,
    {
      interview_id:    data.interviewId,
      overall:         data.overall,
      confidence:      data.confidence,
      tech_knowledge:  data.techKnowledge,
      communication:   data.communication,
      problem_solving: data.problemSolving,
      decision:        data.decision,
      reason:          data.reason
    }
  )
  return rows[0]
}

// Upsert scorecard for an interview (one per interview in the new schema)
async function upsert(data) {
  const existing = await getByInterview(data.interviewId)
  if (existing) {
    const rows = await db.query(
      `UPDATE scorecards SET
         overall = COALESCE(@overall, overall),
         confidence = COALESCE(@confidence, confidence),
         tech_knowledge = COALESCE(@tech_knowledge, tech_knowledge),
         communication = COALESCE(@communication, communication),
         problem_solving = COALESCE(@problem_solving, problem_solving),
         decision = @decision,
         reason = @reason
       WHERE interview_id = @interview_id
       RETURNING *`,
      {
        interview_id:    data.interviewId,
        overall:         data.overall ?? null,
        confidence:      data.confidence ?? null,
        tech_knowledge:  data.techKnowledge ?? null,
        communication:   data.communication ?? null,
        problem_solving: data.problemSolving ?? null,
        decision:        data.decision,
        reason:          data.reason,
      }
    )
    return rows[0]
  }
  return create(data)
}

async function getByInterview(interviewId) {
  const rows = await db.query(
    `SELECT * FROM scorecards WHERE interview_id = @interviewId ORDER BY created DESC LIMIT 1`,
    { interviewId }
  )
  return rows[0] || null
}

// Alias for interviewer routes — same as getByInterview (one scorecard per interview now)
async function getByInterviewForInterviewer(interviewId, _interviewerId) {
  return getByInterview(interviewId)
}

module.exports = { create, upsert, getByInterview, getByInterviewForInterviewer }
