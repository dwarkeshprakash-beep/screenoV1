// OrganizationsTable - renders the organizations (companies) list.

import DataTable from '../shared/DataTable'
import { tdStyle } from '../shared/tableStyles'
import RowActions from '../shared/RowActions'
import { formatDate } from '../../utils/helpers'

function OrganizationsTable({ organizations, onView, onEdit, onDelete }) {
  return (
    <DataTable
      columns={['NAME', 'LOGO', 'CREATED', 'ACTIONS']}
      items={organizations}
      getRowKey={org => org.id}
      onRowClick={onView}
      renderRow={org => (
        <>
          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{org.name}</td>
          <td style={tdStyle}>
            {org.logo_url ? (
              <img src={org.logo_url} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
            ) : (
              <span style={{ color: 'var(--fg-subtle)' }}>-</span>
            )}
          </td>
          <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{formatDate(org.created)}</td>
          <td style={tdStyle}>
            <RowActions entityLabel="organization" onEdit={() => onEdit(org)} onDelete={() => onDelete(org)} />
          </td>
        </>
      )}
    />
  )
}

export default OrganizationsTable
