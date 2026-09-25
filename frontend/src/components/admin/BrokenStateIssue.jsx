// BrokenStateIssue - one detected data-integrity issue (from GET /api/admin/broken-states)
// rendered as a table of affected rows plus the admin fix actions for that issue type.

import { useState } from 'react'
import DataTable from '../shared/DataTable'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import ConfirmDialog from '../shared/ConfirmDialog'
import { tdStyle } from '../shared/tableStyles'
import { formatDate } from '../../utils/helpers'
import * as api from '../../services/api'

// Per issue type: explanation, table columns, cell values, and the fix actions.
// An action with `confirm` asks before running; `run` performs the API call and
// returns the success message.
const ISSUE_CONFIG = {
  orphaned_mandates: {
    hint: 'These mandates have missing or deleted manager references. They should be reassigned or deleted.',
    columns: ['ID', 'CLIENT NAME', 'MISSING MANAGER ID'],
    cells: item => [item.id, item.client_name, item.manager_id],
    actions: [
      {
        label: 'Archive',
        variant: 'secondary',
        confirm: () => 'Are you sure you want to archive this orphaned mandate?',
        run: async item => {
          await api.patch(`/api/admin/mandates/${item.id}/force-status`, { archived: true })
          return 'Mandate archived successfully'
        },
      },
      {
        label: 'Delete',
        variant: 'danger',
        confirm: () => 'Are you sure you want to delete this orphaned mandate?',
        run: async item => {
          await api.delete(`/api/admin/mandates/${item.id}/force-delete`, { data: { confirmText: item.client_name } })
          return 'Mandate deleted successfully'
        },
      },
    ],
  },
  invalid_requirements: {
    hint: "These client team members reference requirements that don't exist. Clear or reassign them.",
    columns: ['CT ID', 'MANDATE ID', 'USER ID', 'INVALID REQ ID'],
    cells: item => [item.id, item.mandate_id, item.user_id, item.requirement_id],
    actions: [
      {
        label: 'Clear Reference',
        variant: 'secondary',
        confirm: () => 'Clear invalid requirement reference?',
        run: async item => {
          await api.post(`/api/admin/client-teams/${item.id}/reassign-requirement`, { requirementId: null })
          return 'Requirement reference cleared'
        },
      },
    ],
  },
  stuck_interviews: {
    hint: 'These interviews have been "in progress" for over 7 days. They may have crashed or been abandoned.',
    columns: ['ID', 'TYPE', 'SCHEDULED', 'CREATED'],
    cells: item => [item.id, item.type, item.scheduled_at ? formatDate(item.scheduled_at) : '-', formatDate(item.created)],
    actions: ['completed', 'cancelled'].map(status => ({
      label: status === 'completed' ? 'Complete' : 'Cancel',
      variant: status === 'completed' ? 'secondary' : 'danger',
      run: async item => {
        await api.patch(`/api/admin/interviews/${item.id}/force-status`, {
          status,
          reason: 'Stuck interview auto-resolved by admin',
        })
        return `Interview marked as ${status}`
      },
    })),
  },
}

function BrokenStateIssue({ issue, onFixed, onError }) {
  const [fixing, setFixing] = useState(false)
  const [pending, setPending] = useState(null) // { action, item } awaiting confirmation

  const config = ISSUE_CONFIG[issue.type]

  async function runAction(action, item) {
    setFixing(true)
    try {
      onFixed(await action.run(item))
    } catch (err) {
      onError(`Failed: ${err.message}`)
    } finally {
      setFixing(false)
    }
  }

  function handleAction(action, item) {
    if (action.confirm) setPending({ action, item })
    else runAction(action, item)
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__body" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h3 className="admin-panel__title" style={{ color: 'var(--danger-600)' }}>{issue.description}</h3>
          <p className="admin-panel__hint" style={{ marginBottom: 0 }}>
            {config?.hint || 'Unrecognised issue type.'} <code>{issue.type}</code>
          </p>
        </div>
        <Badge variant="danger">{issue.count} affected</Badge>
      </div>

      {config && (
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <DataTable
            columns={[...config.columns, 'ACTIONS']}
            items={issue.items}
            getRowKey={item => item.id}
            renderRow={item => (
              <>
                {config.cells(item).map((value, i) => <td key={i} style={tdStyle}>{value}</td>)}
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {config.actions.map(action => (
                      <Button key={action.label} size="sm" variant={action.variant} disabled={fixing} onClick={() => handleAction(action, item)}>
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </td>
              </>
            )}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => runAction(pending.action, pending.item)}
        title={pending?.action.label}
        message={pending?.action.confirm?.()}
        confirmText={pending?.action.label}
        danger={pending?.action.variant === 'danger'}
      />
    </div>
  )
}

export default BrokenStateIssue
