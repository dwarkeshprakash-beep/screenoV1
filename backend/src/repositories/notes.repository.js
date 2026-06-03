// backend/src/repositories/notes.repository.js
// SQL queries for the candidate_notes table.

const db = require('../db/connection')

/**
 * Get all notes for a candidate, newest first.
 * @param {number} candidateId
 * @returns {Promise<Array>}
 */
async function getNotes(candidateId) {
  return db.query(
    `SELECT * FROM candidate_notes
     WHERE candidate_id = @candidate_id
     ORDER BY created DESC`,
    { candidate_id: candidateId }
  )
}

/**
 * Insert a new note and return the created row.
 * @param {number} candidateId
 * @param {number} managerId
 * @param {string} note
 * @returns {Promise<Object>}
 */
async function createNote(candidateId, managerId, note) {
  const rows = await db.query(
    `INSERT INTO candidate_notes (candidate_id, manager_id, note)
     VALUES (@candidate_id, @manager_id, @note)
     RETURNING *`,
    { candidate_id: candidateId, manager_id: managerId, note }
  )
  return rows[0]
}

module.exports = { getNotes, createNote }
