// FormActions - Cancel/Submit button row shared by every admin create/edit modal.

import Button from './Button'

function FormActions({ onCancel, saving, submitLabel, cancelLabel = 'Cancel' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
      <Button variant="secondary" type="button" onClick={onCancel}>{cancelLabel}</Button>
      <Button type="submit" loading={saving}>{submitLabel}</Button>
    </div>
  )
}

export default FormActions
