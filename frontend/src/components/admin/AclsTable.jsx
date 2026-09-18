// AclsTable - renders the per-company ACLs list, each row tied to one module.

import { Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

function AclsTable({ acls, onEdit, onDelete, onManagePermissions }) {
  const thStyle = {
    textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)',
  }
  const tdStyle = { padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }
  const iconBtnStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8,
    padding: '6px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
  }
  const moduleBadgeStyle = {
    display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    background: 'var(--brand-50)', color: 'var(--brand-700)',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg-surface-alt)' }}>
            {['MODULE', 'NAME', 'DESCRIPTION', 'CREATED', 'ACTIONS'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {acls.map(acl => (
            <tr key={acl.id} style={{ transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
              <td style={tdStyle}><span style={moduleBadgeStyle}>{acl.module_name}</span></td>
              <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{acl.name}</td>
              <td style={{ ...tdStyle, color: acl.description ? 'var(--fg-body)' : 'var(--fg-subtle)' }}>{acl.description || '-'}</td>
              <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{formatDate(acl.created)}</td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" style={iconBtnStyle} onClick={() => onManagePermissions(acl)} aria-label="Manage role permissions">
                    <ShieldCheck size={13} />
                  </button>
                  <button type="button" style={iconBtnStyle} onClick={() => onEdit(acl)} aria-label="Edit ACL">
                    <Pencil size={13} />
                  </button>
                  <button type="button" style={{ ...iconBtnStyle, color: 'var(--danger-500)' }} onClick={() => onDelete(acl)} aria-label="Delete ACL">
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

export default AclsTable
