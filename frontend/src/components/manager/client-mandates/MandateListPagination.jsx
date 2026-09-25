import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../../shared/Button'

function MandateListPagination({ page, pages, total, onChange }) {
  if (pages <= 1) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
        Page {page} of {pages} · {total} records
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={13} />Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next<ChevronRight size={13} />
        </Button>
      </div>
    </div>
  )
}

export default MandateListPagination
