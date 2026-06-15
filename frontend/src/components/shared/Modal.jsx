import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * @param {boolean} open - controls visibility
 * @param {Function} onClose - called when user dismisses
 * @param {string} title - modal heading
 * @param {'sm'|'md'|'lg'} size
 */
function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined

    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="product-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={`product-modal product-modal--${size}`}>
        <div className="product-modal__header">
          <h2 id="modal-title" className="product-modal__title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="product-modal__close">
            <X size={17} />
          </button>
        </div>
        <div className="product-modal__body">{children}</div>
      </div>
    </div>
  )
}

export default Modal
