// Screeno V2 database reference.
// Relationships are validated by repositories and services rather than DB FKs.

const SCHEMA = {
  companies: {
    columns: ['id', 'name', 'logo_url', 'created'],
  },
  departments: {
    columns: ['id', 'name'],
  },
  users: {
    columns: [
      'id', 'emp_number', 'first_name', 'last_name', 'email', 'department_id',
      'job_title', 'location', 'role', 'password', 'company_id', 'resume_url',
      'resume_text', 'resume_updated', 'tags', 'availability', 'created',
    ],
  },
  team_members: {
    columns: ['id', 'manager_id', 'user_id', 'created'],
  },
  external_candidates: {
    columns: [
      'id', 'company_id', 'first_name', 'last_name', 'email', 'resume_url',
      'resume_text', 'tags', 'created',
    ],
  },
  client_templates: {
    columns: [
      'id', 'manager_id', 'client_name', 'client_email', 'headcount',
      'requirements', 'jd_text', 'custom_info', 'tags', 'resume_deadline', 'created',
    ],
  },
  client_mandate_requirements: {
    columns: [
      'id', 'mandate_id', 'profile_name', 'years_min', 'years_max',
      'headcount', 'notes', 'jd_text', 'tags', 'resume_deadline', 'created',
    ],
  },
  client_teams: {
    columns: [
      'id', 'mandate_id', 'user_id', 'requirement_id', 'status', 'notes',
      'jd_sent', 'jd_sent_at', 'client_resume_url', 'resume_updated_at', 'created',
    ],
  },
  client_interview_records: {
    columns: [
      'id', 'mandate_id', 'client_team_id', 'interview_date', 'outcome',
      'feedback', 'notes', 'created', 'updated',
    ],
  },
  monthly_assessments: {
    columns: [
      'id', 'manager_id', 'subject_name', 'difficulty', 'topics', 'sub_topics',
      'ai_generated_jd', 'duration_months', 'status', 'interview_type', 'interview_mode', 'created',
    ],
  },
  monthly_assessment_enrollments: {
    columns: [
      'id', 'assessment_id', 'team_member_id', 'interview_id', 'start_date',
      'end_date', 'month_progress', 'status', 'created',
    ],
  },
  interviews: {
    columns: [
      'id', 'manager_id', 'internal_user_id', 'external_candidate_id', 'type',
      'interview_mode', 'difficulty', 'status', 'result', 'token',
      'token_expires', 'question_count', 'client_template_id',
      'monthly_assessment_id', 'report_emails', 'scheduled_at',
      'available_from', 'due_at', 'schedule_timezone', 'schedule_version',
      'meeting_url', 'meeting_provider', 'meeting_provider_event_id',
      'expired_notification_version', 'client_team_id', 'location',
      'duration_minutes', 'started_at', 'ended_at', 'created',
    ],
  },
  transcripts: {
    columns: ['id', 'interview_id', 'question', 'answer', 'created'],
  },
  email_deliveries: {
    columns: [
      'id', 'kind', 'interview_id', 'intended_to', 'delivered_to',
      'status', 'error', 'created',
    ],
  },
  report_jobs: {
    columns: [
      'id', 'interview_id', 'status', 'attempts', 'last_error',
      'available_at', 'started', 'completed', 'created',
    ],
  },
  scorecards: {
    columns: [
      'id', 'interview_id', 'overall', 'confidence', 'tech_knowledge',
      'communication', 'problem_solving', 'decision', 'reason', 'created',
    ],
  },
  reports: {
    columns: [
      'id', 'interview_id', 'scorecard_id', 'summary', 'strengths',
      'status', 'pdf_url', 'created',
    ],
  },
  refresh_tokens: {
    columns: ['id', 'user_id', 'token_hash', 'expires', 'revoked', 'created'],
  },
  password_reset_tokens: {
    columns: ['id', 'user_id', 'token_hash', 'expires', 'used', 'created'],
  },
}

module.exports = { SCHEMA }
