-- Migration 009: Flow Integrity

-- SCR-FLOW-002: Add archived_at column to client_templates
ALTER TABLE client_templates ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- SCR-FLOW-003 & 020: Requirement lifecycle integrity
-- Pre-flight: Set invalid requirement_id references to NULL (do not guess a role)
UPDATE client_teams ct
SET requirement_id = NULL
WHERE ct.requirement_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 
    FROM client_mandate_requirements cmr 
    WHERE cmr.id = ct.requirement_id AND cmr.mandate_id = ct.mandate_id
  );

-- Add composite foreign key from client_teams to client_mandate_requirements
-- Use NOT VALID initially, then validate it
ALTER TABLE client_teams 
DROP CONSTRAINT IF EXISTS fk_client_teams_requirement;

-- Add unique constraint required for composite foreign key
ALTER TABLE client_mandate_requirements 
DROP CONSTRAINT IF EXISTS client_mandate_requirements_mandate_id_id_key;

ALTER TABLE client_mandate_requirements 
ADD CONSTRAINT client_mandate_requirements_mandate_id_id_key UNIQUE (mandate_id, id);

ALTER TABLE client_teams 
ADD CONSTRAINT fk_client_teams_requirement 
FOREIGN KEY (mandate_id, requirement_id) 
REFERENCES client_mandate_requirements(mandate_id, id) 
ON DELETE RESTRICT 
NOT VALID;

ALTER TABLE client_teams VALIDATE CONSTRAINT fk_client_teams_requirement;

-- Add missing indexes for parent/child lookups
CREATE INDEX IF NOT EXISTS idx_client_teams_req ON client_teams(requirement_id);
