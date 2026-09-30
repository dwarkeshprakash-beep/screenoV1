// InterviewsAdminTable - the latest 100 interviews across every company, each with a
// "Change Status" admin override.

import DataTable from '../shared/DataTable'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { tdStyle } from '../shared/tableStyles'
import { formatDate } from '../../utils/helpers'

const COLUMNS = ['ID', 'CANDIDATE', 'TYPE', 'STATUS', 'CONTEXT', 'SCHEDULED', 'ACTIONS']
const subTextStyle = { fontSize: 12, color: 'var(--fg-muted)' }

// Admin view colours each lifecycle state distinctly (scheduled is not "pending" here).
const INTERVIEW_STATUS_VARIANT = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
  expired: 'neutral',
}

// What the interview belongs to - a client mandate, a monthly assessment, or neither.
function interviewContext(interview) {
  if (interview.mandate_name) return { title: interview.mandate_name, kind: 'Mandate' }
  if (interview.monthly_subject) return { title: interview.monthly_subject, kind: 'Monthly assessment' }
  return { title: null, kind: 'General' }
}

function InterviewsAdminTable({ interviews, onChangeStatus }) {
  return (
    <DataTable
      columns={COLUMNS}
      items={interviews}
      getRowKey={interview => interview.id}
      renderRow={interview => {
        const context = interviewContext(interview)
        return (
          <>
            <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{interview.id}</td>
            <td style={tdStyle}>
              <div style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>{interview.first_name} {interview.last_name}</div>
              <div style={subTextStyle}>{interview.email}</div>
              <div style={{ ...subTextStyle, color: 'var(--fg-subtle)' }}>{interview.company_name}</div>
            </td>
            <td style={tdStyle}><Badge variant="brand">{interview.type}</Badge></td>
            <td style={tdStyle}>
              <Badge variant={INTERVIEW_STATUS_VARIANT[interview.status] || 'neutral'}>{interview.status}</Badge>
            </td>
            <td style={tdStyle}>
              {context.title && <div style={{ fontWeight: 500 }}>{context.title}</div>}
              <div style={subTextStyle}>{context.kind}</div>
            </td>
            <td style={tdStyle}>{interview.scheduled_at ? formatDate(interview.scheduled_at) : 'Not scheduled'}</td>
            <td style={tdStyle}>
              <Button size="sm" variant="secondary" onClick={() => onChangeStatus(interview)}>Change Status</Button>
            </td>
          </>
        )
      }}
    />
  )
}

export default InterviewsAdminTable
