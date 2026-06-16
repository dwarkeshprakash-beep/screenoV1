const fs = require('fs');
const path = require('path');

const reposDir = path.join(__dirname, 'src', 'repositories');

// 1. Delete deprecated
const toDelete = [
  'answer.repository.js',
  'attempt.repository.js',
  'candidate.repository.js',
  'interview-note.repository.js',
  'notes.repository.js',
  'proctoring.repository.js',
  'question.repository.js',
  'schedule-record.repository.js'
];

toDelete.forEach(file => {
  const fp = path.join(reposDir, file);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    console.log('Deleted:', file);
  }
});

// 2. Create new repositories
const newRepos = {
  'external-candidate': `const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    \`INSERT INTO external_candidates (company_id, first_name, last_name, email, resume_url, tags)
     VALUES (@company_id, @first_name, @last_name, @email, @resume_url, @tags)
     RETURNING *\`,
    {
      ...data,
      tags: typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags || []),
    }
  )
  return rows[0]
}

async function getById(id) {
  const rows = await db.query(
    \`SELECT * FROM external_candidates WHERE id = @id\`,
    { id }
  )
  return rows[0] || null
}

module.exports = { create, getById }
`,

  'transcript': `const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    \`INSERT INTO transcripts (interview_id, question, answer)
     VALUES (@interview_id, @question, @answer)
     RETURNING *\`,
    data
  )
  return rows[0]
}

async function getByInterview(interviewId) {
  const rows = await db.query(
    \`SELECT * FROM transcripts WHERE interview_id = @interviewId ORDER BY created\`,
    { interviewId }
  )
  return rows
}

module.exports = { create, getByInterview }
`,

  'company': `const db = require('../db/connection')

async function getById(id) {
  const rows = await db.query(\`SELECT * FROM companies WHERE id = @id\`, { id })
  return rows[0] || null
}

module.exports = { getById }
`,

  'department': `const db = require('../db/connection')

async function getById(id) {
  const rows = await db.query(\`SELECT * FROM departments WHERE id = @id\`, { id })
  return rows[0] || null
}

module.exports = { getById }
`
};

for (const [name, content] of Object.entries(newRepos)) {
  fs.writeFileSync(path.join(reposDir, name + '.repository.js'), content);
  console.log('Created:', name + '.repository.js');
}
