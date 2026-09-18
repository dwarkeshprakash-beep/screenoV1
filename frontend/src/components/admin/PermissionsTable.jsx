// PermissionsTable - renders the global permissions catalog list.

import { Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

function PermissionsTable({ permissions, onEdit, onDelete }) {
  const thStyle = {
    textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)',
  }
  const tdStyle = { padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }
  const iconBtnStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8,
    padding: '6px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg-surface-alt)' }}>
            {['NAME', 'DESCRIPTION', 'CREATED', 'ACTIONS'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {permissions.map(permission => (
            <tr key={permission.id} style={{ transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
              <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{permission.name}</td>
              <td style={{ ...tdStyle, color: permission.description ? 'var(--fg-body)' : 'var(--fg-subtle)' }}>{permission.description || '-'}</td>
              <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{formatDate(permission.created)}</td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" style={iconBtnStyle} onClick={() => onEdit(permission)} aria-label="Edit permission">
                    <Pencil size={13} />
                  </button>
                  <button type="button" style={{ ...iconBtnStyle, color: 'var(--danger-500)' }} onClick={() => onDelete(permission)} aria-label="Delete permission">
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PermissionsTable
