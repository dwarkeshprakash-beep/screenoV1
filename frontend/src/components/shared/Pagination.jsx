// Pagination - page-size selector + previous/next pager for a server-paginated list.
// Every page/page-size change is expected to trigger a fresh API call from the parent -
// this component holds no data itself, only the current page/pageSize/totalPages it's given.

import { ChevronDown } from 'lucide-react'

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function Pagination({ page, pageSize, totalPages, pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS, onPageChange, onPageSizeChange }) {
  const btnStyle = disabled => ({
    padding: '6px 12px', border: '1px solid var(--border-default)', borderRadius: 8,
    background: 'var(--bg-surface)', color: disabled ? 'var(--fg-subtle)' : 'var(--fg-primary)',
    fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
  })
  const selectStyle = {
    appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
    padding: '6px 26px 6px 10px', border: '1px solid var(--border-default)', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-surface)', color: 'var(--fg-primary)', cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '14px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Rows per page</span>
        <div style={{ position: 'relative' }}>
          <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))} style={selectStyle}>
            {pageSizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
          <ChevronDown
            size={13}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Page {page} of {totalPages}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={btnStyle(page <= 1)}>
            Previous
          </button>
          <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} style={btnStyle(page >= totalPages)}>
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default Pagination
