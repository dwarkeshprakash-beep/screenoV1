const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const models = {
  'company': `/**
 * @typedef {Object} Company
 * @property {number} id
 * @property {string} name
 * @property {string|null} logo_url
 * @property {Date} created
 */
module.exports = {};`,

  'department': `/**
 * @typedef {Object} Department
 * @property {number} id
 * @property {string} name
 */
module.exports = {};`,

  'user': `/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string|null} emp_number
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} email
 * @property {number|null} department_id
 * @property {string|null} job_title
 * @property {string|null} location
 * @property {string} role
 * @property {string|null} password
 * @property {number|null} company_id
 * @property {string|null} resume_url
 * @property {Date|null} resume_updated
 * @property {string|null} tags
 * @property {Date} created
 */
module.exports = {};`,

  'external-candidate': `/**
 * @typedef {Object} ExternalCandidate
 * @property {number} id
 * @property {number} company_id
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} email
 * @property {string|null} resume_url
 * @property {Date} created
 */
module.exports = {};`,

  'team-member': `/**
 * @typedef {Object} TeamMember
 * @property {number} id
 * @property {number} manager_id
 * @property {number} user_id
 * @property {Date} created
 */
module.exports = {};`,

  'interview': `/**
 * @typedef {Object} Interview
 * @property {number} id
 * @property {number} manager_id
 * @property {number|null} internal_user_id
 * @property {number|null} external_candidate_id
 * @property {string} type
 * @property {string} interview_mode
 * @property {string} difficulty
 * @property {string} status
 * @property {string|null} result
 * @property {string|null} token
 * @property {Date|null} token_expires
 * @property {number} question_count
 * @property {Date|null} started_at
 * @property {Date|null} ended_at
 * @property {Date} created
 */
module.exports = {};`,

  'transcript': `/**
 * @typedef {Object} Transcript
 * @property {number} id
 * @property {number} interview_id
 * @property {string} question
 * @property {string} answer
 * @property {Date} created
 */
module.exports = {};`,

  'email-delivery': `/**
 * @typedef {Object} EmailDelivery
 * @property {number} id
 * @property {string} kind
 * @property {number|null} interview_id
 * @property {string} intended_to
 * @property {string} delivered_to
 * @property {string} status
 * @property {string|null} error
 * @property {Date} created
 */
module.exports = {};`,

  'report-job': `/**
 * @typedef {Object} ReportJob
 * @property {number} id
 * @property {number} interview_id
 * @property {string} status
 * @property {number} attempts
 * @property {string|null} last_error
 * @property {Date} available_at
 * @property {Date|null} started
 * @property {Date|null} completed
 * @property {Date} created
 */
module.exports = {};`,

  'scorecard': `/**
 * @typedef {Object} Scorecard
 * @property {number} id
 * @property {number} interview_id
 * @property {number|null} overall
 * @property {number|null} confidence
 * @property {number|null} tech_knowledge
 * @property {number|null} communication
 * @property {number|null} problem_solving
 * @property {string} decision
 * @property {string} reason
 * @property {Date} created
 */
module.exports = {};`,

  'report': `/**
 * @typedef {Object} Report
 * @property {number} id
 * @property {number} interview_id
 * @property {number|null} scorecard_id
 * @property {string|null} summary
 * @property {string|null} strengths
 * @property {string} status
 * @property {string|null} pdf_url
 * @property {Date} created
 */
module.exports = {};`,

  'refresh-token': `/**
 * @typedef {Object} RefreshToken
 * @property {number} id
 * @property {number} user_id
 * @property {string} token_hash
 * @property {Date} expires
 * @property {Date|null} revoked
 * @property {Date} created
 */
module.exports = {};`
};

for (const [name, content] of Object.entries(models)) {
  fs.writeFileSync(path.join(modelsDir, name + '.model.js'), content);
}

console.log('Successfully created model reference files.');
