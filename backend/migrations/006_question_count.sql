-- Migration 006 — Supabase (PostgreSQL)
-- Add question_count column to interviews table — lets managers set how many
-- questions an interview should target when scheduling (static count, or
-- adaptive exchange target).

ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS question_count INT DEFAULT 10;
