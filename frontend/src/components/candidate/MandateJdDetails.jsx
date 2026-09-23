// MandateJdDetails - collapsible "Job description" block on a candidate's mandate card.
// Only rendered once the manager has sent the JD (the backend withholds jd_text until
// jd_sent). `defaultOpen` expands it when the candidate arrived from the JD email link.
import { parseStoredArray } from '../../utils/helpers'

function MandateJdDetails({ jdText, tags, defaultOpen = false }) {
  // Tags may arrive as a JSON string or an array
  const tagList = parseStoredArray(tags)

  if (!jdText && tagList.length === 0) return null

  return (
    <details
      open={defaultOpen}
      style={{ margin: '10px 0', border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface-alt)', overflow: 'hidden' }}
    >
      <summary style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--fg-primary)' }}>
        Job description and focus areas
      </summary>
      <div style={{ padding: '0 12px 12px', fontSize: 12, color: 'var(--fg-body)', lineHeight: 1.65 }}>
        {tagList.length > 0 && (
          <div className="tag-list" style={{ marginBottom: jdText ? 10 : 0 }}>
            {tagList.map(tag => <span className="tag" key={tag}>{tag}</span>)}
          </div>
        )}
        {jdText && (
          <div style={{ whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto' }}>
            {jdText}
          </div>
        )}
      </div>
    </details>
  )
}

export default MandateJdDetails
