
function Field({ label, help, full = false, children }) {
  return (
    <div className={`form-field${full ? ' form-field--full' : ''}`}>
      <span className="form-label">{label}</span>
      {children}
      {help && <span className="form-help">{help}</span>}
    </div>
  )
}

export default Field
