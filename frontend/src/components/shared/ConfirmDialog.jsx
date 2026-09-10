import Modal from './Modal'

/**
 * @param {boolean} open
 * @param {Function} onClose - called on cancel/dismiss
 * @param {Function} onConfirm - called on confirm
 * @param {string} title
 * @param {string} message
 * @param {string} [confirmText='Confirm']
 * @param {string} [cancelText='Cancel']
 * @param {boolean} [danger=false]
 */
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div style={{ marginBottom: 'var(--space-6)', color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>
        {message}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
        <button
          type="button"
          onClick={onClose}
          className="product-button product-button--secondary product-button--md"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={`product-button product-button--${danger ? 'danger' : 'primary'} product-button--md`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
