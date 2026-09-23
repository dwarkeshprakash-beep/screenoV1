// backend/src/repositories/client-template.repository.js
const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO client_templates
      (manager_id, created_by_user_id, assigned_bde_id, client_name, client_email, headcount, requirements, jd_text, jd_file_path, jd_original_filename, custom_info, tags, resume_deadline)
     VALUES
      (@manager_id, @created_by_user_id, @assigned_bde_id, @client_name, @client_email, @headcount, @requirements, @jd_text, @jd_file_path, @jd_original_filename, @custom_info, @tags, @resume_deadline)
     RETURNING *`,
    {
      manager_id:         data.manager_id,
      created_by_user_id: data.created_by_user_id || data.manager_id,
      assigned_bde_id:    data.assigned_bde_id || null,
      client_name:     data.client_name,
      client_email:    data.client_email    || null,
      headcount:       data.headcount       || 1,
      requirements:    data.requirements    || '',
      jd_text:         data.jd_text         || '',
      jd_file_path:         data.jd_file_path         || null,
      jd_original_filename: data.jd_original_filename || null,
      custom_info:     data.custom_info     || '',
      tags:            typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags || []),
      resume_deadline: data.resume_deadline || null,
    }
  )
  return rows[0]
}

async function getByManager(managerId, state = 'active') {
  let query = `SELECT client_templates.*,
                      COALESCE((
                        SELECT STRING_AGG(
                          CONCAT_WS(' ', users.first_name, users.last_name, users.email),
                          ' '
                        )
                        FROM client_teams
                        JOIN users ON users.id = client_teams.user_id
                        WHERE client_teams.mandate_id = client_templates.id
                      ), '') AS candidate_search_text,
                      (
                        SELECT h.status FROM mandate_status_history h
                        WHERE h.mandate_id = client_templates.id
                        ORDER BY h.created DESC LIMIT 1
                      ) AS current_status
               FROM client_templates
               WHERE manager_id = @managerId`
  if (state === 'active') {
    query += ` AND archived_at IS NULL`
  } else if (state === 'archived') {
    query += ` AND archived_at IS NOT NULL`
  }
  query += ` ORDER BY COALESCE(updated_at, created) DESC, created DESC`
  return db.query(query, { managerId })
}

async function getById(id, managerId) {
  const rows = await db.query(
    `SELECT * FROM client_templates WHERE id = @id AND manager_id = @managerId`,
    { id, managerId }
  )
  return rows[0] || null
}

// Self-scoped "View" tier - a plain owner (manager_id), a creator, an assigned
// collaborator (assigned_bde_id), or anyone added as a participant on the mandate's
// client team (client_teams) can see it. Replaces the old getByCreator (which only
// covered created_by_user_id/assigned_bde_id) now that visibility is driven by the
// client_mandates ACL permission rather than a fixed manager/bde portal split.
async function getVisibleToUser(userId, state = 'active') {
  let query = `SELECT client_templates.*,
                      COALESCE((
                        SELECT STRING_AGG(
                          CONCAT_WS(' ', users.first_name, users.last_name, users.email),
                          ' '
                        )
                        FROM client_teams
                        JOIN users ON users.id = client_teams.user_id
                        WHERE client_teams.mandate_id = client_templates.id
                      ), '') AS candidate_search_text,
                      (
                        SELECT h.status FROM mandate_status_history h
                        WHERE h.mandate_id = client_templates.id
                        ORDER BY h.created DESC LIMIT 1
                      ) AS current_status
               FROM client_templates
               WHERE (
                 manager_id = @userId
                 OR created_by_user_id = @userId
                 OR assigned_bde_id = @userId
                 OR EXISTS (
                   SELECT 1 FROM client_teams ct
                   WHERE ct.mandate_id = client_templates.id AND ct.user_id = @userId
                 )
               )`
  if (state === 'active') {
    query += ` AND archived_at IS NULL`
  } else if (state === 'archived') {
    query += ` AND archived_at IS NOT NULL`
  }
  query += ` ORDER BY COALESCE(updated_at, created) DESC, created DESC`
  return db.query(query, { userId })
}

async function getByIdVisibleToUser(id, userId) {
  const rows = await db.query(
    `SELECT * FROM client_templates
     WHERE id = @id AND (
       manager_id = @userId
       OR created_by_user_id = @userId
       OR assigned_bde_id = @userId
       OR EXISTS (
         SELECT 1 FROM client_teams ct WHERE ct.mandate_id = client_templates.id AND ct.user_id = @userId
       )
     )`,
    { id, userId }
  )
  return rows[0] || null
}

// Company-wide "View All" tier - every mandate owned, created, or collaborated on by
// anyone in the caller's company. client_templates has no direct company_id column,
// so company membership is resolved through whichever of the three owner-ish columns
// is set, via users.company_id.
async function getByCompany(companyId, state = 'active') {
  let query = `SELECT client_templates.*,
                      COALESCE((
                        SELECT STRING_AGG(
                          CONCAT_WS(' ', users.first_name, users.last_name, users.email),
                          ' '
                        )
                        FROM client_teams
                        JOIN users ON users.id = client_teams.user_id
                        WHERE client_teams.mandate_id = client_templates.id
                      ), '') AS candidate_search_text,
                      (
                        SELECT h.status FROM mandate_status_history h
                        WHERE h.mandate_id = client_templates.id
                        ORDER BY h.created DESC LIMIT 1
                      ) AS current_status
               FROM client_templates
               WHERE EXISTS (
                 SELECT 1 FROM users u
                 WHERE u.company_id = @companyId
                   AND u.id IN (
                     client_templates.manager_id,
                     client_templates.created_by_user_id,
                     client_templates.assigned_bde_id
                   )
               )`
  if (state === 'active') {
    query += ` AND archived_at IS NULL`
  } else if (state === 'archived') {
    query += ` AND archived_at IS NOT NULL`
  }
  query += ` ORDER BY COALESCE(updated_at, created) DESC, created DESC`
  return db.query(query, { companyId })
}

async function getByIdForCompany(id, companyId) {
  const rows = await db.query(
    `SELECT * FROM client_templates
     WHERE id = @id AND EXISTS (
       SELECT 1 FROM users u
       WHERE u.company_id = @companyId
         AND u.id IN (
           client_templates.manager_id,
           client_templates.created_by_user_id,
           client_templates.assigned_bde_id
         )
     )`,
    { id, companyId }
  )
  return rows[0] || null
}

async function update(id, managerId, data) {
  const rows = await db.query(
    `UPDATE client_templates
     SET client_name          = COALESCE(@client_name,          client_name),
         client_email         = COALESCE(@client_email,         client_email),
         headcount            = COALESCE(@headcount,            headcount),
         requirements         = COALESCE(@requirements,         requirements),
         jd_text              = COALESCE(@jd_text,              jd_text),
         jd_file_path         = COALESCE(@jd_file_path,         jd_file_path),
         jd_original_filename = COALESCE(@jd_original_filename, jd_original_filename),
         custom_info          = COALESCE(@custom_info,          custom_info),
         tags                 = COALESCE(@tags,                 tags),
         resume_deadline      = COALESCE(@resume_deadline,      resume_deadline),
         assigned_bde_id      = COALESCE(@assigned_bde_id,      assigned_bde_id),
         updated_at           = CURRENT_TIMESTAMP
     WHERE id = @id AND manager_id = @managerId
     RETURNING *`,
    {
      id,
      managerId,
      client_name:     data.client_name     || null,
      client_email:    data.client_email    || null,
      headcount:       data.headcount       || null,
      requirements:    data.requirements    || null,
      jd_text:         data.jd_text         || null,
      jd_file_path:         data.jd_file_path         || null,
      jd_original_filename: data.jd_original_filename || null,
      custom_info:     data.custom_info     || null,
      tags:            data.tags ? (typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) : null,
      resume_deadline: data.resume_deadline || null,
      assigned_bde_id: data.assigned_bde_id || null,
    }
  )
  return rows[0]
}

async function archive(id, managerId) {
  const rows = await db.query(
    `UPDATE client_templates
     SET archived_at = NOW(), updated_at = CURRENT_TIMESTAMP
     WHERE id = @id AND manager_id = @managerId RETURNING *`,
    { id, managerId }
  )
  return rows[0] || null
}

async function restore(id, managerId) {
  const rows = await db.query(
    `UPDATE client_templates
     SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = @id AND manager_id = @managerId RETURNING *`,
    { id, managerId }
  )
  return rows[0] || null
}

async function getAllForAdmin() {
  return db.query(
    `SELECT
       ct.id, ct.client_name, ct.requirements, ct.headcount, ct.created, ct.archived_at,
       u.id AS manager_id,
       u.first_name AS manager_first_name,
       u.last_name AS manager_last_name,
       u.email AS manager_email,
       c.name AS company_name,
       (SELECT COUNT(*) FROM client_teams team WHERE team.mandate_id = ct.id) AS candidate_count,
       (SELECT COUNT(*) FROM interviews i WHERE i.client_template_id = ct.id) AS interview_count,
       (SELECT COUNT(*) FROM interviews i WHERE i.client_template_id = ct.id AND i.status = 'in_progress') AS active_interview_count
     FROM client_templates ct
     JOIN users u ON u.id = ct.manager_id
     LEFT JOIN companies c ON c.id = u.company_id
     ORDER BY ct.created DESC`,
    {}
  )
}

module.exports = {
  create, getByManager, getById,
  getVisibleToUser, getByIdVisibleToUser, getByCompany, getByIdForCompany,
  update, archive, restore, getAllForAdmin,
}
