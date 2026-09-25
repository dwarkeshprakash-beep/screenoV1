import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { formatDate } from '../../../utils/helpers'
import { mandateStatusLabel, mandateStatusPillClass } from './mandateHelpers'

function MandateListView({ templates, basePath = '/manager' }) {
  return (
    <div className="workspace-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', fontSize: 11, background: 'var(--bg-surface-alt)' }}>
              <th style={{ padding: '11px 14px' }}>Client</th>
              <th style={{ padding: '11px 14px' }}>Role / requirement</th>
              <th style={{ padding: '11px 14px' }}>Positions</th>
              <th style={{ padding: '11px 14px' }}>JD</th>
              <th style={{ padding: '11px 14px' }}>Last modified</th>
              <th style={{ padding: '11px 14px' }}>Status</th>
              <th style={{ padding: '11px 14px', width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {templates.map(template => (
              <tr key={template.id} style={{ borderTop: '1px solid var(--border-default)', color: 'var(--fg-primary)', fontSize: 12 }}>
                <td style={{ padding: '12px 14px' }}>
                  <strong style={{ display: 'block', fontSize: 13 }}>{template.client_name}</strong>
                  <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{template.client_email || 'No client email'}</span>
                </td>
                <td style={{ padding: '12px 14px', maxWidth: 320 }}>{template.requirements || 'Role not specified'}</td>
                <td style={{ padding: '12px 14px' }}>{template.hired_count ?? 0} hired / {template.headcount ?? 1}</td>
                <td style={{ padding: '12px 14px' }}>{(template.jd_text || template.jd_file_path) ? 'Ready' : 'Missing'}</td>
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>{formatDate(template.updated_at || template.created)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    <span className={'status-pill ' + (template.archived_at ? '' : 'status-pill--brand')}>{template.archived_at ? 'Archived' : 'Active'}</span>
                    {mandateStatusLabel(template.current_status) && (
                      <span className={`status-pill ${mandateStatusPillClass(template.current_status)}`}>{mandateStatusLabel(template.current_status)}</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <Link className="product-button product-button--secondary product-button--sm" to={`${basePath}/clients/${template.id}`}>Open <ArrowRight size={12} /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MandateListView
