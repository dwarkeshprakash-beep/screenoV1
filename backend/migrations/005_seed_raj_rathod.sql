-- Migration 005: Add Raj Rathod as a demo candidate user
-- Password: Admin@1234  (hash generated with bcrypt rounds=10)
-- Run in Supabase SQL Editor

DO $$
DECLARE
  v_company_id INT;
  v_user_id    INT;
BEGIN
  -- Get company from existing manager user
  SELECT company_id INTO v_company_id
  FROM users
  WHERE email = 'kiran.oza@prakashinfotech.com'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Manager user kiran.oza@prakashinfotech.com not found. Run the base seed first.';
  END IF;

  -- Insert into users (or update if already exists)
  INSERT INTO users (company_id, first_name, last_name, email, password, role, status)
  VALUES (
    v_company_id,
    'Raj',
    'Rathod',
    'raj.rathod@gmail.com',
    '$2b$10$suAZEpH3UC/R31fyzxHp5OIxPDQh8susqAC3CXGCoa1UEDysFqBAC',
    'candidate',
    'active'
  )
  ON CONFLICT (email) DO UPDATE
    SET
      first_name = 'Raj',
      last_name  = 'Rathod',
      role       = 'candidate',
      password   = '$2b$10$suAZEpH3UC/R31fyzxHp5OIxPDQh8susqAC3CXGCoa1UEDysFqBAC',
      deleted    = NULL
  RETURNING id INTO v_user_id;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users WHERE email = 'raj.rathod@gmail.com';
  END IF;

  -- Insert into candidates table so interviews can be linked to this person
  INSERT INTO candidates (company_id, first_name, last_name, email, type, source)
  VALUES (v_company_id, 'Raj', 'Rathod', 'raj.rathod@gmail.com', 'internal', 'seed')
  ON CONFLICT (company_id, email) DO UPDATE
    SET deleted = NULL, first_name = 'Raj', last_name = 'Rathod';

END $$;
