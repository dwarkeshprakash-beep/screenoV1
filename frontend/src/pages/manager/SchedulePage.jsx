import { useState, useEffect } from 'react'
import { CalendarPlus } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import * as api from '../../services/api'

const HOURS = Array.from({ length: 9 }, (_, i) => i + 9)
const H = 60

const TYPE_STYLE = {
  ai:    { bg: '#FFFBEB', border: '#D97706', color: '#92400E', label: 'AI screen' },
  human: { bg: '#EFEDFD', border: '#5B4FE9', color: '#3A31A3', label: 'Live interview' },
  exam:  { bg: '#EFF6FF', border: '#2563EB', color: '#1D4ED8', label: 'Coding exam' },
  ai_voice: { bg: '#FFFBEB', border: '#D97706', color: '#92400E', label: 'AI screen' },
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
  return TYPE_STYLE[type] || TYPE_STYLE.human
}

function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [events, setEvents]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => { load() }, [weekStart])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCalendarEvents(weekStart.toISOString().slice(0, 10))
      setEvents(res.data || [])
    } catch (err) {
      setError('Could not load calendar.')
    } finally {
      setLoading(false)
    }
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.015em' }}>{weekLabel(weekStart)}</h2>
          <div style={{ display: 'inline-flex', gap: 2, background: '#F1F5F9', padding: 3, borderRadius: 8, border: '1px solid #E2E8F0' }}>
            {[
              { label: '‹', action: prevWeek },
              { label: 'Today', action: goToday },
              { label: '›', action: nextWeek },
            ].map((btn, i) => (
              <button key={i} onClick={btn.action} style={{ padding: '5px 10px', borderRadius: 6, border: 0, background: btn.label === 'Today' ? '#FFF' : 'transparent', fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#5B4FE9', color: '#FFF', border: 0, borderRadius: 8, fontWeight: 600, padding: '8px 14px', fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(91,79,233,0.2)' }}>
          <CalendarPlus size={13} /> Schedule interview
        </button>
      </div>

      <div style={{ display: 'flex', gap: 18, fontSize: 12, color: '#6B7280' }}>
        {[
          { t: 'AI screen', type: 'ai' },
          { t: 'Live interview', type: 'human' },
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
        <div style={{ padding: 40 }}><Spinner /></div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(5,1fr)`, borderBottom: '1px solid #E2E8F0', background: '#FFF' }}>
            <div />
            {weekDays.map((d, i) => {
              const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
              return (
                <div key={i} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8' }}>{DAY_NAMES[i]}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: isToday ? '#5B4FE9' : '#0F172A', marginTop: 2 }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(5,1fr)` }}>
            <div>
              {HOURS.map(h => (
                <div key={h} style={{ height: H, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '4px 8px 0', fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                  {hourLabel(h)}
                </div>
              ))}
            </div>
            {weekDays.map((d, di) => {
              const dayEvs = eventsForDay(d)
              return (
                <div key={di} style={{ position: 'relative', borderLeft: '1px solid #F1F5F9' }}>
                  {HOURS.map(h => <div key={h} style={{ height: H, borderBottom: '1px solid #F1F5F9' }} />)}
                  {dayEvs.map((ev, ei) => {
                    const ts = getTypeStyle(ev.type)
                    const startH = getStartHour(ev)
                    const dur = getDurHours(ev)
                    const top = Math.max(0, (startH - 9) * H) + 2
                    const height = Math.max(20, dur * H - 4)
                    return (
                      <div key={ei} style={{ position: 'absolute', left: 4, right: 4, top, height, background: ts.bg, borderLeft: `3px solid ${ts.border}`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', overflow: 'hidden' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: ts.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.candidateName || ev.title || ts.label}</div>
                        {dur >= 0.8 && <div style={{ fontSize: 11, color: ts.color, opacity: 0.8 }}>{ev.sub || ev.status || ''}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SchedulePage
