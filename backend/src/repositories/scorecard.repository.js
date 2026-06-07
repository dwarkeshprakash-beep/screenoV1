const db = require('../db/connection')

async function upsert(data) {
  const rows = await db.query(
    `INSERT INTO scorecards
       (interview_id, candidate_id, interviewer_id, overall, confidence,
        tech_knowledge, communication, problem_solving, evidence, decision, reason)
     VALUES
       (@interviewId, @candidateId, @interviewerId, @overall, @confidence,
        @techKnowledge, @communication, @problemSolving, @evidence, @decision, @reason)
     ON CONFLICT (interview_id, interviewer_id)
     DO UPDATE SET
       overall = EXCLUDED.overall, confidence = EXCLUDED.confidence,
       tech_knowledge = EXCLUDED.tech_knowledge, communication = EXCLUDED.communication,
       problem_solving = EXCLUDED.problem_solving, evidence = EXCLUDED.evidence,
       decision = EXCLUDED.decision, reason = EXCLUDED.reason, updated = NOW()
     RETURNING *`,
    data
  )
  return rows[0]
}

async function getByInterviewForInterviewer(interviewId, interviewerId) {
  const rows = await db.query(
    `SELECT * FROM scorecards
     WHERE interview_id = @interviewId AND interviewer_id = @interviewerId`,
    { interviewId, interviewerId }
  )
  return rows[0] || null
}

module.exports = { upsert, getByInterviewForInterviewer }
