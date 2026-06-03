-- SSMS Migration 003: exam question columns on questions table
-- Run in SQL Server Management Studio (SSMS) against your Screeno database

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('questions') AND name = 'question_type')
BEGIN
  ALTER TABLE questions ADD question_type NVARCHAR(20) DEFAULT 'open';
  PRINT 'Added question_type column.';
END
ELSE
  PRINT 'question_type already exists — skipped.';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('questions') AND name = 'options')
BEGIN
  ALTER TABLE questions ADD options NVARCHAR(MAX);
  PRINT 'Added options column.';
END
ELSE
  PRINT 'options already exists — skipped.';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('questions') AND name = 'correct_answer')
BEGIN
  ALTER TABLE questions ADD correct_answer INT;
  PRINT 'Added correct_answer column.';
END
ELSE
  PRINT 'correct_answer already exists — skipped.';
