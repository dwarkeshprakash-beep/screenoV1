-- Run in Supabase SQL Editor before testing exam feature
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) DEFAULT 'open';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer INT;
