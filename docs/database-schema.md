# Screeno V2 Database Schema

This is the compact PostgreSQL schema used by the current V2 app. Current numbered migrations: `001` through `016`.

Relationships are partly enforced by database constraints and partly by repositories/services for ownership checks.

## People And Organization

### `companies`

`id`, `name`, `logo_url`, `created`

### `departments`

`id`, `name`

### `users`

Internal managers, candidates, and admins.

`id`, `emp_number`, `first_name`, `last_name`, `email`, `department_id`, `job_title`, `location`, `role`, `password`, `company_id`, `resume_url`, `resume_text`, `resume_updated`, `current_resume_asset_id`, `tags`, `availability`, `created`

### `team_members`

Manager-to-user mapping.

`id`, `manager_id`, `user_id`, `created`

### `external_candidates`

External candidates without a Screeno user account.

`id`, `company_id`, `first_name`, `last_name`, `email`, `resume_url`, `resume_text`, `tags`, `created`

## Client Mandates

### `client_templates`

Top-level client mandate summary and legacy fallback JD/tag fields.

`id`, `manager_id`, `client_name`, `client_email`, `headcount`, `requirements`, `jd_text`, `custom_info`, `tags`, `resume_deadline`, `archived_at`, `created`

### `client_mandate_requirements`

Role-level mandate profiles. New mandate flows should store JD, skills, and resume deadline here.

`id`, `mandate_id`, `profile_name`, `years_min`, `years_max`, `headcount`, `notes`, `jd_text`, `tags`, `resume_deadline`, `created`

### `client_teams`

Candidates/prospects attached to a mandate.

`id`, `mandate_id`, `user_id`, `requirement_id`, `status`, `notes`, `jd_sent`, `jd_sent_at`, `client_resume_url`, `submitted_resume_asset_id`, `resume_updated_at`, `created`

### `client_interview_rounds`

Client-side outcome history. Only rows with `candidate_visible = true` are exposed to candidates.

`id`, `client_team_id`, `round_number`, `interview_at`, `outcome`, `feedback`, `manager_notes`, `candidate_visible`, `published_at`, `created_by_manager_id`, `created`, `updated`

`client_interview_records` was backfilled into this table in migration `013` and dropped in migration `016`.

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

`id`, `manager_id`, `internal_user_id`, `external_candidate_id`, `type`, `interview_mode`, `difficulty`, `status`, `result`, `token`, `token_expires`, `question_count`, `client_template_id`, `monthly_assessment_id`, `report_emails`, `scheduled_at`, `available_from`, `due_at`, `schedule_timezone`, `schedule_version`, `meeting_url`, `meeting_provider`, `meeting_provider_event_id`, `expired_notification_version`, `client_team_id`, `location`, `duration_minutes`, `started_at`, `ended_at`, `created`

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

## Auth And Assets

### `refresh_tokens`

`id`, `user_id`, `token_hash`, `expires`, `revoked`, `created`

### `password_reset_tokens`

`id`, `user_id`, `token_hash`, `expires`, `used`, `created`

### `assignment_requests`

Monthly assignment idempotency records.

`id`, `request_key`, `assessment_id`, `team_member_id`, `enrollment_id`, `created`

### `resume_assets`

Profile and mandate-specific resume asset metadata.

`id`, `owner_user_id`, `purpose`, `client_team_id`, `mandate_id`, `original_filename`, `mime_type`, `size`, `storage_path`, `created_at`, `deleted_at`
