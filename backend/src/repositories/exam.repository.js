const db = require('../db/connection')

async function submit(interviewId, answers) {
  return db.transaction(async (tx) => {
    for (const answer of answers) {
      const rows = await tx.query(
        `UPDATE transcripts
         SET answer = @answer
         WHERE id = @questionId
           AND interview_id = @interviewId
           AND COALESCE(TRIM(answer), '') = ''
         RETURNING id`,
        {
          interviewId,
          questionId: answer.questionId,
          answer: answer.answer,
        }
      )
      if (!rows[0]) throw new Error('Invalid question submission')
    }
    await tx.query(
      `UPDATE interviews
       SET status = 'completed', result = 'success', ended_at = NOW()
       WHERE id = @interviewId AND status <> 'completed'`,
      { interviewId }
    )
  })
}

module.exports = { submit }
