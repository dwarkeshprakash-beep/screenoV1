// backend/src/repositories/scorecard.repository.js
const db = require('../db/connection')

// Upsert scorecard for an interview (one per interview in the new schema)
async function upsert(data) {
  const rows = await db.query(
    `INSERT INTO scorecards
       (interview_id, overall, confidence, tech_knowledge, communication, problem_solving, decision, reason)
     VALUES
       (@interview_id, @overall, @confidence, @tech_knowledge, @communication, @problem_solving, @decision, @reason)
     ON CONFLICT (interview_id) DO UPDATE SET
       overall         = COALESCE(EXCLUDED.overall,         scorecards.overall),
       confidence      = COALESCE(EXCLUDED.confidence,      scorecards.confidence),
       tech_knowledge  = COALESCE(EXCLUDED.tech_knowledge,  scorecards.tech_knowledge),
       communication   = COALESCE(EXCLUDED.communication,   scorecards.communication),
       problem_solving = COALESCE(EXCLUDED.problem_solving, scorecards.problem_solving),
       decision        = EXCLUDED.decision,
       reason          = EXCLUDED.reason
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

async function getByInterview(interviewId) {
  const rows = await db.query(
    `SELECT * FROM scorecards WHERE interview_id = @interviewId ORDER BY created DESC LIMIT 1`,
    { interviewId }
  )
  return rows[0] || null
}

module.exports = { upsert, getByInterview }
