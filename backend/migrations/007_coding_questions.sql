-- Run in Supabase SQL Editor — adds coding-question support to the questions table.
-- 'coding' becomes a third question_type alongside 'mcq' and 'open'.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS language VARCHAR(20);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS starter_code TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS test_cases TEXT;
