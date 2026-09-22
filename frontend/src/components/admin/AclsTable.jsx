// AclsTable - renders the per-company ACLs list, each row tied to one module.

import DataTable, { tdStyle } from '../shared/DataTable'
import RowActions from '../shared/RowActions'
import { formatDate } from '../../utils/helpers'

const moduleBadgeStyle = {
  display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  background: 'var(--brand-50)', color: 'var(--brand-700)',
}

function AclsTable({ acls, onView, onEdit, onDelete }) {
  return (
    <DataTable
      columns={['MODULE', 'NAME', 'DESCRIPTION', 'CREATED', 'ACTIONS']}
      items={acls}
      getRowKey={acl => acl.id}
      onRowClick={onView}
      renderRow={acl => (
        <>
          <td style={tdStyle}><span style={moduleBadgeStyle}>{acl.module_name}</span></td>
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
