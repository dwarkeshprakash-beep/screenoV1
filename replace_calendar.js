const fs = require('fs');
const file = 'frontend/src/pages/manager/MonthlyAssessmentPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `  const calendarRows = useMemo(() => {
    const byCandidate = new Map()

    for (const row of calendarData) {
      const candidateKey = String(row.user_id || row.team_member_id || \`\${row.first_name || ''}-\${row.last_name || ''}\`)
      const name = \`\${row.first_name || ''} \${row.last_name || ''}\`.trim() || 'Candidate'
      const candidate = byCandidate.get(candidateKey) || {
        id: candidateKey,
        name,
        subjects: new Map(),
        months: Array.from({ length: 12 }, () => []),
      }

      if (row.subject_name) candidate.subjects.set(row.assessment_id || row.id, row.subject_name)

      if (!row.period_month) continue;
      const periodDate = new Date(row.period_month)
      if (Number.isNaN(periodDate.getTime())) continue;
      if (periodDate.getUTCFullYear() !== calendarYear) continue;

      const status = row.occurrence_status === 'cancelled' || row.status === 'cancelled'
        ? 'cancelled'
        : (row.interview_status || row.occurrence_status || 'pending')

      candidate.months[periodDate.getUTCMonth()].push({
        id: row.occurrence_id || row.id,
        subject: row.subject_name || 'Assessment',
        status,
        startDate: row.start_date,
        endDate: row.end_date,
      })

      byCandidate.set(candidateKey, candidate)
    }`;

content = content.replace(/  const calendarRows = useMemo\(\(\) => \{[\s\S]*?byCandidate\.set\(candidateKey, candidate\)\n    \}/, replacement);
fs.writeFileSync(file, content);
console.log('Successfully updated calendar mapping logic!');
