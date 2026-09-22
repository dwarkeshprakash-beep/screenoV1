// ModulesTable - renders the global module catalog list. Modules can only be
// renamed, not created or deleted - clicking a row's name opens the rename modal.
// The ACL column shows which ACL (for the selected company) gates this module, or
// a dropdown to assign one - each ACL can only ever gate one module, so already
// assigned ACLs never show up as an option here.

import DataTable, { tdStyle } from '../shared/DataTable'
import { ChevronDown } from 'lucide-react'

const aclBadgeStyle = {
  display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  background: 'var(--brand-50)', color: 'var(--brand-700)',
}

function AclAssignSelect({ module, unassignedAcls, onAssignAcl }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
      <select
        value=""
        onChange={e => { if (e.target.value) onAssignAcl(module, Number(e.target.value)) }}
        style={{
          appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
          padding: '6px 28px 6px 10px', border: '1px solid var(--border-default)', borderRadius: 8,
          fontSize: 12, fontFamily: 'inherit', background: 'var(--bg-surface)', color: 'var(--fg-muted)',
          cursor: unassignedAcls.length === 0 ? 'not-allowed' : 'pointer',
        }}
        disabled={unassignedAcls.length === 0}
      >
        <option value="" disabled>{unassignedAcls.length === 0 ? 'No ACLs to assign' : 'Assign ACL…'}</option>
        {unassignedAcls.map(acl => <option key={acl.id} value={acl.id}>{acl.name}</option>)}
      </select>
      <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
    </div>
  )
}

function ModulesTable({ modules, unassignedAcls, onEdit, onAssignAcl }) {
  return (
    <DataTable
      columns={['NAME', 'KEY', 'ACL']}
      items={modules}
      getRowKey={module => module.id}
      onRowClick={onEdit}
      renderRow={module => (
        <>
          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{module.name}</td>
          <td style={{ ...tdStyle, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{module.key}</td>
          <td style={tdStyle}>
            {module.acl ? (
              <span style={aclBadgeStyle}>{module.acl.name}</span>
            ) : (
              <AclAssignSelect module={module} unassignedAcls={unassignedAcls} onAssignAcl={onAssignAcl} />
            )}
          </td>
        </>
      )}
    />
  )
}

export default ModulesTable
