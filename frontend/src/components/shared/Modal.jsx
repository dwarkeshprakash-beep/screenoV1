import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * @param {boolean} open - controls visibility
 * @param {Function} onClose - called when user dismisses
 * @param {string} title - modal heading
 * @param {'sm'|'md'|'lg'} size
 */
function Modal({ open, onClose, title, children, size = 'md' }) {
  const modalRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function handleKey(event) {
      if (event.key === 'Escape') onClose()
      
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements || focusableElements.length === 0) return
        
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            event.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            event.preventDefault()
          }
        }
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKey)
    
    const focusTimeout = setTimeout(() => {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements && focusableElements.length > 0) {
            const input = Array.from(focusableElements).find(el => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
            if (input) input.focus()
            else focusableElements[0].focus()
        }
    }, 10)

    return () => {
      clearTimeout(focusTimeout)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="product-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={`product-modal product-modal--${size}`} ref={modalRef}>
        <div className="product-modal__header">
          <h2 id="modal-title" className="product-modal__title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="product-modal__close">
            <X size={17} />
          </button>
        </div>
        <div className="product-modal__body">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export default Modal
