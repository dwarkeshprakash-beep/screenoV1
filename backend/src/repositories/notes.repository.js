// backend/src/repositories/notes.repository.js
// SQL queries for the candidate_notes table.
// Notes are linked to team_members.id (the roster relationship) so they persist
// even if the candidate record is replaced.

const db = require('../db/connection')

/**
 * Get all notes for a team member, newest first.
 * @param {number} teamMemberId - team_members.id
 * @returns {Promise<Array>}
 */
async function getNotes(teamMemberId) {
  return db.query(
    `SELECT * FROM candidate_notes
     WHERE team_member_id = @team_member_id
     ORDER BY created DESC`,
    { team_member_id: teamMemberId }
  )
}

/**
 * Insert a new note for a team member.
 * @param {number} teamMemberId - team_members.id
 * @param {number|null} candidateId - candidates.id (may be null before any interview)
 * @param {number} managerId
 * @param {string} note
 * @returns {Promise<Object>}
 */
async function createNote(teamMemberId, candidateId, managerId, note) {
  const rows = await db.query(
    `INSERT INTO candidate_notes (team_member_id, candidate_id, manager_id, note)
     VALUES (@team_member_id, @candidate_id, @manager_id, @note)
     RETURNING *`,
    {
      team_member_id: teamMemberId,
      candidate_id:   candidateId || null,
      manager_id:     managerId,
      note,
    }
  )
  return rows[0]
}

module.exports = { getNotes, createNote }
