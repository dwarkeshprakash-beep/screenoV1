-- Migration 053: Per-skill competency levels on users
-- Idempotent: uses ADD COLUMN IF NOT EXISTS - safe to re-run
--
-- skill_competencies   JSON object mapping a skill (as spelled in users.tags) to a
--                      competency level - one of Beginner/Intermediate/Advanced/Expert.
--                      A skill with no entry here has no competency set (shown as "N/A"
--                      in the UI). Stored as a TEXT column, same JSON-stringified pattern
--                      as tags - see utils/parse.js normalizeCompetencyMap(). No FK/enum
--                      constraint - validation lives in backend services, not the DB.

ALTER TABLE users ADD COLUMN IF NOT EXISTS skill_competencies TEXT;
