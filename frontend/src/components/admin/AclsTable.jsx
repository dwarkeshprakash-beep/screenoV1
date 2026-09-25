// AclsTable - renders the per-company ACLs list. Module association is managed from
// the Modules screen, not shown here.

import DataTable from '../shared/DataTable'
import { tdStyle } from '../shared/tableStyles'
import RowActions from '../shared/RowActions'
import { formatDate } from '../../utils/helpers'

function AclsTable({ acls, onView, onEdit, onDelete }) {
  return (
    <DataTable
      columns={['NAME', 'DESCRIPTION', 'CREATED', 'ACTIONS']}
      items={acls}
      getRowKey={acl => acl.id}
      onRowClick={onView}
      renderRow={acl => (
        <>
          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{acl.name}</td>
          <td style={{ ...tdStyle, color: acl.description ? 'var(--fg-body)' : 'var(--fg-subtle)' }}>{acl.description || '-'}</td>
          <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{formatDate(acl.created)}</td>
          <td style={tdStyle}>
            <RowActions entityLabel="ACL" onEdit={() => onEdit(acl)} onDelete={() => onDelete(acl)} />
          </td>
        </>
      )}
    />
  )
}

export default AclsTable
