// ModulesTable - renders the global module catalog list. Modules can only be
// renamed, not created or deleted - clicking a row's name opens the rename modal.

import DataTable, { tdStyle } from '../shared/DataTable'

function ModulesTable({ modules, onEdit }) {
  return (
    <DataTable
      columns={['NAME', 'KEY']}
      items={modules}
      getRowKey={module => module.id}
      onRowClick={onEdit}
      renderRow={module => (
        <>
          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{module.name}</td>
          <td style={{ ...tdStyle, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{module.key}</td>
        </>
      )}
    />
  )
}

export default ModulesTable
