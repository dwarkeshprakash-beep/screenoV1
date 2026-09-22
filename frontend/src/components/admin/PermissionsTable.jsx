// PermissionsTable - renders the global permissions catalog list.

import DataTable, { tdStyle } from '../shared/DataTable'
import RowActions from '../shared/RowActions'
import Badge from '../shared/Badge'
import { formatDate } from '../../utils/helpers'

function PermissionsTable({ permissions, onView, onEdit, onDelete }) {
  return (
    <DataTable
      columns={['NAME', 'DESCRIPTION', 'GRANTED TO', 'CREATED', 'ACTIONS']}
      items={permissions}
      getRowKey={permission => permission.id}
      onRowClick={onView}
      renderRow={permission => (
        <>
          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{permission.name}</td>
          <td style={{ ...tdStyle, color: permission.description ? 'var(--fg-body)' : 'var(--fg-subtle)' }}>{permission.description || '-'}</td>
          <td style={tdStyle}>
            {permission.roleCount > 0 ? (
              <Badge variant="brand">{permission.roleCount} role{permission.roleCount === 1 ? '' : 's'}</Badge>
            ) : (
              <span style={{ color: 'var(--fg-subtle)' }}>Unused</span>
            )}
          </td>
          <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{formatDate(permission.created)}</td>
          <td style={tdStyle}>
            <RowActions entityLabel="permission" onEdit={() => onEdit(permission)} onDelete={() => onDelete(permission)} />
          </td>
        </>
      )}
    />
  )
}

export default PermissionsTable
