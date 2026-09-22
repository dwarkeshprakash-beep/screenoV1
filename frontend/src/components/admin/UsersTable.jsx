// UsersTable - renders the per-company user list with their RBAC role assignments.

import DataTable, { tdStyle } from '../shared/DataTable'
import RowActions from '../shared/RowActions'
import Badge from '../shared/Badge'

function UsersTable({ users, onView, onEdit, onDelete }) {
  return (
    <DataTable
      columns={['NAME', 'EMAIL', 'ROLES', 'ACTIONS']}
      items={users}
      getRowKey={u => u.id}
      onRowClick={onView}
      renderRow={u => (
        <>
          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{u.first_name} {u.last_name}</td>
          <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{u.email}</td>
          <td style={tdStyle}>
            {u.roles.length === 0 ? (
              <span style={{ color: 'var(--fg-subtle)' }}>-</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {u.roles.map(r => <Badge key={r.id} variant="brand">{r.name}</Badge>)}
              </div>
            )}
          </td>
          <td style={tdStyle}>
            <RowActions entityLabel="user" onEdit={() => onEdit(u)} onDelete={() => onDelete(u)} />
          </td>
        </>
      )}
    />
  )
}

export default UsersTable
