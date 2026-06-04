-- Migration 004 — SQL Server (SSMS)
-- Add pdf_url column to reports table for storing the Cloudinary PDF link.

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('reports') AND name = 'pdf_url'
)
BEGIN
  ALTER TABLE reports ADD pdf_url NVARCHAR(MAX);
END
