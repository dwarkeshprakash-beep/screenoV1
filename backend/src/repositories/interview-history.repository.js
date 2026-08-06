const db = require('../db/connection')

async function getPlatformHistory(managerId, userId = null) {
  const userFilter = userId == null ? '' : 'AND i.internal_user_id = @userId'
  return db.query(
    `SELECT
       i.id,
       'platform_interview' AS record_kind,
       CASE WHEN i.internal_user_id IS NOT NULL THEN 'internal' ELSE 'external' END AS candidate_kind,
       COALESCE(i.internal_user_id, i.external_candidate_id) AS candidate_id,
       COALESCE(iu.first_name, ec.first_name) AS candidate_first,
       COALESCE(iu.last_name, ec.last_name) AS candidate_last,
       COALESCE(iu.email, ec.email) AS candidate_email,
       CASE
         WHEN i.client_template_id IS NOT NULL THEN 'client_mandate'
         WHEN i.monthly_assessment_id IS NOT NULL THEN 'monthly_assessment'
         ELSE 'other'
       END AS history_source,
       ct.client_name AS company_name,
       COALESCE(cmr.profile_name, ct.requirements, ma.subject_name) AS role_name,
       COALESCE(ct.client_name, ma.subject_name, 'General interview') AS context_title,
       i.type,
       i.interview_mode,
       i.difficulty,
       i.status,
       i.result,
       i.question_count,
       i.duration_minutes,
       i.scheduled_at,
       i.available_from,
       i.due_at,
       i.started_at,
       i.ended_at,
       i.location,
       i.meeting_url,
       i.created,
       sc.overall AS overall_score,
       sc.decision,
       sc.reason,
       NULL AS feedback,
       NULL AS manager_notes,
       NULL AS round_number
     FROM interviews i
     LEFT JOIN users iu ON iu.id = i.internal_user_id
     LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
     LEFT JOIN client_templates ct ON ct.id = i.client_template_id
     LEFT JOIN monthly_assessments ma ON ma.id = i.monthly_assessment_id
     LEFT JOIN client_teams cteam ON cteam.id = i.client_team_id
     LEFT JOIN client_mandate_requirements cmr ON cmr.id = cteam.requirement_id
     LEFT JOIN scorecards sc ON sc.interview_id = i.id
     WHERE i.manager_id = @managerId
       ${userFilter}
     ORDER BY COALESCE(i.scheduled_at, i.created) DESC`,
    { managerId, ...(userId == null ? {} : { userId }) }
  )
}

async function getClientRoundHistory(managerId, userId = null) {
  const userFilter = userId == null ? '' : 'AND cteam.user_id = @userId'
  return db.query(
    `SELECT
       cr.id,
       'client_round' AS record_kind,
       'internal' AS candidate_kind,
       cteam.user_id AS candidate_id,
       u.first_name AS candidate_first,
       u.last_name AS candidate_last,
       u.email AS candidate_email,
       'client_mandate' AS history_source,
       ct.client_name AS company_name,
       COALESCE(cmr.profile_name, ct.requirements) AS role_name,
       ct.client_name AS context_title,
       'client_round' AS type,
       NULL AS interview_mode,
       NULL AS difficulty,
       cr.outcome AS status,
       cr.outcome AS result,
       NULL AS question_count,
       NULL AS duration_minutes,
       cr.interview_at AS scheduled_at,
       NULL AS available_from,
       NULL AS due_at,
       NULL AS started_at,
       NULL AS ended_at,
       NULL AS location,
       NULL AS meeting_url,
       cr.created,
       NULL AS overall_score,
       NULL AS decision,
       NULL AS reason,
       cr.feedback,
       cr.manager_notes,
       cr.round_number
     FROM client_interview_rounds cr
     JOIN client_teams cteam ON cteam.id = cr.client_team_id
     JOIN client_templates ct ON ct.id = cteam.mandate_id
     JOIN users u ON u.id = cteam.user_id
     LEFT JOIN client_mandate_requirements cmr ON cmr.id = cteam.requirement_id
     WHERE ct.manager_id = @managerId
       ${userFilter}
     ORDER BY COALESCE(cr.interview_at, cr.created) DESC`,
    { managerId, ...(userId == null ? {} : { userId }) }
  )
}

async function getByManager(managerId, userId = null) {
  const [platform, clientRounds] = await Promise.all([
    getPlatformHistory(managerId, userId),
    getClientRoundHistory(managerId, userId),
  ])
  return [...platform, ...clientRounds].sort((a, b) => {
    const aDate = new Date(a.scheduled_at || a.created || 0).getTime()
    const bDate = new Date(b.scheduled_at || b.created || 0).getTime()
    return bDate - aDate
  })
}

module.exports = { getByManager }
