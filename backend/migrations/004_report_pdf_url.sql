-- Migration 004 — Supabase (PostgreSQL)
-- Add pdf_url column to reports table for storing the Cloudinary PDF link.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;
