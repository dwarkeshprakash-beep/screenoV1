-- Migration 003: Missing columns for client templates, monthly assessments, bench status
-- Idempotent: uses ADD COLUMN IF NOT EXISTS — safe to re-run

-- users: bench / client_side availability status
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability VARCHAR(20) DEFAULT 'bench';

-- interviews: link to client template (nullable — only set when scheduled via a client template)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS client_template_id INT;

-- interviews: link to monthly assessment (nullable — only set when scheduled from an enrollment)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS monthly_assessment_id INT;

-- interviews: JD text used for this specific interview (inherited from template or manually entered at schedule time)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS jd_text TEXT;

-- interviews: human interviewer assigned to this interview (for human/livekit interviews)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interviewer_id INT;

-- client_templates: deadline for team members to update resume after receiving JD
ALTER TABLE client_templates ADD COLUMN IF NOT EXISTS resume_deadline TIMESTAMPTZ;

-- monthly_assessment_enrollments: actual interview_id created when the month-end interview is scheduled
ALTER TABLE monthly_assessment_enrollments ADD COLUMN IF NOT EXISTS interview_id INT;
