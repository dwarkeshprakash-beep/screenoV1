-- 050_monthly_study_material_text.sql
-- Text extracted from a monthly subject's uploaded study-material file (see 049), so
-- question generation can use the file's contents and not just the free-text material.
--
-- Kept in its own table rather than a column on monthly_assessments: the text can be
-- large, and subject rows are returned wholesale by the list/plan/calendar endpoints.
-- Only the question-context lookup reads this table.
--
--   assessment_id  monthly_assessments.id (one row per subject, no FK by project rule)
--   file_path      the study_material_file_path this text was extracted from
--   file_text      extracted plain text (capped in the service), '' when unreadable
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS monthly_assessment_study_texts (
  assessment_id INTEGER PRIMARY KEY,
  file_path     VARCHAR(500) NOT NULL,
  file_text     TEXT NOT NULL DEFAULT '',
  updated       TIMESTAMP NOT NULL DEFAULT NOW()
);
