// pages/manager/SchedulePage.jsx
// Week-grid calendar with interview events.

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import * as api from '../../services/api'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 10 }, (_, i) => i + 9) // 9–18

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

function formatDayHeader(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function eventColor(type) {
  if (type === 'ai_voice') return { bg: '#EFF6FF', border: '#2563EB', text: '#1D4ED8', label: 'AI Voice' }
  if (type === 'exam')     return { bg: '#F3F0FF', border: 'var(--brand-500)', text: 'var(--brand-600)', label: 'Exam' }
  return { bg: '#ECFDF5', border: 'var(--success-500)', text: 'var(--success-700)', label: 'Human' }
}

/**
 * Schedule calendar page.
 */
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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Schedule</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevWeek} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 14, fontWeight: 500, minWidth: 200, textAlign: 'center' }}>{weekLabel}</span>
          <button onClick={nextWeek} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
          <button onClick={goToday} style={{ padding: '6px 14px', background: 'var(--brand-500)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Today</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40 }}><Spinner /></div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid var(--border-default)' }}>
            <div />
            {weekDays.map((d, i) => (
              <div key={i} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{DAY_NAMES[i]}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-primary)', marginTop: 2 }}>{d.getDate()}</div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          {HOURS.map(hour => (
            <div key={hour} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid var(--border-default)' }}>
              <div style={{ padding: '10px 8px', fontSize: 11, color: 'var(--fg-muted)', textAlign: 'right', paddingRight: 10 }}>{hour}:00</div>
              {weekDays.map((d, di) => {
                const dayEvents = events.filter(ev => {
                  const evDate = new Date(ev.created)
                  return evDate.getDate() === d.getDate() && evDate.getMonth() === d.getMonth()
                })
                const c = eventColor(dayEvents[0]?.type)
                return (
                  <div key={di} style={{ minHeight: 48, borderLeft: '1px solid var(--border-default)', padding: 4, position: 'relative' }}>
                    {dayEvents.slice(0, 1).map((ev, ei) => (
                      <div key={ei} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: '4px 6px', fontSize: 11 }}>
                        <div style={{ fontWeight: 600, color: c.text }}>{c.label}</div>
                        <div style={{ color: 'var(--fg-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.candidateName}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Upcoming interviews list */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Upcoming Interviews</h2>
        {events.length === 0 ? (
          <EmptyState message="No interviews scheduled for this week." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.slice(0, 5).map((ev, i) => (
              <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{ev.candidateName}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{eventColor(ev.type).label} · {ev.status}</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{new Date(ev.created).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SchedulePage
