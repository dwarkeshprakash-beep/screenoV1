// FormError - inline submit-error line shared by every admin create/edit modal.

function FormError({ message }) {
  if (!message) return null
  return <p style={{ fontSize: 12, color: 'var(--danger-500)', margin: 0 }}>{message}</p>
}

export default FormError
