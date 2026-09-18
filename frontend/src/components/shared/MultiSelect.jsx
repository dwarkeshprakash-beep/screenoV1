// MultiSelect - dropdown of checkable options; selections shown as removable chips on the trigger.

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

function MultiSelect({ options, selectedIds, onChange, placeholder = 'Select…', emptyMessage = 'No options available' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handleOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function toggleOption(id) {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange([...next])
  }

  function removeOption(id, event) {
    event.stopPropagation()
    onChange(selectedIds.filter(existing => existing !== id))
  }

  const selectedOptions = options.filter(o => selectedIds.includes(o.id))

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minHeight: 40,
          padding: '6px 32px 6px 10px', border: '1px solid var(--border-default)', borderRadius: 8,
          background: 'var(--bg-surface)', cursor: 'pointer', position: 'relative',
        }}
      >
        {selectedOptions.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>{placeholder}</span>
        ) : (
          selectedOptions.map(o => (
            <span
              key={o.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                borderRadius: 999, background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 12, fontWeight: 600,
              }}
            >
              {o.name}
              <button
                type="button"
                onClick={e => removeOption(o.id, e)}
                aria-label={`Remove ${o.name}`}
                style={{ background: 'none', border: 0, padding: 0, display: 'inline-flex', cursor: 'pointer', color: 'var(--brand-700)' }}
              >
                <X size={11} />
              </button>
            </span>
          ))
        )}
        <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8,
          boxShadow: 'var(--shadow-md)', maxHeight: 180, overflowY: 'auto',
        }}>
          {options.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--fg-subtle)' }}>{emptyMessage}</div>
          ) : (
            options.map(o => (
              <label
                key={o.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface-alt)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)' }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(o.id)}
                  onChange={() => toggleOption(o.id)}
                  style={{ accentColor: 'var(--brand-500)', cursor: 'pointer' }}
                />
                {o.name}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default MultiSelect
