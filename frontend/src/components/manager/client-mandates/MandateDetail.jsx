import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, FileText, Mail, Plus, Search,
  Sparkles, Trash2, UserCheck, AlertCircle,
} from 'lucide-react'
import Avatar from '../../shared/Avatar'
import Button from '../../shared/Button'
import EmptyState from '../../shared/EmptyState'
import ErrorMessage from '../../shared/ErrorMessage'
import Modal from '../../shared/Modal'
import ConfirmDialog from '../../shared/ConfirmDialog'
import DeleteMandateModal from '../DeleteMandateModal'
import InterviewFlowModal from '../InterviewFlowModal'
import Spinner from '../../shared/Spinner'
import * as api from '../../../services/api'
import { formatDate, formatDateTime, serializeDatetimeLocal } from '../../../utils/helpers'
import EditMandateModal from './EditMandateModal'
import RequirementModal from './RequirementModal'
import AddProspectsModal from './AddProspectsModal'
import CandidateActionModal from './CandidateActionModal'
import MandateReportDetailModal from './MandateReportDetailModal'
import SendJDModal from './SendJDModal'
import ScheduleClientTeamModal from './ScheduleClientTeamModal'
import OutcomeRoundsModal from './OutcomeRoundsModal'
import { parseTags, MANDATE_STATUS_STEPS, mandateStatusPillClass, requirementMeta, INTERVIEW_TYPES } from './mandateHelpers'

