// RowActions - Edit/Delete icon-button pair shared by the admin CRUD list tables.

import { Pencil, Trash2 } from 'lucide-react'
import { iconBtnStyle } from './DataTable'

function RowActions({ entityLabel, onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button type="button" style={iconBtnStyle} onClick={e => { e.stopPropagation(); onEdit() }} aria-label={`Edit ${entityLabel}`}>
        <Pencil size={13} />
      </button>
      <button type="button" style={{ ...iconBtnStyle, color: 'var(--danger-500)' }} onClick={e => { e.stopPropagation(); onDelete() }} aria-label={`Delete ${entityLabel}`}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export default RowActions
