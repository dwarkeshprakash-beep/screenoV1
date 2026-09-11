import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CalendarPlus, Eye, List, Mail, RotateCw } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Button from '../../components/shared/Button'
import Modal from '../../components/shared/Modal'
import ScheduleModal from '../../components/manager/ScheduleModal'
import RescheduleModal from '../../components/manager/RescheduleModal'
import * as api from '../../services/api'
import { formatDateTime } from '../../utils/helpers'

const HOURS = Array.from({ length: 9 }, (_, i) => i + 9)
const H = 60

const LIST_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'mandate', label: 'Client Mandate' },
  { id: 'monthly', label: 'Monthly Assessment' },
  { id: 'general', label: 'General Assessment' },
]

const TYPE_STYLE = {
  ai:       { bg: 'var(--warning-50)',  border: 'var(--warning-500)', color: 'var(--warning-700)', label: 'AI screen' },
  exam:     { bg: 'var(--info-50)',     border: 'var(--info-500)',    color: 'var(--info-600)',    label: 'Coding exam' },
  ai_voice: { bg: 'var(--warning-50)',  border: 'var(--warning-500)', color: 'var(--warning-700)', label: 'AI screen' },
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function weekLabel(weekStart) {
  const end = addDays(weekStart, 4)
  const opts = { month: 'short', day: 'numeric' }
  return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

function hourLabel(h) {
  if (h === 12) return '12:00 PM'
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

function getTypeStyle(type) {
  return TYPE_STYLE[type] || TYPE_STYLE.ai_voice
}

function SchedulePage() {
  const navigate = useNavigate()
  const [view, setView] = useState('list')
  const [listCategory, setListCategory] = useState('all')
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [events, setEvents]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [deliveryError, setDeliveryError] = useState(null)
  const [resending, setResending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const category = listCategory !== 'all' ? listCategory : undefined
      // Only the calendar is scoped to the visible week — the list tabs show everything
      // matching the category filter regardless of date.
      const range = view === 'calendar'
        ? {
            dateFrom: weekStart.toISOString().slice(0, 10),
            dateTo: addDays(weekStart, 6).toISOString().slice(0, 10),
          }
        : {}
      const res = await api.getScheduledInterviews({ ...range, category })
      setEvents(res.data || [])
    } catch {
      setError('Could not load interviews.')
    } finally {
      setLoading(false)
    }
  }, [view, listCategory, weekStart])

  // Refetch whenever the manager switches Calendar/List, changes week, or picks a list
  // sub-tab, so data created on another device/session while this page sat idle isn't stale.
  useEffect(() => { void load() }, [load])

  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, 7)) }
  function goToday()  { setWeekStart(getWeekStart(new Date())) }

  async function openEvent(ev) {
    setSelectedEvent(ev)
    setDeliveries([])
    setDeliveryError(null)
    setDeliveryLoading(true)
    try {
      const res = await api.getEmailDeliveries(ev.id)
      setDeliveries(res.data || [])
    } catch (err) {
      setDeliveryError(err.message || 'Could not load email delivery status.')
    } finally {
      setDeliveryLoading(false)
    }
  }

  async function resendInvite() {
    if (!selectedEvent?.id) return
    setResending(true)
    setDeliveryError(null)
    try {
      await api.resendMagicLink(selectedEvent.id)
      const res = await api.getEmailDeliveries(selectedEvent.id)
      setDeliveries(res.data || [])
    } catch (err) {
      setDeliveryError(err.message || 'Could not resend invite.')
    } finally {
      setResending(false)
    }
  }

  const today = new Date()
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI']

  function eventsForDay(dayDate) {
    return events.filter(ev => {
      const d = new Date(ev.start || ev.created)
      return d.getDate() === dayDate.getDate() && d.getMonth() === dayDate.getMonth() && d.getFullYear() === dayDate.getFullYear()
    })
  }

  function getStartHour(ev) {
    const d = new Date(ev.start || ev.created)
    return d.getHours() + d.getMinutes() / 60
  }

  function getDurHours(ev) {
    if (ev.duration_minutes) return ev.duration_minutes / 60
    if (ev.start && ev.end) return (new Date(ev.end) - new Date(ev.start)) / 3600000
    return 1
  }

  // Already filtered server-side by category when in list view — just sort chronologically.
  const sortedEvents = [...events].sort((a, b) => new Date(a.start || a.created) - new Date(b.start || b.created))

  function tabButtonStyle(active) {
    return {
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: 0,
      background: active ? 'var(--bg-surface)' : 'transparent', fontSize: 12, fontWeight: 600,
      color: active ? 'var(--brand-600)' : 'var(--slate-700)', cursor: 'pointer', fontFamily: 'inherit',
    }
  }

  function subTabStyle(active) {
    return {
      padding: '8px 2px', border: 0, borderBottom: active ? '2px solid var(--brand-500)' : '2px solid transparent',
      background: 'transparent', fontSize: 12, fontWeight: 600,
      color: active ? 'var(--brand-600)' : 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'inherit',
    }
  }

  function statusPillClass(status) {
    if (status === 'completed') return 'status-pill--success'
    if (status === 'cancelled') return 'status-pill--danger'
    if (status === 'in_progress') return 'status-pill--warning'
    return 'status-pill--brand'
  }

  return (
    <div className="workspace-page workspace-stack" style={{ gap: 16 }}>
      <div className="workspace-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', gap: 2, background: 'var(--slate-100)', padding: 3, borderRadius: 8, border: '1px solid var(--slate-200)' }}>
            <button onClick={() => setView('list')} style={tabButtonStyle(view === 'list')}>
              <List size={13} /> List
            </button>
            <button onClick={() => setView('calendar')} style={tabButtonStyle(view === 'calendar')}>
              <CalendarDays size={13} /> Calendar
            </button>
          </div>
          {view === 'calendar' && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--slate-900)', margin: 0, letterSpacing: '-0.015em' }}>{weekLabel(weekStart)}</h2>
              <div style={{ display: 'inline-flex', gap: 2, background: 'var(--slate-100)', padding: 3, borderRadius: 8, border: '1px solid var(--slate-200)' }}>
                {[
                  { label: '‹', action: prevWeek },
                  { label: 'Today', action: goToday },
                  { label: '›', action: nextWeek },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.action} style={{ padding: '5px 10px', borderRadius: 6, border: 0, background: btn.label === 'Today' ? 'var(--bg-surface)' : 'transparent', fontSize: 12, fontWeight: 500, color: 'var(--slate-700)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => navigate('/manager/team')}>My Team</Button>
          <Button onClick={() => setScheduleOpen(true)}>
            <CalendarPlus size={13} /> Schedule interview
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--border-default)' }}>
        {LIST_CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setListCategory(c.id)} style={subTabStyle(listCategory === c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {view === 'calendar' && (
        <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--slate-500)' }}>
          {[
            { t: 'AI screen', type: 'ai' },
            { t: 'Coding exam', type: 'exam' },
          ].map(l => {
            const ts = TYPE_STYLE[l.type]
            return (
              <span key={l.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: ts.bg, border: `1px solid ${ts.border}`, display: 'inline-block' }} />
                {l.t}
              </span>
            )
          })}
        </div>
      )}

      {loading ? (
        <Spinner center />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : view === 'list' ? (
        sortedEvents.length === 0 ? (
          <EmptyState message="No interviews found for this filter." />
        ) : (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, overflowX: 'auto', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-alt)' }}>
                  {['CANDIDATE', 'TYPE', 'DATE & TIME', 'STATUS', 'ACTIONS'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map(ev => {
                  const ts = getTypeStyle(ev.type)
                  return (
                    <tr key={ev.id} onClick={() => openEvent(ev)} style={{ cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', fontWeight: 600, color: 'var(--fg-primary)' }}>
                        {ev.candidateName || ev.title || 'Candidate'}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: ts.bg, color: ts.color }}>{ts.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', color: 'var(--fg-muted)' }}>
                        {formatDateTime(ev.start)}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
                        <span className={`status-pill ${statusPillClass(ev.status)}`}>{ev.status || 'scheduled'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="secondary" onClick={() => openEvent(ev)}>
                          <Eye size={12} /> View
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, overflowX: 'auto', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <div style={{ minWidth: 780 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(5,1fr)`, borderBottom: '1px solid var(--slate-200)', background: 'var(--bg-surface)' }}>
            <div />
            {weekDays.map((d, i) => {
              const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
              return (
                <div key={i} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: '1px solid var(--slate-100)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--slate-400)' }}>{DAY_NAMES[i]}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: isToday ? 'var(--brand-500)' : 'var(--slate-900)', marginTop: 2 }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(5,1fr)` }}>
            <div>
              {HOURS.map(h => (
                <div key={h} style={{ height: H, borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '4px 8px 0', fontSize: 11, color: 'var(--slate-400)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                  {hourLabel(h)}
                </div>
              ))}
            </div>
            {weekDays.map((d, di) => {
              const dayEvs = eventsForDay(d)
              return (
                <div key={di} style={{ position: 'relative', borderLeft: '1px solid var(--slate-100)' }}>
                  {HOURS.map(h => <div key={h} style={{ height: H, borderBottom: '1px solid var(--slate-100)' }} />)}
                  {dayEvs.map((ev, ei) => {
                    const ts = getTypeStyle(ev.type)
                    const startH = getStartHour(ev)
                    const dur = getDurHours(ev)
                    const top = Math.max(0, (startH - 9) * H) + 2
                    const height = Math.max(20, dur * H - 4)
                    return (
                      <div
                        key={ei}
                        onClick={() => openEvent(ev)}
                        style={{ position: 'absolute', left: 4, right: 4, top, height, background: ts.bg, borderLeft: `3px solid ${ts.border}`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', overflow: 'hidden', transition: 'filter 120ms' }}
                        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
                        onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: ts.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.candidate_first ? `${ev.candidate_first} ${ev.candidate_last}` : (ev.candidateName || ev.title || ts.label)}
                        </div>
                        {dur >= 0.8 && <div style={{ fontSize: 11, color: ts.color, opacity: 0.8 }}>{ev.status || ''}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          </div>
        </div>
      )}

      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onDone={load}
      />

      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Scheduled interview" size="md">
        {selectedEvent && (
          <div className="workspace-stack">
            <div className="detail-facts">
              <div className="detail-fact"><div className="detail-fact__label">Candidate</div><div className="detail-fact__value">{selectedEvent.candidateName || selectedEvent.title || 'Candidate'}</div></div>
              <div className="detail-fact"><div className="detail-fact__label">Type</div><div className="detail-fact__value">{getTypeStyle(selectedEvent.type).label}</div></div>
              <div className="detail-fact"><div className="detail-fact__label">Status</div><div className="detail-fact__value">{selectedEvent.status || 'scheduled'}</div></div>
              <div className="detail-fact"><div className="detail-fact__label">Duration</div><div className="detail-fact__value">{selectedEvent.duration_minutes || 60} min</div></div>
            </div>

            <div className="workspace-section-heading">
              <div><h3 style={{ fontSize: 15 }}>Email delivery</h3><p>Magic-link delivery log for this interview.</p></div>
              <Mail size={18} color="var(--brand-500)" />
            </div>

            {deliveryLoading ? <Spinner center /> : deliveries.length === 0 ? (
              <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>No delivery rows logged yet.</span>
            ) : (
              <div className="assignment-list">
                {deliveries.map(row => (
                  <div className="assignment-row" key={row.id}>
                    <div className="assignment-row__content">
                      <strong>{row.kind}</strong>
                      <span>{row.intended_to || 'No recipient'} | {row.created ? new Date(row.created).toLocaleString() : ''}</span>
                      {row.error && <span style={{ color: 'var(--danger-700)' }}>{row.error}</span>}
                    </div>
                    <span className={`status-pill${row.status === 'sent' ? ' status-pill--success' : ' status-pill--danger'}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            )}

            {deliveryError && <ErrorMessage message={deliveryError} />}

            <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
              {(selectedEvent.teamMemberId || selectedEvent.team_member_id) && (
                <Button variant="secondary" onClick={() => navigate(`/manager/team/${selectedEvent.teamMemberId || selectedEvent.team_member_id}`)}>Open profile</Button>
              )}
              {selectedEvent.status !== 'completed' && selectedEvent.status !== 'cancelled' && (
                <Button variant="secondary" onClick={() => { setRescheduleTarget(selectedEvent); setSelectedEvent(null) }}>
                  <CalendarDays size={14} />Reschedule
                </Button>
              )}
              {selectedEvent.type !== 'offline' && selectedEvent.status !== 'completed' && (
                <Button onClick={resendInvite} loading={resending}>
                  <RotateCw size={14} />Resend magic link
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <RescheduleModal
        open={!!rescheduleTarget}
        interview={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onDone={load}
      />
    </div>
  )
}

export default SchedulePage
