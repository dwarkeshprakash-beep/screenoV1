// Screeno V2 database reference.
// Relationships are validated by repositories and services rather than DB FKs.

const SCHEMA = {
  companies: {
    columns: ['id', 'name', 'created'],
  },
  departments: {
    columns: ['id', 'name'],
  },
  users: {
    columns: [
      'id', 'emp_number', 'first_name', 'last_name', 'email', 'department_id',
      'job_title', 'location', 'role', 'password', 'company_id', 'resume_url',
      'resume_text', 'resume_updated', 'current_resume_asset_id', 'tags',
      'availability', 'created',
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
      'requirements', 'jd_text', 'custom_info', 'tags', 'resume_deadline',
      'archived_at', 'created',
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
      'jd_sent', 'jd_sent_at', 'client_resume_url', 'submitted_resume_asset_id',
      'resume_updated_at', 'created',
    ],
  },
  client_interview_rounds: {
    columns: [
      'id', 'client_team_id', 'round_number', 'interview_at', 'outcome',
      'feedback', 'manager_notes', 'candidate_visible', 'published_at',
      'created_by_manager_id', 'created', 'updated',
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
      'id', 'assessment_id', 'team_member_id', 'start_date',
      'end_date', 'status', 'created',
    ],
  },
  monthly_assessment_occurrences: {
    columns: [
      'id', 'enrollment_id', 'period_month', 'available_from', 'due_at',
      'duration_minutes', 'interview_id', 'status', 'created', 'updated',
    ],
  },
  assignment_requests: {
    columns: [
      'id', 'request_key', 'assessment_id', 'team_member_id',
      'enrollment_id', 'created',
    ],
  },
  email_outbox_jobs: {
    columns: [
      'id', 'event_key', 'interview_id', 'recipient', 'payload', 'send_after',
      'status', 'attempts', 'last_error', 'claimed_at', 'finished_at',
      'created', 'updated',
    ],
  },
  interviews: {
    columns: [
      'id', 'manager_id', 'internal_user_id', 'external_candidate_id', 'type',
      'interview_mode', 'difficulty', 'status', 'result', 'token',
      'token_expires', 'question_count', 'client_template_id',
      'monthly_assessment_id', 'report_emails', 'scheduled_at',
      'available_from', 'due_at', 'schedule_timezone',
      'meeting_url', 'client_team_id', 'location',
      'duration_minutes', 'started_at', 'ended_at', 'flow_stage_run_id', 'created',
    ],
  },
  interview_flows: {
    columns: ['id', 'mandate_id', 'name', 'status', 'created_by_manager_id', 'created', 'updated'],
  },
  interview_flow_stages: {
    columns: ['id', 'flow_id', 'stage_order', 'name', 'type', 'scheduled_at',
      'schedule_timezone', 'duration_minutes', 'interview_mode', 'difficulty',
      'question_count', 'require_pass', 'minimum_score', 'interviewer_user_id',
      'location', 'meeting_url', 'notes', 'created', 'updated'],
  },
  candidate_flow_runs: {
    columns: ['id', 'flow_id', 'client_team_id', 'status', 'current_stage_order',
      'created_by_manager_id', 'completed_at', 'created', 'updated'],
  },
  candidate_flow_stage_runs: {
    columns: ['id', 'run_id', 'stage_id', 'stage_order', 'interview_id', 'status',
      'outcome', 'attempt_number', 'completed_at', 'created', 'updated'],
  },
  interview_assignments: {
    columns: ['id', 'stage_run_id', 'interview_id', 'interviewer_user_id', 'status',
      'outcome', 'feedback', 'completed_at', 'created', 'updated'],
  },
  interview_assignment_files: {
    columns: ['id', 'assignment_id', 'original_filename', 'mime_type', 'size',
      'storage_path', 'created'],
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
    columns: [
      'id', 'user_id', 'token_hash', 'expires', 'revoked', 'created',
      'family_id', 'replaced_by_token_hash', 'replacement_grace_expires',
    ],
  },
  password_reset_tokens: {
    columns: ['id', 'user_id', 'token_hash', 'expires', 'used', 'created'],
  },
  resume_assets: {
    columns: [
      'id', 'owner_user_id', 'purpose', 'client_team_id', 'mandate_id',
      'original_filename', 'mime_type', 'size', 'storage_path', 'created_at',
      'deleted_at',
    ],
  },
}

module.exports = { SCHEMA }
