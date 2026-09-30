-- 049_monthly_study_material_file.sql
-- Lets a manager attach a study-material document (PDF/DOC/DOCX/PPT/PPTX/TXT) to a
-- monthly subject, alongside the existing free-text study material (ai_generated_jd).
-- Enrolled candidates open it through a short-lived signed URL.
--
--   study_material_file_path  Supabase Storage path, e.g. "study-material/12/<uuid>.pdf"
--   study_material_file_name  original filename shown to managers and candidates
--
-- Existing rows stay NULL (no file attached). Safe to re-run.

ALTER TABLE monthly_assessments ADD COLUMN IF NOT EXISTS study_material_file_path VARCHAR(500);
ALTER TABLE monthly_assessments ADD COLUMN IF NOT EXISTS study_material_file_name VARCHAR(255);
