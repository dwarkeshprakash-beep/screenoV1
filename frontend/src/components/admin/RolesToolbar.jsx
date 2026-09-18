// RolesToolbar — company picker + role count + "Add Role" action, shown above the roles table.

import { ShieldPlus, ChevronDown } from 'lucide-react'

function RolesToolbar({ companies, companyId, onCompanyChange, roleCount, showCount, onAdd }) {
  const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }
  const selectStyle = {
    appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
    padding: '8px 32px 8px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-surface)', color: 'var(--fg-primary)',
    minWidth: 200, cursor: 'pointer',
  }
  const selectedCompanyName = companies.find(c => c.id === companyId)?.name

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap',
      padding: '16px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface-alt)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="role-company" style={labelStyle}>Company</label>
        <div style={{ position: 'relative' }}>
          <select id="role-company" value={companyId || ''} onChange={e => onCompanyChange(Number(e.target.value))} style={selectStyle}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown
            size={14}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {showCount && (
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {roleCount} role{roleCount === 1 ? '' : 's'}{selectedCompanyName ? ` at ${selectedCompanyName}` : ''}
          </span>
        )}
        <button
          type="button"
          disabled={!companyId}
          onClick={onAdd}
          style={{
            background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, borderRadius: 8,
            fontWeight: 600, fontSize: 13, padding: '9px 16px', cursor: companyId ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: 6, opacity: companyId ? 1 : 0.6,
          }}
        >
          <ShieldPlus size={14} /> Add Role
        </button>
      </div>
    </div>
  )
}

export default RolesToolbar
