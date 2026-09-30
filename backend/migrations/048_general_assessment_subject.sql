-- 048_general_assessment_subject.sql
-- A general assessment (scheduled with no client mandate or monthly assessment) had
-- nothing to steer question generation beyond the candidate's resume, and nothing
-- recorded what it covered. These columns hold that context on the interview itself.
-- Client-mandate and monthly interviews keep reading their context from the linked
-- row; these columns are only the fallback when neither link is set.
--
--   subject_name   what the assessment is about, e.g. "React" (shown as its title)
--   focus_areas    JSON array of sub-topics, same shape as monthly_assessments.sub_topics
--   context_notes  optional brief / JD text passed to the question generator
--
-- Existing rows stay NULL and behave exactly as before. Safe to re-run.

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS subject_name  VARCHAR(200);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS focus_areas   TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS context_notes TEXT;
