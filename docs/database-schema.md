# Screeno V2 Database Schema

This is the compact PostgreSQL schema used by the V2 application. The project does not rely on database foreign-key constraints; repositories and services validate ownership and relationships.

Current numbered migrations: `001` through `008`.

## People and Organization

### `companies`

`id`, `name`, `logo_url`, `created`

### `departments`

`id`, `name`

### `users`

Internal managers and candidates.

`id`, `emp_number`, `first_name`, `last_name`, `email`, `department_id`, `job_title`, `location`, `role`, `password`, `company_id`, `resume_url`, `resume_text`, `resume_updated`, `tags`, `availability`, `created`

### `team_members`

Manager-to-user mapping.

`id`, `manager_id`, `user_id`, `created`

The pair `(manager_id, user_id)` is unique.

### `external_candidates`

People who do not have a Screeno user account.

`id`, `company_id`, `first_name`, `last_name`, `email`, `resume_url`, `resume_text`, `tags`, `created`

The pair `(company_id, email)` is unique.

## Client Mandates

### `client_templates`

Top-level client mandate, JD, and matching tags.

`id`, `manager_id`, `client_name`, `client_email`, `headcount`, `requirements`, `jd_text`, `custom_info`, `tags`, `resume_deadline`, `created`

### `client_mandate_requirements`

Optional requirement profiles under a mandate, such as junior/senior bands.

`id`, `mandate_id`, `profile_name`, `years_min`, `years_max`, `headcount`, `notes`, `created`

### `client_teams`

Candidates/prospects attached to a client mandate.

`id`, `mandate_id`, `user_id`, `requirement_id`, `status`, `notes`, `jd_sent`, `jd_sent_at`, `client_resume_url`, `resume_updated_at`, `created`

### `client_interview_records`

Outcome log for real client-side interviews. This is not a schedulable Screeno interview attempt.

`id`, `mandate_id`, `client_team_id`, `interview_date`, `outcome`, `feedback`, `notes`, `created`, `updated`

## Monthly Assessments

### `monthly_assessments`

Reusable internal monthly assessment definition.

`id`, `manager_id`, `subject_name`, `difficulty`, `topics`, `sub_topics`, `ai_generated_jd`, `duration_months`, `status`, `created`

### `monthly_assessment_enrollments`

Assignment of a monthly assessment to a team member. When assigned, a real `interviews` row is created and linked through `interview_id`.

`id`, `assessment_id`, `team_member_id`, `interview_id`, `start_date`, `end_date`, `month_progress`, `status`, `created`

## Interviews

### `interviews`

One interview row is one attempt. AI voice, exam, and configured human video interviews use this table. Offline client-mandate interviews also use this table for manager/candidate visibility.

`id`, `manager_id`, `internal_user_id`, `external_candidate_id`, `type`, `interview_mode`, `difficulty`, `status`, `result`, `token`, `token_expires`, `question_count`, `client_template_id`, `monthly_assessment_id`, `report_emails`, `scheduled_at`, `duration_minutes`, `started_at`, `ended_at`, `created`

- Exactly one of `internal_user_id` and `external_candidate_id` is populated.
- `type` includes `ai_voice`, `exam`, `human`, and `offline`.
- `interview_mode` is `simple` or `adaptive`.
- `status` is `scheduled`, `in_progress`, `completed`, or `cancelled`.
- `token` stores a SHA-256 hash, never the raw magic-link token.
- JD/topic context is joined from `client_templates` or `monthly_assessments`; it is not duplicated on the interview.
- `scheduled_at` is required by current scheduling routes.
- `duration_minutes` stores exam duration.

### `transcripts`

Question-and-answer rows.

`id`, `interview_id`, `question`, `answer`, `created`

## Reporting and Delivery

### `scorecards`

`id`, `interview_id`, `overall`, `confidence`, `tech_knowledge`, `communication`, `problem_solving`, `decision`, `reason`, `created`

### `reports`

`id`, `interview_id`, `scorecard_id`, `summary`, `strengths`, `status`, `pdf_url`, `created`

### `report_jobs`

Durable asynchronous report queue.

`id`, `interview_id`, `status`, `attempts`, `last_error`, `available_at`, `started`, `completed`, `created`

### `email_deliveries`

Immutable outbound-delivery audit.

`id`, `kind`, `interview_id`, `intended_to`, `delivered_to`, `status`, `error`, `created`

### `refresh_tokens`

Hashed, rotating refresh tokens.

`id`, `user_id`, `token_hash`, `expires`, `revoked`, `created`

### `password_reset_tokens`

Hashed password-reset tokens.

`id`, `user_id`, `token_hash`, `expires`, `used`, `created`

## Migration Notes

- `006_missing_indexes.sql` adds performance indexes for users, refresh tokens, and transcripts.
- `007_client_teams.sql` adds client requirement profiles, client teams, client interview records, and client/team interview columns.
- `008_state_flow_fixes.sql` adds resume text, password reset token storage, and exam duration.

New databases created through setup should run migrations `001` through `008`.
