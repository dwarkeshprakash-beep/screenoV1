// RolesTable - renders the per-company roles list.

import DataTable from '../shared/DataTable'
import { tdStyle } from '../shared/tableStyles'
import RowActions from '../shared/RowActions'
import { formatDate } from '../../utils/helpers'

function RolesTable({ roles, onView, onEdit, onDelete }) {
  return (
    <DataTable
      columns={['NAME', 'DESCRIPTION', 'CREATED', 'ACTIONS']}
      items={roles}
      getRowKey={role => role.id}
      onRowClick={onView}
      renderRow={role => (
        <>
          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{role.name}</td>
          <td style={{ ...tdStyle, color: role.description ? 'var(--fg-body)' : 'var(--fg-subtle)' }}>{role.description || '-'}</td>
          <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{formatDate(role.created)}</td>
          <td style={tdStyle}>
            <RowActions entityLabel="role" onEdit={() => onEdit(role)} onDelete={() => onDelete(role)} />
          </td>
        </>
      )}
    />
  )
}

export default RolesTable
