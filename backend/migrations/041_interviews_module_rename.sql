-- Interviews module now covers both "interviews I'm the subject of" and "interviews
-- I'm assigned to conduct" in one merged page - renaming rather than adding a fresh
-- row preserves any ACL grants roles already hold on the old key.
UPDATE modules SET key = 'interviews', name = 'Interviews' WHERE key = 'interviewer_assignments';
