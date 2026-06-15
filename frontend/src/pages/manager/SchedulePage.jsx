import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Button from '../../components/shared/Button'
import ScheduleModal from '../../components/manager/ScheduleModal'
import * as api from '../../services/api'

const HOURS = Array.from({ length: 9 }, (_, i) => i + 9)
const H = 60

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
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [events, setEvents]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCalendarEvents(weekStart.toISOString().slice(0, 10))
      setEvents(res.data || [])
    } catch {
      setError('Could not load calendar.')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { void load() }, [load])

  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, 7)) }
  function goToday()  { setWeekStart(getWeekStart(new Date())) }

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

  return (
    <div className="workspace-page workspace-stack" style={{ gap: 16 }}>
      <div className="workspace-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
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
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => navigate('/manager/team')}>My Team</Button>
          <Button onClick={() => setScheduleOpen(true)}>
            <CalendarPlus size={13} /> Schedule interview
          </Button>
        </div>
      </div>

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

      {loading ? (
        <Spinner center />
      ) : error ? (
        <ErrorMessage message={error} />
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
                        onClick={() => { const mid = ev.teamMemberId || ev.team_member_id; if (mid) navigate(`/manager/team/${mid}`) }}
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
    </div>
  )
}

export default SchedulePage
