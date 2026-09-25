# Screeno V2 Database Schema

This is the compact PostgreSQL schema used by the current V2 app. Current numbered migrations: `001` through `047` (`backend/migrations/`, applied by `npm run migrate`).

Relationships are enforced by repositories/services for ownership checks and lifecycle cleanup. Migrations avoid foreign key constraints in the active schema, and business value/window checks are validated in backend services rather than DB check constraints.

Interview automation uses `interview_flows` and ordered `interview_flow_stages` as definitions. Candidate execution is stored in `candidate_flow_runs` and `candidate_flow_stage_runs`; only the active stage receives an `interviews` row through `interviews.flow_stage_run_id`. Human/offline work uses `interview_assignments`, with optional feedback documents in `interview_assignment_files`. Mandate and requirement headcount values are informational targets, not pipeline or scheduling limits.

## People And Organization

### `companies`

`id`, `name`, `logo_url`, `created`

### `departments`

`id`, `name`

### `users`

Internal managers, candidates, and admins.

`id`, `emp_number`, `first_name`, `last_name`, `email`, `department_id`, `job_title`, `location`, `password`, `company_id`, `is_platform_admin`, `resume_url`, `resume_text`, `resume_updated`, `current_resume_asset_id`, `tags`, `availability`, `created`

### `team_members`

Manager-to-user mapping.

`id`, `manager_id`, `user_id`, `created`

### `external_candidates`

External candidates without a Screeno user account.

`id`, `company_id`, `first_name`, `last_name`, `email`, `resume_url`, `resume_text`, `tags`, `created`

## Client Mandates

### `client_templates`

Top-level client mandate summary and legacy fallback JD/tag fields.

`id`, `manager_id`, `created_by_user_id`, `assigned_bde_id`, `client_name`, `client_email`, `headcount`, `requirements`, `jd_text`, `jd_file_path`, `jd_original_filename`, `custom_info`, `tags`, `resume_deadline`, `archived_at`, `created`, `updated_at`

`created_by_user_id` tracks the BDE who originally created the mandate (migration `024`); `assigned_bde_id` is the BDE a manager optionally assigns to a mandate they own (migration `027`). Either one makes the mandate visible to that user alongside `manager_id`, which is the owning manager. A non-owner with Save on client mandates may edit the JD fields and add/edit/delete requirement profiles one at a time; everything else (client details, team, scheduling, rounds, archive/delete) is owner-only.

### `client_mandate_requirements`

Role-level mandate profiles. New mandate flows should store JD, skills, and resume deadline here.

`id`, `mandate_id`, `profile_name`, `years_min`, `years_max`, `headcount`, `notes`, `jd_text`, `jd_file_path`, `jd_original_filename`, `tags`, `resume_deadline`, `created`

### `client_teams`

Candidates/prospects attached to a mandate.

`id`, `mandate_id`, `user_id`, `requirement_id`, `status`, `notes`, `jd_sent`, `jd_sent_at`, `client_resume_url`, `submitted_resume_asset_id`, `resume_updated_at`, `created`

### `client_interview_rounds`

Client-side outcome history. Only rows with `candidate_visible = true` are exposed to candidates.

`id`, `client_team_id`, `round_number`, `interview_at`, `outcome`, `feedback`, `manager_notes`, `candidate_visible`, `published_at`, `created_by_manager_id`, `created`, `updated`

`client_interview_records` was backfilled into this table in migration `013` and dropped in migration `016`.

### `mandate_status_history`

One row per lifecycle step a mandate has reached (`created`, `assigned_to_manager`, `candidates_assigned`, `interview_in_progress`, `completed`); unique per `(mandate_id, status)`.

`id`, `mandate_id`, `status`, `actor_user_id`, `created`

## Monthly Assessments

### `monthly_assessments`

Reusable monthly subject definition.

`id`, `manager_id`, `subject_name`, `difficulty`, `topics`, `sub_topics`, `ai_generated_jd`, `duration_months`, `status`, `interview_type`, `interview_mode`, `created`

### `monthly_assessment_enrollments`

Assignment of a monthly subject to a team member.

`id`, `assessment_id`, `team_member_id`, `start_date`, `end_date`, `status`, `created`

### `monthly_assessment_occurrences`

One scheduled monthly occurrence per enrollment month. This table owns the interview link and per-period status.

`id`, `enrollment_id`, `period_month`, `available_from`, `due_at`, `duration_minutes`, `interview_id`, `status`, `created`, `updated`

`monthly_assessment_enrollments.interview_id` and `month_progress` were removed in migration `016`.

## Interviews

### `interviews`

One row per interview or exam attempt.

`id`, `manager_id`, `internal_user_id`, `external_candidate_id`, `type`, `interview_mode`, `difficulty`, `status`, `result`, `token`, `token_expires`, `question_count`, `client_template_id`, `monthly_assessment_id`, `report_emails`, `scheduled_at`, `available_from`, `due_at`, `schedule_timezone`, `meeting_url`, `client_team_id`, `location`, `duration_minutes`, `flow_stage_run_id`, `calendar_event_id`, `calendar_sync_error`, `subject_name`, `focus_areas`, `context_notes`, `started_at`, `ended_at`, `created`

## Interview Flows

### `interview_flows`