function MandateDetail({ initialTemplate, basePath = '/manager' }) {
  const navigate = useNavigate()
  const { setPageMeta } = useOutletContext()
  const [template, setTemplate] = useState(initialTemplate)
  const [tab, setTab] = useState('overview')
  const [requirements, setRequirements] = useState([])
  const [requirementsError, setRequirementsError] = useState(null)
  const [statusSummary, setStatusSummary] = useState(null)
  const [statusError, setStatusError] = useState(null)
  const [reqModal, setReqModal] = useState(null)
  const [members, setMembers] = useState([])
  const [clientTeam, setClientTeam] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loadCandidatesError, setLoadCandidatesError] = useState(null)
  const [loadClientTeamError, setLoadClientTeamError] = useState(null)
  const [reports, setReports] = useState([])
  const [reportsError, setReportsError] = useState(null)
  const [flowRuns, setFlowRuns] = useState([])
  const [scheduleRows, setScheduleRows] = useState([])
  const [flowRunsError, setFlowRunsError] = useState(null)
  const [scheduleQuery, setScheduleQuery] = useState('')
  const [scheduleKind, setScheduleKind] = useState('all')
  const [scheduleStatus, setScheduleStatus] = useState('all')
  const [scheduleType, setScheduleType] = useState('all')
  const [retryDates, setRetryDates] = useState({})
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportDetailLoading, setReportDetailLoading] = useState(false)
  const [reportDetailError, setReportDetailError] = useState(null)
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [candidateSection, setCandidateSection] = useState('team')
  const [query, setQuery] = useState('')
  const [memberLimit, setMemberLimit] = useState(30)
  const [message, setMessage] = useState(null) // { text: string, type: 'success' | 'error' }
  const [editOpen, setEditOpen] = useState(false)
  const [deleteMandateOpen, setDeleteMandateOpen] = useState(false)
  const [addProspectsOpen, setAddProspectsOpen] = useState(false)
  const [candidateActionTarget, setCandidateActionTarget] = useState(null)
  const [addingCandidateId, setAddingCandidateId] = useState(null)
  const [candidateActionError, setCandidateActionError] = useState(null)
  const [sendJdTarget, setSendJdTarget] = useState(null)
  const [scheduleTarget, setScheduleTarget] = useState(null)
  const [scheduleChoiceTarget, setScheduleChoiceTarget] = useState(null)
  const [flowTarget, setFlowTarget] = useState(null)
  const [flowEditTarget, setFlowEditTarget] = useState(null)
  const [roundsTarget, setRoundsTarget] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: () => { } })
  const tags = parseTags(template.tags)
  const isArchived = !!template.archived_at

  useEffect(() => {
    setPageMeta({
      title: `Client Mandate · ${template.client_name}`,
      subtitle: template.requirements || 'Manage candidates, interviews, and outcomes',
    })
    return () => setPageMeta(null)
  }, [setPageMeta, template.client_name, template.requirements])

  function handleArchive() {
    setConfirmDialog({
      open: true,
      title: 'Archive Mandate',
      message: 'Archive this client mandate? It will become read-only, but existing interviews will continue.',
      danger: true,
      confirmText: 'Archive',
      onConfirm: async () => {
        try {
          const res = await api.archiveClientTemplate(template.id)
          setTemplate(res.data)
          setMessage({ text: 'Mandate archived.', type: 'success' })
        } catch (err) { setMessage({ text: err.message || 'Could not archive mandate.', type: 'error' }) }
      }
    })
  }

  async function handleRestore() {
    try {
      const res = await api.restoreClientTemplate(template.id)
      setTemplate(res.data)
      setMessage({ text: 'Mandate restored.', type: 'success' })
    } catch (err) { setMessage({ text: err.message || 'Could not restore mandate.', type: 'error' }) }
  }

  function handleMarkComplete() {
    setConfirmDialog({
      open: true,
      title: 'Mark mandate complete',
      message: 'Mark this mandate as complete? Use this when the position is filled or the mandate is otherwise done, even if not every candidate has a final client interview outcome.',
      confirmText: 'Mark complete',
      onConfirm: async () => {
        try {
          const res = await api.markMandateComplete(template.id)
          setStatusSummary(res.data)
          setMessage({ text: 'Mandate marked complete.', type: 'success' })
        } catch (err) { setMessage({ text: err.message || 'Could not mark mandate complete.', type: 'error' }) }
      }
    })
  }

  const loadRequirements = useCallback(async () => {
    setRequirementsError(null)
    try {
      const r = await api.getMandateRequirements(template.id)
      setRequirements(r.data || [])
    } catch (err) {
      setRequirementsError(err.message || 'Failed to load requirement profiles')
      // Keep previous data if exists instead of clearing
    }
  }, [template.id])

  const loadStatus = useCallback(async () => {
    setStatusError(null)
    try {
      const r = await api.getMandateStatus(template.id)
      setStatusSummary(r.data)
    } catch (err) {
      setStatusError(err.message || 'Failed to load mandate status')
    }
  }, [template.id])

  const loadCandidates = useCallback(async () => {
    setLoadCandidatesError(null)
    setLoadingCandidates(true)
    try {
      const [memberRes, assignmentRes] = await Promise.all([
        api.getTemplateMatches(template.id),
        api.getTemplateAssignments(template.id),
      ])
      setMembers(memberRes.data || [])
      setAssignments(assignmentRes.data || [])
    } catch (err) {
      setLoadCandidatesError(err.message || 'Failed to load candidates')
      // Keep previous data
    }
    finally { setLoadingCandidates(false) }
  }, [template.id])

  const loadClientTeam = useCallback(async () => {
    setLoadClientTeamError(null)
    setLoadingTeam(true)
    try {
      const r = await api.getClientTeam(template.id)
      setClientTeam(r.data || [])
    } catch (err) {
      setLoadClientTeamError(err.message || 'Failed to load client team')
      // Keep previous data
    }
    finally { setLoadingTeam(false) }
  }, [template.id])

  useEffect(() => { void loadRequirements() }, [loadRequirements])
  useEffect(() => { void loadStatus() }, [loadStatus])
  useEffect(() => { if (tab === 'candidates') void loadCandidates() }, [tab, loadCandidates])
  useEffect(() => { if (tab === 'team') void loadClientTeam() }, [tab, loadClientTeam])
  useEffect(() => {
    setReportsError(null)
    if (tab !== 'reports') return
    async function loadReports() {
      try {
        const r = await api.getTeamReports('client')
        setReports((r.data?.reports || []).filter(rp => Number(rp.client_template_id) === Number(template.id)))
      } catch (err) {
        setReportsError(err.message || 'Failed to load reports')
      }
    }
    loadReports()
  }, [tab, template.id])
  useEffect(() => {
    if (tab !== 'flows') return
    setFlowRunsError(null)
    async function loadFlowRuns() {
      try {
        const [runsResponse, schedulesResponse] = await Promise.all([
          api.getMandateInterviewFlowRuns(template.id),
          api.getMandateSchedules(template.id),
        ])
        setFlowRuns(runsResponse.data || [])
        setScheduleRows(schedulesResponse.data || [])
      } catch (err) {
        setFlowRunsError(err.message || 'Failed to load schedules')
      }
    }
    loadFlowRuns()
  }, [tab, template.id])

  const teamMembers = useMemo(() => members.filter(m => m.in_team), [members])
  const otherMembers = useMemo(() => members.filter(m => !m.in_team), [members])
  const activeList = candidateSection === 'team' ? teamMembers : otherMembers

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return activeList
    return activeList.filter(m =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
      || String(m.email || '').toLowerCase().includes(q)
      || String(m.current_position || '').toLowerCase().includes(q)
    )
  }, [activeList, query])
  const displayedMembers = visibleMembers.slice(0, memberLimit)

  useEffect(() => { setMemberLimit(30) }, [query, candidateSection, template.id])

  function removeFromTeam(member) {
    setConfirmDialog({
      open: true,
      title: 'Remove Team Member',
      message: `Remove ${member.first_name} ${member.last_name} from the client team?`,
      danger: true,
      confirmText: 'Remove',
      onConfirm: async () => {
        setRemovingId(member.id)
        try {
          await api.removeFromClientTeam(template.id, member.id)
          await loadClientTeam()
          setMessage({ text: `${member.first_name} ${member.last_name} removed from client team.`, type: 'success' })
        } catch (err) { setMessage({ text: err.message || 'Could not remove from team.', type: 'error' }) }
        finally { setRemovingId(null) }
      }
    })
  }

  function cancelAssignment(assignment) {
    const name = `${assignment.candidate_first || ''} ${assignment.candidate_last || ''}`.trim()
    setConfirmDialog({
      open: true,
      title: 'Cancel Interview',
      message: `Cancel the scheduled interview for ${name}?`,
      danger: true,
      confirmText: 'Cancel Interview',
      onConfirm: async () => {
        setCancellingId(assignment.id)
        try {
          await api.cancelTemplateAssignment(template.id, assignment.id)
          await loadCandidates()
          setMessage({ text: `Scheduled interview for ${name} was cancelled.`, type: 'success' })
        } catch (err) { setMessage({ text: err.message || 'Could not cancel the interview.', type: 'error' }) }
        finally { setCancellingId(null) }
      }
    })
  }

  function viewCandidateProfile(candidate) {
    if (!candidate) return
    if (candidate.team_member_id) {
      navigate(`/workspace/team/${candidate.team_member_id}`)
    } else if (candidate.role || candidate.employee_id !== undefined) {
      navigate(`/workspace/organization/${candidate.id}`)
    }
  }

  async function addCandidateFromBrowse(candidate, requirementId) {
    if (!candidate?.id) return
    setAddingCandidateId(candidate.id)
    setCandidateActionError(null)
    try {
      await api.addProspects(template.id, {
        userIds: [{
          userId: candidate.id,
          requirementId: requirementId ? Number(requirementId) : null,
        }],
      })
      setCandidateActionTarget(null)
      setMessage({ text: `${candidate.first_name || 'Candidate'} added to the client team.`, type: 'success' })
      await Promise.all([loadClientTeam(), loadCandidates()])
    } catch (err) {
      setCandidateActionError(err.message || 'Could not add candidate.')
    } finally {
      setAddingCandidateId(null)
    }
  }

  async function openMandateReport(report) {
    setSelectedReport(report)
    setReportDetailLoading(true)
    setReportDetailError(null)
    try {
      const response = report.interview_id
        ? await api.getReportByInterview(report.interview_id)
        : await api.getReportDetail(report.id)
      setSelectedReport({ ...report, ...(response.data || {}) })
    } catch (err) {
      setReportDetailError(err.message || 'Could not load report detail.')
    } finally {
      setReportDetailLoading(false)
    }
  }

  const groupedFlowRuns = [...flowRuns.reduce((map, row) => {
    if (!map.has(row.run_id)) map.set(row.run_id, { ...row, stages: [] })
    map.get(row.run_id).stages.push(row)
    return map
  }, new Map()).values()]

  const scheduleMatchesQuery = item => {
    const normalized = scheduleQuery.trim().toLowerCase()
    if (!normalized) return true
    return [item.candidate_first, item.candidate_last, item.candidate_email, item.flow_name, item.stage_name]
      .some(value => String(value || '').toLowerCase().includes(normalized))
  }
  const scheduleMatchesStatus = status => {
    if (scheduleStatus === 'all') return true
    if (scheduleStatus === 'upcoming') return !['completed', 'cancelled'].includes(status)
    return status === scheduleStatus
  }
  const visibleSingleSchedules = scheduleRows.filter(row => (
    !row.flow_stage_run_id
    && scheduleKind !== 'flow'
    && scheduleMatchesQuery(row)
    && scheduleMatchesStatus(row.status)
    && (scheduleType === 'all' || row.type === scheduleType)
  ))
  const visibleFlowRuns = groupedFlowRuns.filter(run => (
    scheduleKind !== 'single'
    && scheduleMatchesQuery(run)
    && scheduleMatchesStatus(run.run_status)
    && (scheduleType === 'all' || run.stages.some(stage => stage.type === scheduleType))
  ))

  async function refreshFlowRuns() {
    const [runsResponse, schedulesResponse] = await Promise.all([
      api.getMandateInterviewFlowRuns(template.id),
      api.getMandateSchedules(template.id),
    ])
    setFlowRuns(runsResponse.data || [])
    setScheduleRows(schedulesResponse.data || [])
  }

  async function continuePausedRun(runId) {
    try {
      await api.continueInterviewFlowRun(runId)
      await refreshFlowRuns()
    } catch (err) { setFlowRunsError(err.message || 'Could not continue flow') }
  }

  async function processExpiredRun(runId) {
    try {
      setFlowRunsError(null)
      await api.processExpiredInterviewFlowRun(runId)
      await refreshFlowRuns()
      setMessage({ text: 'Expired stage processed and flow progression applied.', type: 'success' })
    } catch (err) {
      setFlowRunsError(err.message || 'Could not process the expired stage')
    }
  }

  async function retryPausedRun(runId) {
    const value = retryDates[runId]
    if (!value) { setFlowRunsError('Choose a new retry date and time.'); return }
    try {
      await api.retryInterviewFlowRun(runId, serializeDatetimeLocal(value))
      await refreshFlowRuns()
    } catch (err) { setFlowRunsError(err.message || 'Could not retry stage') }
  }

  function deleteCandidateFlow(run) {
    setConfirmDialog({
      open: true,
      title: 'Delete candidate interview flow',
      message: `Permanently delete ${run.candidate_first} ${run.candidate_last}'s flow, including its interviews, reports, feedback, and completed history?`,
      danger: true,
      confirmText: 'Delete flow',
      onConfirm: async () => {
        try {
          await api.deleteInterviewFlowRun(run.run_id)
          await refreshFlowRuns()
          setMessage({ text: 'Candidate interview flow deleted.', type: 'success' })
        } catch (err) {
          setFlowRunsError(err.message || 'Could not delete candidate interview flow')
        }
      },
    })
  }

  return (
    <div className="workspace-page mandate-detail-page">
      <div className="mandate-detail-toolbar">
        <Link className="detail-header__back" to={`${basePath}/clients`}><ArrowLeft size={15} />All mandates</Link>
        <div className="workspace-tabs" aria-label="Mandate sections">
          {[['overview', 'Overview'], ['jd', 'Job description'], ['candidates', 'Candidates'], ['team', 'Client team'], ['flows', 'Schedules'], ['reports', 'Reports']].map(([id, label]) => (
            <button key={id} type="button" className={`workspace-tabs__button${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div className="mandate-detail-toolbar__actions">
          {statusSummary?.current_status_label && (
            <span className={`status-pill ${mandateStatusPillClass(statusSummary.current_status)}`}>{statusSummary.current_status_label}</span>
          )}
          {isArchived && <span className="status-pill">Archived</span>}
          {isArchived ? (
            <>
              <Button variant="secondary" onClick={() => handleRestore()}>Restore mandate</Button>
              <Button variant="danger" onClick={() => setDeleteMandateOpen(true)}>Delete mandate</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit mandate</Button>
              <Button variant="secondary" onClick={() => handleArchive()}>Archive</Button>
            </>
          )}
        </div>
      </div>

      <div className="mandate-detail-scroll workspace-stack">
        {message && <div
          style={{
            padding: 11,
            borderRadius: 8,
            background: message.type === 'error' ? 'var(--danger-50)' : 'var(--success-50)',
            color: message.type === 'error' ? 'var(--danger-700)' : 'var(--success-700)',
            fontSize: 12,
            cursor: 'pointer'
          }}
          onClick={() => setMessage(null)}
        >
          {message.text}
        </div>}

        <div className="workspace-panel detail-panel">

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className="workspace-stack">
            <section>
              <div className="workspace-section-heading" style={{ marginBottom: 9 }}>
                <div><h3 style={{ fontSize: 15 }}>Mandate status</h3><p>Created by {statusSummary?.created_by_name || '-'}</p></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {statusSummary?.current_status_label && (
                    <span className={`status-pill ${mandateStatusPillClass(statusSummary.current_status)}`}>{statusSummary.current_status_label}</span>
                  )}
                  {statusSummary?.completed_at ? (
                    <span className="status-pill status-pill--success"><CheckCircle2 size={12} /> {formatDateTime(statusSummary.completed_at)}</span>
                  ) : (
                    !isArchived && (
                      <Button variant="secondary" size="sm" onClick={handleMarkComplete}><CheckCircle2 size={13} />Mark complete</Button>
                    )
                  )}
                </div>
              </div>
              {statusError && <ErrorMessage message={statusError} />}
              <div className="assignment-list">
                {MANDATE_STATUS_STEPS.map(step => {
                  const reached = statusSummary?.timeline?.find(entry => entry.status === step.status)
                  const isCurrent = statusSummary?.current_status === step.status
                  return (
                    <div className="assignment-row" key={step.status}>
                      <div className="assignment-row__content">
                        <strong style={{ color: reached ? 'var(--fg-primary)' : 'var(--fg-muted)' }}>
                          {reached ? <CheckCircle2 size={13} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--brand-500)' }} /> : <Clock size={13} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--fg-subtle)' }} />}
                          {step.label}{isCurrent ? ' (current)' : ''}
                        </strong>
                        <span>
                          {reached
                            ? `${formatDateTime(reached.at)}${reached.actor_name ? ` · ${reached.actor_name}` : ''}`
                            : 'Not yet reached'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <div className="detail-facts">
              {[['Client', template.client_name], ['Role', template.requirements || 'Not set'], ['Hiring target', template.headcount ?? 1], ['Hired', template.hired_count ?? 0], ['Pipeline', template.pipeline_count ?? 0], ['Client email', template.client_email || 'Not provided'], ['Created', formatDate(template.created)], ['Skills', tags.length]].map(([label, value]) => (
                <div className="detail-fact" key={label}><div className="detail-fact__label">{label}</div><div className="detail-fact__value">{value}</div></div>
              ))}
            </div>

            {template.custom_info && (
              <section>
                <div className="workspace-section-heading" style={{ marginBottom: 9 }}>
                  <div><h3 style={{ fontSize: 15 }}>Internal notes</h3><p>Context available to managers.</p></div>
                </div>
                <div style={{ padding: 15, borderRadius: 9, background: 'var(--slate-50)', color: 'var(--fg-body)', fontSize: 13, lineHeight: 1.65 }}>{template.custom_info}</div>
              </section>
            )}

            <section>
              <div className="workspace-section-heading" style={{ marginBottom: 9 }}>
                <div><h3 style={{ fontSize: 15 }}>Matching skills</h3></div>
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} disabled={isArchived}><Sparkles size={13} />Edit JD and skills</Button>
              </div>
              {tags.length > 0 ? <div className="tag-list">{tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
                : <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>No matching skills defined.</span>}
            </section>

            <section>
              <div className="workspace-section-heading" style={{ marginBottom: 12 }}>
                <div><h3 style={{ fontSize: 15 }}>Requirement profiles</h3><p>Define multiple profiles for this mandate (e.g. junior vs senior).</p></div>
                <Button size="sm" onClick={() => setReqModal('new')} disabled={isArchived}><Plus size={13} />Add profile</Button>
              </div>
              {requirementsError && <ErrorMessage message={requirementsError} />}
              {requirements.length === 0 && !requirementsError ? (
                <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>No requirement profiles yet. Add profiles to distinguish between different experience levels or roles within this mandate.</span>
              ) : (
                <div className="assignment-list">
                  {requirements.map(r => (
                    <div className="assignment-row" key={r.id}>
                      <div className="assignment-row__content">
                        <strong>{r.profile_name}</strong>
                        <span>
                          {r.years_min != null ? `${r.years_min}–${r.years_max ?? '+'}  yrs exp` : 'Experience not specified'} &middot; {r.hired_count ?? 0} hired / {r.headcount ?? 1} target &middot; {r.pipeline_count ?? 0} pipeline
                          {r.notes ? ` · ${r.notes}` : ''}
                        </span>
                        <span>
                          {(r.jd_text || r.jd_file_path) ? 'Role JD attached' : 'Uses mandate JD'}
                        </span>
                      </div>
                      <button type="button" className="danger-icon-button" style={{ background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}
                        onClick={() => setReqModal(r)} disabled={isArchived}>
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── JD tab ── */}
        {tab === 'jd' && (
          (template.jd_text || template.jd_file_path || requirements.some(r => r.jd_text || r.jd_file_path))
            ? <div className="workspace-stack" style={{ gap: 14 }}>
              <div className="workspace-section-heading">
                <div><h3 style={{ fontSize: 16 }}>Job description</h3><p>Used for matching, communication, and AI interview context.</p></div>
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} disabled={isArchived}><FileText size={13} />Edit mandate JD</Button>
              </div>
              {(template.jd_text || template.jd_file_path) && (
                <section>
                  <div className="workspace-section-heading" style={{ marginBottom: 8 }}>
                    <h4 style={{ fontSize: 13, margin: 0, color: 'var(--fg-primary)' }}>Mandate JD</h4>
                    {template.jd_file_url && (
                      <a href={template.jd_file_url} target="_blank" rel="noreferrer" className="product-button product-button--secondary product-button--sm">
                        <FileText size={12} />{template.jd_original_filename || 'Original file'}
                      </a>
                    )}
                  </div>
                  {template.jd_text
                    ? <div style={{ padding: 18, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--slate-50)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{template.jd_text}</div>
                    : <span className="form-help">No extracted text - open the original file above.</span>}
                </section>
              )}
              {requirements.filter(r => r.jd_text || r.jd_file_path).map(r => (
                <section key={r.id}>
                  <div className="workspace-section-heading" style={{ marginBottom: 8 }}>
                    <h4 style={{ fontSize: 13, margin: 0, color: 'var(--fg-primary)' }}>{r.profile_name || 'Role'} JD</h4>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {r.jd_file_url && (
                        <a href={r.jd_file_url} target="_blank" rel="noreferrer" className="product-button product-button--secondary product-button--sm">
                          <FileText size={12} />{r.jd_original_filename || 'Original file'}
                        </a>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => setReqModal(r)} disabled={isArchived}>Edit role JD</Button>
                    </div>
                  </div>
                  {r.jd_text
                    ? <div style={{ padding: 18, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--slate-50)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{r.jd_text}</div>
                    : <span className="form-help">No extracted text - open the original file above.</span>}
                </section>
              ))}
            </div>
            : <div className="workspace-stack" style={{ alignItems: 'center' }}>
              <EmptyState message="No JD text attached. Add a mandate JD or edit a role profile." />
              <Button onClick={() => setEditOpen(true)} disabled={isArchived}><FileText size={14} />Add mandate JD</Button>
            </div>
        )}

        {/* ── Candidates tab ── */}
        {tab === 'candidates' && (
          loadingCandidates ? <Spinner center /> : (
            <div className="workspace-stack">
              {loadCandidatesError && <ErrorMessage message={loadCandidatesError} />}
              <div className="workspace-section-heading">
                <div>
                  <h3 style={{ fontSize: 16 }}>Browse candidates</h3>
                  <p>Select candidates and add them to this mandate's client team. AI recommendations only apply to your team members.</p>
                </div>
              </div>

              <div className="workspace-tabs" style={{ alignSelf: 'flex-start' }}>
                <button type="button" className={`workspace-tabs__button${candidateSection === 'team' ? ' is-active' : ''}`} onClick={() => setCandidateSection('team')}>
                  <Sparkles size={13} /> Team ({teamMembers.length})
                </button>
                <button type="button" className={`workspace-tabs__button${candidateSection === 'other' ? ' is-active' : ''}`} onClick={() => setCandidateSection('other')}>
                  Other org members ({otherMembers.length})
                </button>
              </div>

              {assignments.length > 0 && (
                <section>
                  <div className="workspace-section-heading" style={{ marginBottom: 10 }}>
                    <div><h3 style={{ fontSize: 15 }}>Interview history</h3></div>
                  </div>
                  <div className="assignment-list">
                    {assignments.map(assignment => {
                      const name = `${assignment.candidate_first || ''} ${assignment.candidate_last || ''}`.trim()
                      return (
                        <div className="assignment-row" key={assignment.id}>
                          <Avatar name={name} size={30} />
                          <div className="assignment-row__content">
                            <strong>{name}</strong>
                            <span>{assignment.candidate_email} · {assignment.question_count} questions · {formatDate(assignment.created)}</span>
                          </div>
                          <span className={`status-pill${assignment.status === 'completed' ? ' status-pill--success' : assignment.status === 'cancelled' ? ' status-pill--danger' : ' status-pill--brand'}`}>{assignment.status}</span>
                          {assignment.status === 'scheduled' && (
                            <button type="button" className="danger-icon-button" disabled={isArchived || cancellingId === assignment.id} onClick={() => cancelAssignment(assignment)}><Trash2 size={14} /></button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              <div className="workspace-search" style={{ width: '100%' }}>
                <Search size={15} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, email, or role..." />
              </div>

              {candidateSection === 'team' && teamMembers.length === 0 ? (
                <EmptyState message="You have no team members yet. Add members on the Team page, then come back to recommend them for this mandate." />
              ) : visibleMembers.length === 0 ? (
                <EmptyState message="No members match this search." />
              ) : (
                <div className="workspace-grid">
                  {displayedMembers.map(member => {
                    const name = `${member.first_name || ''} ${member.last_name || ''}`.trim()
                    return (
                      <button type="button" className="workspace-card" key={member.id} disabled={isArchived} onClick={() => { setCandidateActionTarget(member); setCandidateActionError(null) }} style={{ textAlign: 'left' }}>
                        <div className="workspace-card__body" style={{ padding: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <Avatar name={name} size={34} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <strong style={{ display: 'block', overflow: 'hidden', color: 'var(--fg-primary)', fontSize: 13, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</strong>
                              <span style={{ display: 'block', overflow: 'hidden', marginTop: 3, color: 'var(--fg-muted)', fontSize: 11, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.current_position || member.email}</span>
                            </div>
                            {member.recommended && <span className="status-pill status-pill--success">{member.match_score} match</span>}
                          </div>
                          {(member.matched_tags || []).length > 0 && (
                            <div className="tag-list" style={{ marginTop: 12 }}>
                              {member.matched_tags.slice(0, 4).map(tag => <span className="tag" key={tag}>{tag}</span>)}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {visibleMembers.length > memberLimit && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Button variant="secondary" onClick={() => setMemberLimit(c => c + 30)}>Show 30 more</Button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border-default)' }}>
                <Button onClick={() => setAddProspectsOpen(true)} disabled={isArchived}>
                  <UserCheck size={14} />Add prospects to client team
                </Button>
              </div>
            </div>
          )
        )}

        {/* ── Client Team tab ── */}
        {/* A mandate participant's own side of this flow (seeing the sent JD, submitting
            a resume for the client, published round outcomes) lives on
            pages/workspace/ClientOutcomesPage.jsx - the JD email deep-links there. */}
        {tab === 'team' && (
          loadingTeam ? <Spinner center /> : (
            <div className="workspace-stack">
              <div className="workspace-section-heading">
                <div>
                  <h3 style={{ fontSize: 16 }}>Client team</h3>
                  <p>Prospects added to this mandate. Send the JD, schedule interviews, and track client interview outcomes.</p>
                </div>
                <Button onClick={() => setAddProspectsOpen(true)} disabled={isArchived}><Plus size={14} />Add prospects</Button>
              </div>

              {loadClientTeamError && <ErrorMessage message={loadClientTeamError} />}
              {clientTeam.length === 0 && !loadClientTeamError ? (
                <EmptyState message="No prospects added yet. Go to the Candidates tab to select and add team members or other org members." />
              ) : (
                <div className="assignment-list" style={{ gap: 0 }}>
                  {clientTeam.map(member => {
                    const name = `${member.first_name} ${member.last_name}`.trim()
                    const interview = member.latest_interview
                    return (
                      <div key={member.id} style={{ borderBottom: '1px solid var(--border-default)', padding: '14px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <Avatar name={name} size={34} />
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{name}</div>
                            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{member.email}</div>
                            {member.requirement_name && (
                              <span className="tag" style={{ marginTop: 4, display: 'inline-block' }}>
                                {member.requirement_name}{requirementMeta(member) ? ` | ${requirementMeta(member)}` : ''}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className={`status-pill${member.jd_sent ? ' status-pill--success' : ''}`} title={member.jd_sent_at ? formatDate(member.jd_sent_at) : 'Not sent'}>
                              {member.jd_sent ? <><CheckCircle2 size={11} /> JD sent</> : 'JD not sent'}
                            </span>
                            {member.client_resume_url
                              ? <a href={member.client_resume_url} target="_blank" rel="noreferrer" className="status-pill status-pill--success" style={{ textDecoration: 'none' }}>Resume submitted</a>
                              : <span className="status-pill">No resume</span>}
                            {interview && (
                              <span className={`status-pill${interview.status === 'completed' ? ' status-pill--success' : interview.status === 'cancelled' ? ' status-pill--danger' : ' status-pill--brand'}`}>
                                {interview.type === 'offline' ? 'Offline' : interview.type === 'client' ? 'Client' : interview.type === 'human' ? 'Human' : interview.type === 'exam' ? 'Exam' : 'AI Voice'}: {interview.status}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <Button size="sm" variant="secondary" onClick={() => setSendJdTarget(member)} disabled={isArchived}><Mail size={12} />Send JD</Button>
                            <Button size="sm" variant="secondary" onClick={() => setScheduleChoiceTarget(member)} disabled={isArchived}><Calendar size={12} />Schedule</Button>
                            <Button size="sm" variant="secondary" onClick={() => setRoundsTarget(member)}><AlertCircle size={12} />Rounds</Button>
                            <button type="button" className="danger-icon-button" disabled={isArchived || removingId === member.id}
                              onClick={() => removeFromTeam(member)} style={{ padding: '5px 8px' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        {interview?.scheduled_at && (
                          <div style={{ paddingLeft: 46, marginTop: 6, fontSize: 11, color: 'var(--fg-muted)' }}>
                            <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {formatDateTime(interview.scheduled_at)}{interview.location ? ` | ${interview.location}` : ''}
                          </div>
                        )}
                        {interview?.interviewer_first && (
                          <div style={{ paddingLeft: 46, marginTop: 5, fontSize: 11, color: 'var(--fg-muted)' }}>
                            Interviewer: {interview.interviewer_first} {interview.interviewer_last}
                            {interview.assignment_status ? ` · ${interview.assignment_status}` : ''}
                          </div>
                        )}
                        {interview?.assignment_status === 'completed' && (
                          <div style={{ marginLeft: 46, marginTop: 8, padding: 10, borderRadius: 8, background: 'var(--bg-surface-alt)', fontSize: 12, color: 'var(--fg-body)' }}>
                            <strong>Interviewer feedback ({interview.interviewer_outcome})</strong>
                            {interview.interviewer_first && <span> · {interview.interviewer_first} {interview.interviewer_last}</span>}
                            {interview.feedback && <p style={{ margin: '5px 0 0' }}>{interview.feedback}</p>}
                            {interview.feedback_file_url && <a href={interview.feedback_file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 5 }}>{interview.original_filename || 'Feedback document'}</a>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        )}

        {tab === 'flows' && (
          <div className="workspace-stack">
            <div className="workspace-section-heading"><div><h3>Schedules</h3><p>All one-time interviews and candidate flows for this mandate.</p></div></div>
            {flowRunsError && <ErrorMessage message={flowRunsError} />}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10 }}>
              <label style={{ position: 'relative', gridColumn: 'span 2' }}>
                <Search size={14} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--fg-subtle)' }} />
                <input className="form-input" style={{ paddingLeft: 34 }} value={scheduleQuery} onChange={event => setScheduleQuery(event.target.value)} placeholder="Search candidate name or email..." />
              </label>
              <select className="form-input" value={scheduleKind} onChange={event => setScheduleKind(event.target.value)} aria-label="Schedule kind">
                <option value="all">All schedules</option><option value="single">Single interviews</option><option value="flow">Interview flows</option>
              </select>
              <select className="form-input" value={scheduleStatus} onChange={event => setScheduleStatus(event.target.value)} aria-label="Schedule status">
                <option value="all">All statuses</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
              <select className="form-input" value={scheduleType} onChange={event => setScheduleType(event.target.value)} aria-label="Interview type">
                <option value="all">All interview types</option><option value="ai_voice">AI Voice</option><option value="exam">AI Exam</option><option value="human">Human Video</option><option value="offline">Offline</option>
              </select>
            </div>

            {visibleSingleSchedules.length > 0 && (
              <section className="workspace-card">
                <div className="workspace-card__body">
                  <div className="workspace-section-heading"><div><h3>Single interviews</h3><p>{visibleSingleSchedules.length} matching schedule{visibleSingleSchedules.length === 1 ? '' : 's'}</p></div></div>
                  <div className="assignment-list">
                    {visibleSingleSchedules.map(interview => (
                      <div className="assignment-row" key={interview.interview_id}>
                        <span className="status-pill">{INTERVIEW_TYPES.find(item => item.value === interview.type)?.label || interview.type}</span>
                        <div className="assignment-row__content">
                          <strong>{interview.candidate_first} {interview.candidate_last}</strong>
                          <span>{interview.scheduled_at ? formatDateTime(interview.scheduled_at) : formatDate(interview.created)}{interview.location ? ` | ${interview.location}` : ''}</span>
                          {interview.interviewer_first && <span>Interviewer: {interview.interviewer_first} {interview.interviewer_last}</span>}
                        </div>
                        {interview.decision && <span className={`status-pill${interview.decision === 'pass' ? ' status-pill--success' : ' status-pill--danger'}`}>{interview.decision === 'pass' ? 'passed' : 'failed'}</span>}
                        <span className={`status-pill${interview.status === 'completed' ? ' status-pill--success' : interview.status === 'cancelled' ? ' status-pill--danger' : ' status-pill--brand'}`}>{interview.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {visibleSingleSchedules.length === 0 && visibleFlowRuns.length === 0 && !flowRunsError
              ? <EmptyState message="No schedules match these filters." />
              : visibleFlowRuns.map(run => (
                <section key={run.run_id} className="workspace-card">
                  <div className="workspace-card__body">
                    <div className="workspace-section-heading">
                      <div><h3>{run.candidate_first} {run.candidate_last}</h3><p>{run.flow_name}</p></div>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Button size="sm" variant="secondary" onClick={() => setFlowEditTarget({
                          runId: run.run_id,
                          member: { id: run.client_team_id, user_id: run.candidate_user_id, first_name: run.candidate_first, last_name: run.candidate_last },
                        })}>Edit</Button>
                        <button type="button" className="danger-icon-button" title="Delete candidate flow" onClick={() => deleteCandidateFlow(run)}><Trash2 size={14} /></button>
                        <span className={`status-pill${run.run_status === 'completed' ? ' status-pill--success' : run.run_status.includes('paused') ? ' status-pill--danger' : ' status-pill--brand'}`}>{run.run_status.replaceAll('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="assignment-list" style={{ marginTop: 12 }}>
                      {run.stages.map(stage => (
                        <div className="assignment-row" key={`${stage.stage_run_id}-${stage.file_id || 0}`}>
                          <span className="status-pill">{stage.stage_order}</span>
                          <div className="assignment-row__content">
                            <strong>{stage.stage_name}</strong>
                            <span>{stage.type} · attempt {stage.attempt_number} · {stage.stage_status}</span>
                            {stage.feedback && <span>Feedback: {stage.feedback}</span>}
                          </div>
                          {stage.interviewer_first && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{stage.interviewer_first} {stage.interviewer_last}</span>}
                          {stage.file_url && <a href={stage.file_url} target="_blank" rel="noreferrer" className="product-button product-button--secondary product-button--sm">{stage.original_filename}</a>}
                        </div>
                      ))}
                    </div>
                    {run.run_status === 'paused_failed' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        <input className="form-input" style={{ maxWidth: 230 }} type="datetime-local" value={retryDates[run.run_id] || ''} onChange={event => setRetryDates(current => ({ ...current, [run.run_id]: event.target.value }))} />
                        <Button size="sm" variant="secondary" onClick={() => retryPausedRun(run.run_id)}>Retry stage</Button>
                        <Button size="sm" onClick={() => continuePausedRun(run.run_id)}>Continue anyway</Button>
                      </div>
                    )}
                    {run.run_status === 'paused_schedule_required' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <input className="form-input" style={{ maxWidth: 230 }} type="datetime-local" value={retryDates[run.run_id] || ''} onChange={event => setRetryDates(current => ({ ...current, [run.run_id]: event.target.value }))} />
                        <Button size="sm" onClick={() => retryPausedRun(run.run_id)}>Schedule stage</Button>
                      </div>
                    )}
                    {run.run_status === 'active' && run.stages.some(stage => (
                      Number(stage.stage_order) === Number(run.current_stage_order)
                      && stage.stage_status === 'scheduled'
                      && stage.interview_status === 'scheduled'
                      && ['ai_voice', 'exam'].includes(stage.type)
                      && stage.interview_due_at
                      && new Date(stage.interview_due_at) <= new Date()
                    )) && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--danger-600)' }}>Current stage expired without attendance.</span>
                        <Button size="sm" onClick={() => processExpiredRun(run.run_id)}>Process no-show</Button>
                      </div>
                    )}
                    {run.run_status === 'active' && run.stages.some(stage => (
                      Number(stage.stage_order) === Number(run.current_stage_order)
                      && stage.stage_status === 'scheduled'
                      && stage.interview_status === 'scheduled'
                      && ['human', 'offline'].includes(stage.type)
                      && stage.interview_due_at
                      && new Date(stage.interview_due_at) <= new Date()
                    )) && (
                      <div style={{ marginTop: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--warning-700)' }}>Interview completed. Awaiting interviewer feedback before the next stage can begin.</span>
                      </div>
                    )}
                  </div>
                </section>
              ))}
          </div>
        )}

        {/* ── Reports tab ── */}
        {tab === 'reports' && (
          <div className="workspace-stack">
            {reportsError && <ErrorMessage message={reportsError} />}
            {reports.length === 0 && !reportsError
              ? <EmptyState message="Reports for this mandate will appear after interviews are completed." />
              : (
                <div className="assignment-list">
                  {reports.map(report => (
                    <div className="assignment-row" key={report.id} role="button" tabIndex={0} onClick={() => openMandateReport(report)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openMandateReport(report) }} style={{ cursor: 'pointer' }}>
                      <Avatar name={`${report.candidate_first || ''} ${report.candidate_last || ''}`.trim()} size={30} />
                      <div className="assignment-row__content">
                        <strong>{report.candidate_first} {report.candidate_last}</strong>
                        <span>Overall score: {report.overall_score ?? 'Not scored'}</span>
                      </div>
                      <span className={`status-pill${report.decision === 'pass' ? ' status-pill--success' : ' status-pill--warning'}`}>{report.decision || 'Review'}</span>
                      <Button size="sm" variant="secondary" onClick={event => { event.stopPropagation(); openMandateReport(report) }}>View</Button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}
        </div>
      </div>

      <EditMandateModal
        open={editOpen}
        template={template}
        requirements={requirements}
        onClose={() => setEditOpen(false)}
        onSaved={updated => { setTemplate(updated); setEditOpen(false); void loadRequirements() }}
      />

      <DeleteMandateModal
        open={deleteMandateOpen}
        template={template}
        onClose={() => setDeleteMandateOpen(false)}
        onSuccess={() => { setDeleteMandateOpen(false); navigate(`${basePath}/clients`) }}
      />

      <RequirementModal
        open={!!reqModal}
        onClose={() => setReqModal(null)}
        mandateId={template.id}
        existing={reqModal && reqModal !== 'new' ? reqModal : null}
        onSaved={() => { setReqModal(null); void loadRequirements() }}
      />

      <AddProspectsModal
        open={addProspectsOpen}
        onClose={() => setAddProspectsOpen(false)}
        mandateId={template.id}
        requirements={requirements}
        onAdded={() => { loadClientTeam(); if (tab === 'candidates') loadCandidates() }}
      />

      <CandidateActionModal
        candidate={candidateActionTarget}
        requirements={requirements}
        onClose={() => { setCandidateActionTarget(null); setCandidateActionError(null) }}
        onViewProfile={() => viewCandidateProfile(candidateActionTarget)}
        onAdd={(reqId) => addCandidateFromBrowse(candidateActionTarget, reqId)}
        adding={addingCandidateId === candidateActionTarget?.id}
        error={candidateActionError}
      />

      <MandateReportDetailModal
        report={selectedReport}
        loading={reportDetailLoading}
        error={reportDetailError}
        onClose={() => { setSelectedReport(null); setReportDetailError(null) }}
      />

      {sendJdTarget && (
        <SendJDModal
          open={!!sendJdTarget}
          onClose={() => setSendJdTarget(null)}
          member={sendJdTarget}
          template={template}
          onSent={() => { setSendJdTarget(null); loadClientTeam(); setMessage({ text: `JD sent to ${sendJdTarget.first_name}.`, type: 'success' }) }}
        />
      )}

      {scheduleTarget && (
        <ScheduleClientTeamModal
          open={!!scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          member={scheduleTarget}
          template={template}
          onScheduled={() => { setScheduleTarget(null); loadClientTeam(); setMessage({ text: 'Interview scheduled successfully.', type: 'success' }) }}
        />
      )}

      <Modal open={!!scheduleChoiceTarget} onClose={() => setScheduleChoiceTarget(null)} title="Schedule candidate" size="sm">
        <div className="workspace-stack">
          <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 13 }}>Choose a one-time interview or an ordered multi-stage flow.</p>
          <Button onClick={() => { setScheduleTarget(scheduleChoiceTarget); setScheduleChoiceTarget(null) }}><Calendar size={14} />Schedule a single interview</Button>
          <Button variant="secondary" onClick={() => { setFlowTarget(scheduleChoiceTarget); setScheduleChoiceTarget(null) }}><Sparkles size={14} />Create interview flow</Button>
        </div>
      </Modal>

      {flowTarget && (
        <InterviewFlowModal
          open={!!flowTarget}
          mandate={template}
          member={flowTarget}
          onClose={() => setFlowTarget(null)}
          onStarted={() => { setFlowTarget(null); loadClientTeam(); setMessage({ text: 'Interview flow started. Stage 1 is scheduled.', type: 'success' }) }}
        />
      )}

      {flowEditTarget && (
        <InterviewFlowModal
          open={!!flowEditTarget}
          mandate={template}
          member={flowEditTarget.member}
          initialRunId={flowEditTarget.runId}
          onClose={() => setFlowEditTarget(null)}
          onStarted={() => { setFlowEditTarget(null); refreshFlowRuns(); setMessage({ text: 'Interview flow started.', type: 'success' }) }}
          onSaved={() => { refreshFlowRuns(); setMessage({ text: 'Interview flow updated.', type: 'success' }) }}
        />
      )}

      {roundsTarget && (
        <OutcomeRoundsModal
          open={!!roundsTarget}
          onClose={() => setRoundsTarget(null)}
          member={roundsTarget}
          template={template}
          onSaved={() => { loadClientTeam(); setMessage({ text: 'Outcome rounds updated.', type: 'success' }) }}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        confirmText={confirmDialog.confirmText}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  )
}

export default MandateDetail
