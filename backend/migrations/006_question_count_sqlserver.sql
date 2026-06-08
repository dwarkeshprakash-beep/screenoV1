-- Migration 006 — SQL Server (SSMS)
-- Add question_count column to interviews table — lets managers set how many
-- questions an interview should target when scheduling (static count, or
-- adaptive exchange target).

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('interviews') AND name = 'question_count'
)
BEGIN
  ALTER TABLE interviews ADD question_count INT DEFAULT 10;
END
