-- The live companies table predates logo_url from 001_initial_schema.sql - that
-- file's CREATE TABLE only runs against brand-new databases (see backend/CLAUDE.md
-- on migrate.js), so an existing database never picked it up. Add it here so the
-- Organizations module's create/edit/list queries work against real databases too.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
