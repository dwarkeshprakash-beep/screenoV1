// RolesTable - renders the per-company roles list.

import { Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

function RolesTable({ roles, onView, onEdit, onDelete }) {
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
          {roles.map(role => (
            <tr
              key={role.id}
              style={{ transition: 'background 120ms', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
              onClick={() => onView(role)}
            >
              <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{role.name}</td>
              <td style={{ ...tdStyle, color: role.description ? 'var(--fg-body)' : 'var(--fg-subtle)' }}>{role.description || '-'}</td>
              <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{formatDate(role.created)}</td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" style={iconBtnStyle} onClick={e => { e.stopPropagation(); onEdit(role) }} aria-label="Edit role">
                    <Pencil size={13} />
                  </button>
                  <button type="button" style={{ ...iconBtnStyle, color: 'var(--danger-500)' }} onClick={e => { e.stopPropagation(); onDelete(role) }} aria-label="Delete role">
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

export default RolesTable
