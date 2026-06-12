# Screeno V2 Database Schema

This is the compact PostgreSQL schema used by the V2 application. The project
does not use database foreign-key constraints; repositories and services
validate ownership and relationships.

## People and Organization

### `companies`

`id`, `name`, `logo_url`, `created`

### `departments`

`id`, `name`

### `users`

Internal managers and candidates. Resume data and AI tags live here.

`id`, `emp_number`, `first_name`, `last_name`, `email`, `department_id`,
`job_title`, `location`, `role`, `password`, `company_id`, `resume_url`,
`resume_updated`, `tags`, `availability`, `created`

`availability` is `bench` or `client_side`.

### `team_members`

Manager-to-user mapping only.

`id`, `manager_id`, `user_id`, `created`

The pair `(manager_id, user_id)` is unique.

### `external_candidates`

People who do not have a Screeno user account. `company_id` and `resume_url`
remain here because no corresponding `users` row exists.

`id`, `company_id`, `first_name`, `last_name`, `email`, `resume_url`, `created`

The pair `(company_id, email)` is unique.

## V2 Assessment Context

### `client_templates`

Client mandate, JD, resume-update deadline, and AI matching tags.

`id`, `manager_id`, `client_name`, `client_email`, `headcount`, `requirements`,
`jd_text`, `custom_info`, `tags`, `resume_deadline`, `created`

### `monthly_assessments`

Recurring internal learning and assessment definition.

`id`, `manager_id`, `subject_name`, `difficulty`, `topics`, `sub_topics`,
`ai_generated_jd`, `duration_months`, `status`, `created`

### `monthly_assessment_enrollments`

Assignment of a monthly assessment to an internal team member.

`id`, `assessment_id`, `team_member_id`, `interview_id`, `start_date`,
`end_date`, `month_progress`, `status`, `created`

## Interviews

### `interviews`

One interview row is one attempt. Human/LiveKit scheduling is paused in V2.

`id`, `manager_id`, `internal_user_id`, `external_candidate_id`, `type`,
`interview_mode`, `difficulty`, `status`, `result`, `token`, `token_expires`,
`question_count`, `client_template_id`, `monthly_assessment_id`,
`report_emails`, `started_at`, `ended_at`, `created`

- Exactly one of `internal_user_id` and `external_candidate_id` is populated.
- `type`: `ai_voice` or `exam`.
- `interview_mode`: `simple` or `adaptive`.
- `status`: `scheduled`, `in_progress`, `completed`, or `cancelled`.
- `result`: `success`, `failed_mid_interview`, `proctoring_warning`, or
  `cheating_attempt`.
- `token` stores a SHA-256 hash, never the raw magic-link token.
- JD and topic context is joined from `client_templates` or
  `monthly_assessments`; it is not duplicated on the interview.

### `transcripts`

The single question-and-answer table. Before an answer is submitted, `answer`
is an empty string. `question` contains a JSON question payload for new rows;
the repository remains compatible with legacy plain-text rows.

`id`, `interview_id`, `question`, `answer`, `created`

## Reporting and Delivery

### `scorecards`

`id`, `interview_id`, `overall`, `confidence`, `tech_knowledge`,
`communication`, `problem_solving`, `decision`, `reason`, `created`

One scorecard exists per interview. A repeated proctoring violation creates a
zero-valued failed scorecard.

### `reports`

`id`, `interview_id`, `scorecard_id`, `summary`, `strengths`, `status`,
`pdf_url`, `created`

Numeric evaluation fields live only in `scorecards`.

### `report_jobs`

Durable asynchronous report queue with bounded retry state.

`id`, `interview_id`, `status`, `attempts`, `last_error`, `available_at`,
`started`, `completed`, `created`

### `email_deliveries`

Immutable outbound-delivery audit.

`id`, `kind`, `interview_id`, `intended_to`, `delivered_to`, `status`, `error`,
`created`

`kind` distinguishes initial magic links, resends, and report notifications.

### `refresh_tokens`

Hashed, rotating refresh tokens used for seven-day sessions and revocation.

`id`, `user_id`, `token_hash`, `expires`, `revoked`, `created`

Removing this table would remove server-side logout, rotation, and session
revocation. Access JWTs remain short-lived.
