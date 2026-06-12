// schema.js — Single source of truth for the Screeno DB schema.
// Update this file every time a migration is run against Supabase.
// Used as reference by repositories and for query building.
//
// Rules:
//   - No FK constraints in DB — validation done in backend code
//   - Primary keys only as DB constraints
//   - All JOINs use these relationships; never add duplicate columns

const SCHEMA = {

  // ----------------------------------------------------------
  // COMPANIES
  // ----------------------------------------------------------
  companies: {
    columns: ['id', 'name', 'logo_url', 'created'],
  },

  // ----------------------------------------------------------
  // DEPARTMENTS
  // Lookup table. users.department_id → departments.id
  // ----------------------------------------------------------
  departments: {
    columns: ['id', 'name'],
  },

  // ----------------------------------------------------------
  // USERS
  // Internal users: manager, employee, interviewer, admin
  // resume_url / resume_updated stored here for internal employees
  // tags = JSON array e.g. ["javascript", "senior"]
  // ----------------------------------------------------------
  users: {
    columns: [
      'id', 'company_id', 'emp_number', 'first_name', 'last_name',
      'email', 'password', 'role', 'department_id', 'job_title',
      'location', 'resume_url', 'resume_updated', 'tags', 'created',
    ],
    // role values: 'manager' | 'employee' | 'interviewer' | 'admin'
  },

  // ----------------------------------------------------------
  // REFRESH TOKENS
  // Required for secure JWT logout. revoked = logout timestamp.
  // ----------------------------------------------------------
  refresh_tokens: {
    columns: ['id', 'user_id', 'token_hash', 'expires', 'revoked', 'created'],
    // user_id → users.id
  },

  // ----------------------------------------------------------
  // TEAM MEMBERS
  // Maps manager → team member (user).
  // A user is managed when a row exists with their user_id.
  // ----------------------------------------------------------
  team_members: {
    columns: ['id', 'manager_id', 'user_id', 'created'],
    // manager_id → users.id
    // user_id    → users.id
    // UNIQUE(manager_id, user_id)
  },

  // ----------------------------------------------------------
  // CANDIDATES
  // Created when an internal user is first scheduled for an interview.
  // All profile data (name, email, resume) is on users — use JOIN.
  //
  // Profile JOIN:
  //   SELECT u.first_name, u.last_name, u.email, u.resume_url,
  //          u.job_title, u.location, d.name AS department,
  //          c.last_assessed
  //   FROM candidates c
  //   JOIN users u ON u.id = c.user_id
  //   LEFT JOIN departments d ON d.id = u.department_id
  // ----------------------------------------------------------
  candidates: {
    columns: ['id', 'user_id', 'last_assessed', 'created'],
    // user_id → users.id  (UNIQUE)
  },

  // ----------------------------------------------------------
  // EXTERNAL CANDIDATES
  // People outside the company with no user account.
  // Minimal info needed to send a magic link and run the interview.
  // ----------------------------------------------------------
  external_candidates: {
    columns: ['id', 'company_id', 'first_name', 'last_name', 'email', 'phone', 'resume_url', 'created'],
    // company_id → companies.id
    // UNIQUE(company_id, email)
  },

  // ----------------------------------------------------------
  // INTERVIEWS
  // One scheduled interview per candidate. One attempt, no retakes.
  //
  // Either candidate_id (internal) OR external_id (external) is set.
  // To get candidate info:
  //   Internal: JOIN candidates c ON c.id = i.candidate_id JOIN users u ON u.id = c.user_id
  //   External: JOIN external_candidates ec ON ec.id = i.external_id
  //
  // status values: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  // result values: 'completed' | 'failed_mid' | 'cheating_attempt' (NULL = not yet started)
  // type values:   'ai_voice'  | 'exam'
  // interview_mode: 'simple' (pre-generated Q) | 'adaptive' (LLM per Q)
  // difficulty:    'easy' | 'medium' | 'hard'
  // ----------------------------------------------------------
  interviews: {
    columns: [
      'id', 'candidate_id', 'external_id', 'scheduled_by',
      'type', 'interview_mode', 'difficulty', 'question_count',
      'report_emails', 'status', 'result', 'token_hash', 'token_expires', 'created',
    ],
    // candidate_id → candidates.id      (nullable)
    // external_id  → external_candidates.id  (nullable)
    // scheduled_by → users.id
  },

  // ----------------------------------------------------------
  // TRANSCRIPTS
  // One row per question-answer pair for an interview.
  // Audio is never stored — only the transcribed text.
  // ----------------------------------------------------------
  transcripts: {
    columns: ['id', 'interview_id', 'question', 'answer', 'created'],
    // interview_id → interviews.id
  },

  // ----------------------------------------------------------
  // SCORECARDS
  // AI-generated numeric scores and hire/no-hire decision.
  // One scorecard per interview (UNIQUE on interview_id).
  // decision: 'pass' | 'fail' | 'borderline'
  // ----------------------------------------------------------
  scorecards: {
    columns: [
      'id', 'interview_id', 'overall', 'confidence', 'tech_knowledge',
      'communication', 'problem_solving', 'decision', 'reason', 'created',
    ],
    // interview_id → interviews.id  (UNIQUE)
  },

  // ----------------------------------------------------------
  // REPORTS
  // AI-generated text report for an interview.
  // Numeric scores live in scorecards; narrative lives here.
  // One report per interview (UNIQUE on interview_id).
  // status: 'generating' | 'ready' | 'error'
  // ----------------------------------------------------------
  reports: {
    columns: ['id', 'interview_id', 'scorecard_id', 'summary', 'strengths', 'pdf_url', 'status', 'created'],
    // interview_id → interviews.id  (UNIQUE)
    // scorecard_id → scorecards.id
    // strengths = JSON array of strings
  },

  // ----------------------------------------------------------
  // REPORT JOBS
  // Async queue. Worker polls status='pending', generates report,
  // updates reports table, marks job done.
  // One job per interview (UNIQUE on interview_id).
  // status: 'pending' | 'running' | 'done' | 'error'
  // ----------------------------------------------------------
  report_jobs: {
    columns: ['id', 'interview_id', 'status', 'last_error', 'available_at', 'started', 'completed', 'created'],
    // interview_id → interviews.id  (UNIQUE)
  },

  // ----------------------------------------------------------
  // EMAIL DELIVERIES
  // Audit log of every outbound email. Never updated after insert.
  // kind: 'magic_link' | 'report_ready' | 'schedule_confirmation'
  // status: 'sent' | 'failed'
  // ----------------------------------------------------------
  email_deliveries: {
    columns: ['id', 'kind', 'interview_id', 'intended_to', 'delivered_to', 'status', 'error', 'created'],
    // interview_id → interviews.id
  },
};

module.exports = { SCHEMA };
