-- Migration: 025_mandate_jd_file.sql
-- Store the originally uploaded JD file (path + filename) alongside the extracted jd_text,
-- so a bad text extraction never loses the source document.

ALTER TABLE client_templates
ADD COLUMN IF NOT EXISTS jd_file_path TEXT,
ADD COLUMN IF NOT EXISTS jd_original_filename TEXT;

ALTER TABLE client_mandate_requirements
ADD COLUMN IF NOT EXISTS jd_file_path TEXT,
ADD COLUMN IF NOT EXISTS jd_original_filename TEXT;
