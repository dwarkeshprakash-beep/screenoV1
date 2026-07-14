-- Optional report recipients stored on reusable interview-flow definitions.
-- NULL preserves the legacy behavior (manager receives reports); [] means no recipients.

ALTER TABLE interview_flows ADD COLUMN IF NOT EXISTS report_user_ids TEXT;
