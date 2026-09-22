// PermissionsTable - renders the global permissions catalog list. Add-only -
// no edit/delete actions, so this table only ever displays.

import DataTable, { tdStyle } from '../shared/DataTable'
import Badge from '../shared/Badge'
import { formatDate } from '../../utils/helpers'

function PermissionsTable({ permissions, onView }) {
  return (
    <DataTable
      columns={['NAME', 'DESCRIPTION', 'GRANTED TO', 'CREATED']}
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
        </>
      )}
    />
  )
}

export default PermissionsTable
