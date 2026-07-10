-- Migration: 015_role_level_jd_and_deadline.sql
-- Store JD text and resume deadlines on each mandate role/profile.

ALTER TABLE client_templates
ADD COLUMN IF NOT EXISTS resume_deadline TIMESTAMPTZ;

ALTER TABLE client_mandate_requirements
ADD COLUMN IF NOT EXISTS jd_text TEXT,
ADD COLUMN IF NOT EXISTS resume_deadline TIMESTAMPTZ;

-- Preserve existing mandate-level data as a fallback for already-created roles.
UPDATE client_mandate_requirements cmr
SET jd_text = COALESCE(cmr.jd_text, NULLIF(ct.jd_text, '')),
    resume_deadline = COALESCE(cmr.resume_deadline, ct.resume_deadline)
FROM client_templates ct
WHERE ct.id = cmr.mandate_id
  AND (cmr.jd_text IS NULL OR cmr.resume_deadline IS NULL);
