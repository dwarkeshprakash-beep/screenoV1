// UsersTable - renders the per-company user list with their RBAC role assignments.

import { Pencil, Trash2 } from 'lucide-react'
import Badge from '../shared/Badge'

function UsersTable({ users, onEdit, onDelete }) {
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
            {['NAME', 'EMAIL', 'ROLES', 'ACTIONS'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
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
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" style={iconBtnStyle} onClick={() => onEdit(u)} aria-label="Edit user">
                    <Pencil size={13} />
                  </button>
                  <button type="button" style={{ ...iconBtnStyle, color: 'var(--danger-500)' }} onClick={() => onDelete(u)} aria-label="Delete user">
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

export default UsersTable
