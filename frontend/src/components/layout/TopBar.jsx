import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, CalendarPlus, CheckCircle2, FileText, Clock, X } from 'lucide-react'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

// ── Notification helpers ──────────────────────────────────────
function notifMeta(what = '') {
  const w = what.toLowerCase()
  if (w.includes('schedul')) return { Icon: CalendarPlus, bg: '#EFEDFD', color: '#5B4FE9' }
  if (w.includes('complet') || w.includes('done') || w.includes('finish')) return { Icon: CheckCircle2, bg: '#ECFDF5', color: '#059669' }
  if (w.includes('report') || w.includes('generat')) return { Icon: FileText, bg: '#EFF6FF', color: '#2563EB' }
  return { Icon: Clock, bg: '#F1F5F9', color: '#94A3B8' }
}

// ── Notification dropdown ─────────────────────────────────────
function NotifDropdown({ items, loading, onClose, onViewAll }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      width: 360, background: '#FFF', borderRadius: 12,
      border: '1px solid #E2E8F0', boxShadow: '0 12px 32px rgba(15,23,42,0.14)',
      zIndex: 200, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Notifications</span>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 0, color: '#94A3B8', cursor: 'pointer', display: 'inline-flex', padding: 2, borderRadius: 4 }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading…</div>
        )}
        {!loading && items.length === 0 && (
          <div style={{ padding: '28px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
            <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>No recent activity</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Activity will appear here as your team completes interviews.</div>
          </div>
        )}
        {!loading && items.slice(0, 15).map((item, i) => {
          const meta = notifMeta(item.what)
          const Icon = meta.Icon
          return (
            <div
              key={i}
              style={{ display: 'flex', gap: 12, padding: '11px 16px', borderBottom: '1px solid #F8FAFC', transition: 'background 100ms', cursor: 'default', background: '#FFF' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFF'}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color={meta.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', lineHeight: 1.35 }}>{item.what}</div>
                {item.sub && <div style={{ fontSize: 12, color: '#5B4FE9', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sub}</div>}
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{item.when ? formatDate(item.when) : ''}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
        <button
          type="button"
          onClick={onViewAll}
          style={{ fontSize: 12, fontWeight: 600, color: '#5B4FE9', background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          View all reports →
        </button>
      </div>
    </div>
  )
}

// ── TopBar ────────────────────────────────────────────────────
function TopBar({ title = '', subtitle = '', action = null, role = 'manager' }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifItems, setNotifItems] = useState([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifFetched, setNotifFetched] = useState(false)
  const notifRef = useRef(null)
  const isManager = role === 'manager'

  function submitSearch(e) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || !isManager) return
    navigate(`/manager/team?search=${encodeURIComponent(trimmed)}`)
    setQuery('')
  }

  async function toggleNotif() {
    if (notifOpen) { setNotifOpen(false); return }
    setNotifOpen(true)
    if (notifFetched) return
    setNotifLoading(true)
    try {
      const res = await api.getTeamActivity()
      setNotifItems(res.data || [])
      setNotifFetched(true)
    } catch {
      setNotifItems([])
    } finally {
      setNotifLoading(false)
    }
  }

  useEffect(() => {
    if (!notifOpen) return
    function handleOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [notifOpen])

  const hasActivity = notifItems.length > 0

  return (
    <header style={{
      height: 56, background: '#FFF', borderBottom: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0,
    }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display, 'Inter')", fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.015em' }}>
          {title}
        </h1>
        {subtitle && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{subtitle}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isManager && (
          <form onSubmit={submitSearch} role="search" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F1F5F9', borderRadius: 8, padding: '7px 12px', width: 260 }}>
            <Search size={13} color="#94A3B8" />
            <input
              aria-label="Search candidates"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search candidates..."
              style={{ border: 0, outline: 'none', background: 'transparent', fontSize: 13, color: '#0F172A', flex: 1, fontFamily: 'inherit' }}
            />
          </form>
        )}

        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label="Open notifications"
            onClick={toggleNotif}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: notifOpen ? '#EFEDFD' : '#F1F5F9',
              border: notifOpen ? '1px solid #C4BFFA' : '1px solid transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 120ms',
            }}
          >
            <Bell size={15} color={notifOpen ? '#5B4FE9' : '#374151'} />
          </button>
          {hasActivity && !notifOpen && (
            <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 9999, background: '#EF4444', boxShadow: '0 0 0 2px #FFF' }} />
          )}

          {notifOpen && (
            <NotifDropdown
              items={notifItems}
              loading={notifLoading}
              onClose={() => setNotifOpen(false)}
              onViewAll={() => { setNotifOpen(false); navigate(isManager ? '/manager/reports' : '/interviewer/scorecard') }}
            />
          )}
        </div>

        {action}
      </div>
    </header>
  )
}

export default TopBar