A multi-stage interview plan on a mandate.

`id`, `mandate_id`, `name`, `status`, `created_by_manager_id`, `report_user_ids`, `created`, `updated`

### `interview_flow_stages`

Ordered stages of a flow (AI voice, exam, human, offline).

`id`, `flow_id`, `stage_order`, `name`, `type`, `scheduled_at`, `schedule_timezone`, `duration_minutes`, `interview_mode`, `difficulty`, `question_count`, `require_pass`, `minimum_score`, `interviewer_user_id`, `location`, `meeting_url`, `notes`, `created`, `updated`

### `candidate_flow_runs`

One candidate (client team member) going through a flow.

`id`, `flow_id`, `template_flow_id`, `client_team_id`, `status`, `current_stage_order`, `created_by_manager_id`, `completed_at`, `created`, `updated`

### `candidate_flow_stage_runs`

Each attempt at a stage; the active stage links to its `interviews` row.

`id`, `run_id`, `stage_id`, `stage_order`, `interview_id`, `status`, `outcome`, `attempt_number`, `completed_at`, `created`, `updated`

### `interview_assignments`

Interviewer work for human/offline interviews, inside a flow or standalone.

`id`, `stage_run_id`, `interview_id`, `interviewer_user_id`, `status`, `outcome`, `feedback`, `completed_at`, `created`, `updated`

### `interview_assignment_files`

Optional feedback documents an interviewer uploads.

`id`, `assignment_id`, `original_filename`, `mime_type`, `size`, `storage_path`, `created`

## Reporting And Delivery

### `transcripts`

`id`, `interview_id`, `question`, `answer`, `created`

### `scorecards`

`id`, `interview_id`, `overall`, `confidence`, `tech_knowledge`, `communication`, `problem_solving`, `decision`, `reason`, `created`

### `reports`

`id`, `interview_id`, `scorecard_id`, `summary`, `strengths`, `status`, `pdf_url`, `created`

### `report_jobs`

`id`, `interview_id`, `status`, `attempts`, `last_error`, `available_at`, `started`, `completed`, `created`

### `email_deliveries`

`id`, `kind`, `interview_id`, `intended_to`, `delivered_to`, `status`, `error`, `created`

### `email_outbox_jobs`

Durable delayed email queue for monthly occurrences.

`id`, `event_key`, `interview_id`, `recipient`, `payload`, `send_after`, `status`, `attempts`, `last_error`, `claimed_at`, `finished_at`, `created`, `updated`

## Access Control (RBAC)

Access is per company: a user holds roles; a role grants permissions on ACLs; each ACL covers one module. `users.is_platform_admin` bypasses this for the admin shell. See `docs/rbac-multi-tenant-plan.md`.

### `roles`

`id`, `company_id`, `name`, `description`, `created` (unique per `(company_id, name)`)

### `user_roles`

`id`, `user_id`, `role_id`, `created` (unique per `(user_id, role_id)`)

### `modules`

Product areas that can be granted: `team`, `client_mandates`, `monthly_assessments`, `schedule`, `reports`, `resume_analyzer`, `interviews`, `feedback`, `outcomes`.

`id`, `key`, `name`, `sort_order`, `created`

### `acls`

`id`, `company_id`, `module_id`, `name`, `description`, `created` (unique per `(company_id, module_id)` and `(company_id, name)`)

### `permissions`

Permission names: `View`, `View All`, `Save`, `Delete`.

`id`, `name`, `description`, `created`

### `role_acl_permissions`

`id`, `company_id`, `role_id`, `acl_id`, `permission_id`, `created` (unique per `(role_id, acl_id, permission_id)`)

## Auth And Assets

### `refresh_tokens`

`id`, `user_id`, `token_hash`, `expires`, `revoked`, `created`, `family_id`, `replaced_by_token_hash`, `replacement_grace_expires`

### `password_reset_tokens`

`id`, `user_id`, `token_hash`, `expires`, `used`, `created`

### `assignment_requests`

Monthly assignment idempotency records.

`id`, `request_key`, `assessment_id`, `team_member_id`, `enrollment_id`, `created`

### `resume_assets`

Profile and mandate-specific resume asset metadata.

`id`, `owner_user_id`, `purpose`, `client_team_id`, `mandate_id`, `original_filename`, `mime_type`, `size`, `storage_path`, `created_at`, `deleted_at`

### `schema_migrations`

Written by `backend/migrations/migrate.js`: one row per applied migration file.

`filename`, `applied_at`

## Dev Data Reset

Use `backend/reset-dev-data.js` for dev/staging cleanup instead of ad hoc table deletes.

- Dry-run: `node reset-dev-data.js`
- Apply workflow cleanup: `CONFIRM_RESET_SCREENO_DEV_DATA=DELETE_WORKFLOW_DATA DRY_RUN=false node reset-dev-data.js`
- Apply master-only cleanup: `CONFIRM_RESET_SCREENO_DEV_DATA=DELETE_WORKFLOW_DATA DRY_RUN=false RESET_MODE=master-only node reset-dev-data.js`

`clean-workflows` preserves `companies`, `departments`, `users`, `team_members`, and profile resume metadata. `master-only` preserves only `companies`, `departments`, and `users`, and clears user resume/tag runtime artifacts.
