// tableStyles - inline style objects shared by DataTable and the admin table rows
// that render their own cells. Lives outside DataTable.jsx so that file exports
// only a component (keeps Vite fast refresh working).

export const tdStyle = { padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }

export const iconBtnStyle = {
  background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8,
  padding: '6px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
}
