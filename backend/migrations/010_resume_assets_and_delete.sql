-- 010_resume_assets_and_delete.sql
-- Migration to introduce resume_assets and permanent deletion metadata

CREATE TABLE IF NOT EXISTS resume_assets (
  id SERIAL PRIMARY KEY,
  owner_user_id INT NOT NULL,
  purpose VARCHAR(50) NOT NULL DEFAULT 'profile', -- 'profile' or 'mandate_submission'
  client_team_id INT, -- null if purpose='profile'
  mandate_id INT, -- null if purpose='profile'
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size INT,
  storage_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_resume_asset_id INT;
ALTER TABLE client_teams ADD COLUMN IF NOT EXISTS submitted_resume_asset_id INT;

-- Backfill existing resumes as profile assets
INSERT INTO resume_assets (owner_user_id, purpose, original_filename, storage_path, created_at)
SELECT id, 'profile', 'resume.pdf', resume_url, resume_updated
FROM users
WHERE resume_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM resume_assets a
    WHERE a.owner_user_id = users.id
      AND a.purpose = 'profile'
      AND a.storage_path = users.resume_url
  );

-- Link users to their newly created backfilled assets
UPDATE users u
SET current_resume_asset_id = a.id
FROM resume_assets a
WHERE a.owner_user_id = u.id AND a.purpose = 'profile' AND u.resume_url IS NOT NULL;

-- Backfill client_teams with snapshot assets from the current resume
-- This assumes existing submissions simply copied the URL.
INSERT INTO resume_assets (owner_user_id, purpose, client_team_id, mandate_id, original_filename, storage_path, created_at)
SELECT ct.user_id, 'mandate_submission', ct.id, ct.mandate_id, 'resume.pdf', ct.client_resume_url, ct.created
FROM client_teams ct
WHERE ct.client_resume_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM resume_assets a
    WHERE a.client_team_id = ct.id
      AND a.purpose = 'mandate_submission'
      AND a.storage_path = ct.client_resume_url
  );

UPDATE client_teams ct
SET submitted_resume_asset_id = a.id
FROM resume_assets a
WHERE a.client_team_id = ct.id AND a.purpose = 'mandate_submission' AND ct.client_resume_url IS NOT NULL;

-- Optionally, we can drop the old URL columns later, but we'll leave them for now for safety.
