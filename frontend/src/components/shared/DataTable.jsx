// DataTable - shared chrome for the admin CRUD list tables (Users, Roles, ACLs,
// Organizations, Permissions): header row plus hover-highlighted, clickable data
// rows. Each table still owns its own columns and cell rendering via renderRow -
// this only removes the duplicated table shell, row hover, and cell/button styling.

export const tdStyle = { padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }

export const iconBtnStyle = {
  background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8,
  padding: '6px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
}

const thStyle = {
  textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)',
}

/**
 * @param {string[]} columns - header labels, in order
 * @param {any[]} items - rows to render
 * @param {(item: any) => string|number} getRowKey
 * @param {(item: any) => JSX.Element} renderRow - returns the <td> cells for one row
 * @param {(item: any) => void} onRowClick
 */
function DataTable({ columns, items, getRowKey, renderRow, onRowClick }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg-surface-alt)' }}>
            {columns.map(col => <th key={col} style={thStyle}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr
              key={getRowKey(item)}
              style={{ transition: 'background 120ms', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
              onClick={() => onRowClick(item)}
            >
              {renderRow(item)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
