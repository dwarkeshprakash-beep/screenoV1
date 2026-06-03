-- SSMS Migration 002: candidate_notes table
-- Run in SQL Server Management Studio (SSMS) against your Screeno database

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'candidate_notes')
BEGIN
  CREATE TABLE candidate_notes (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    candidate_id INT NOT NULL,
    manager_id   INT NOT NULL,
    note         NVARCHAR(MAX) NOT NULL,
    created      DATETIME2 DEFAULT GETUTCDATE()
  );

  CREATE INDEX idx_notes_candidate ON candidate_notes(candidate_id);

  PRINT 'candidate_notes table created.';
END
ELSE
  PRINT 'candidate_notes table already exists — skipped.';
