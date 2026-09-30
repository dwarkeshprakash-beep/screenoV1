// MultiSelect - dropdown of checkable options; selections shown as removable chips on the trigger.
// The option list is portaled to <body> and positioned with fixed coordinates so it can
// never get clipped by a scrollable ancestor (e.g. a modal body) - it flips above the
// trigger when there isn't enough room below.

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'

const DROPDOWN_MAX_HEIGHT = 180

function MultiSelect({ options, selectedIds, onChange, placeholder = 'Select…', emptyMessage = 'No options available' }) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const containerRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handleOutside(event) {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    function handleScrollOrResize() { setOpen(false) }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  function handleTriggerClick() {
    if (open) {
      setOpen(false)
      return
    }
    const rect = containerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpward = spaceBelow < DROPDOWN_MAX_HEIGHT + 12 && rect.top > spaceBelow
    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    })
    setOpen(true)
  }

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
        onClick={handleTriggerClick}
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

      {open && menuStyle && createPortal(
        <div
          ref={menuRef}
          style={{
            ...menuStyle, zIndex: 1100,
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8,
            boxShadow: 'var(--shadow-md)', maxHeight: DROPDOWN_MAX_HEIGHT, overflowY: 'auto',
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  )
}

export default MultiSelect
