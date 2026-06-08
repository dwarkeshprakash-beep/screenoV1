-- SSMS Migration 007: coding question columns on questions table
-- Run in SQL Server Management Studio (SSMS) against your Screeno database

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('questions') AND name = 'language')
BEGIN
  ALTER TABLE questions ADD language NVARCHAR(20);
  PRINT 'Added language column.';
END
ELSE
  PRINT 'language already exists — skipped.';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('questions') AND name = 'starter_code')
BEGIN
  ALTER TABLE questions ADD starter_code NVARCHAR(MAX);
  PRINT 'Added starter_code column.';
END
ELSE
  PRINT 'starter_code already exists — skipped.';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('questions') AND name = 'test_cases')
BEGIN
  ALTER TABLE questions ADD test_cases NVARCHAR(MAX);
  PRINT 'Added test_cases column.';
END
ELSE
  PRINT 'test_cases already exists — skipped.';
