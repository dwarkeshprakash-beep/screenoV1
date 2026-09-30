// MandatesAdminTable - every mandate across all companies, with the admin repair
// actions (reassign, force archive/restore, force delete) on each row.

import DataTable from '../shared/DataTable'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { tdStyle } from '../shared/tableStyles'

const COLUMNS = ['ID', 'CLIENT', 'MANAGER', 'COMPANY', 'CANDIDATES', 'INTERVIEWS', 'STATUS', 'ACTIONS']
const subTextStyle = { fontSize: 12, color: 'var(--fg-muted)' }

function MandatesAdminTable({ mandates, onReassign, onToggleArchive, onDelete }) {
  return (
    <DataTable
      columns={COLUMNS}
      items={mandates}
      getRowKey={mandate => mandate.id}
      renderRow={mandate => (
        <>
          <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{mandate.id}</td>
          <td style={tdStyle}>
            <div style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>{mandate.client_name}</div>
            <div style={subTextStyle}>{mandate.requirements || 'No role specified'}</div>
          </td>
          <td style={tdStyle}>
            <div>{mandate.manager_first_name} {mandate.manager_last_name}</div>
            <div style={subTextStyle}>ID: {mandate.manager_id}</div>
          </td>
          <td style={tdStyle}>{mandate.company_name}</td>
          <td style={tdStyle}>{mandate.candidate_count}</td>
          <td style={tdStyle}>
            {mandate.interview_count}
            {mandate.active_interview_count > 0 && (
              <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--warning-600)' }}>
                ({mandate.active_interview_count} active)
              </span>
            )}
          </td>
          <td style={tdStyle}>
            <Badge variant={mandate.archived_at ? 'danger' : 'success'}>
              {mandate.archived_at ? 'Archived' : 'Active'}
            </Badge>
          </td>
          <td style={tdStyle}>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" variant="secondary" onClick={() => onReassign(mandate)}>Reassign</Button>
              <Button size="sm" variant="secondary" onClick={() => onToggleArchive(mandate)}>
                {mandate.archived_at ? 'Restore' : 'Archive'}
              </Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(mandate)}>Delete</Button>
            </div>
          </td>
        </>
      )}
    />
  )
}

export default MandatesAdminTable
