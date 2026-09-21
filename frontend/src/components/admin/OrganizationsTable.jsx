// OrganizationsTable - renders the organizations (companies) list.

import { Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

function OrganizationsTable({ organizations, onEdit, onDelete }) {
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
            {['NAME', 'LOGO', 'CREATED', 'ACTIONS'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {organizations.map(org => (
            <tr key={org.id} style={{ transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
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
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" style={iconBtnStyle} onClick={() => onEdit(org)} aria-label="Edit organization">
                    <Pencil size={13} />
                  </button>
                  <button type="button" style={{ ...iconBtnStyle, color: 'var(--danger-500)' }} onClick={() => onDelete(org)} aria-label="Delete organization">
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

export default OrganizationsTable
