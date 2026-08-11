import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarPlus, CheckCircle2, FileText, Clock, Menu, X } from 'lucide-react'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

// ── Notification helpers ──────────────────────────────────────
function notifMeta(what = '') {
  const w = what.toLowerCase()
  if (w.includes('schedul')) return { Icon: CalendarPlus, bg: 'var(--brand-50)', color: 'var(--brand-500)' }
  if (w.includes('complet') || w.includes('done') || w.includes('finish')) return { Icon: CheckCircle2, bg: 'var(--success-50)', color: 'var(--success-500)' }
  if (w.includes('report') || w.includes('generat')) return { Icon: FileText, bg: 'var(--info-50)', color: 'var(--info-500)' }
  return { Icon: Clock, bg: 'var(--slate-100)', color: 'var(--slate-400)' }
}

// ── Notification dropdown ─────────────────────────────────────
function NotifDropdown({ items, loading, onClose, onViewAll }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
      width: '22.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)',
      zIndex: 200, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid var(--slate-100)' }}>
        <span style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)' }}>Notifications</span>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 0, color: 'var(--fg-subtle)', cursor: 'pointer', display: 'inline-flex', padding: '0.125rem', borderRadius: 'var(--radius-sm)' }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>Loading…</div>
        )}
        {!loading && items.length === 0 && (
          <div style={{ padding: '28px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
            <div style={{ fontSize: 13, color: 'var(--slate-500)', fontWeight: 500 }}>No recent activity</div>
            <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 4 }}>Activity will appear here as your team completes interviews.</div>
          </div>
        )}
        {!loading && items.slice(0, 15).map((item, i) => {
          const meta = notifMeta(item.what)
          const Icon = meta.Icon
          return (
            <div
              key={i}
              style={{ display: 'flex', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--slate-50)', transition: 'background 100ms', cursor: 'default', background: 'var(--bg-surface)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color={meta.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-900)', lineHeight: 1.35 }}>{item.what}</div>
                {item.sub && <div style={{ fontSize: 12, color: 'var(--brand-500)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sub}</div>}
                <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 2 }}>{item.when ? formatDate(item.when) : ''}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--slate-100)', textAlign: 'center' }}>
        <button
          type="button"
          onClick={onViewAll}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-500)', background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          View all reports →
        </button>
      </div>
    </div>
  )
}

// ── TopBar ────────────────────────────────────────────────────
function TopBar({ title = '', subtitle = '', action = null, role = 'manager', onMenuClick }) {
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifItems, setNotifItems] = useState([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifFetched, setNotifFetched] = useState(false)
  const notifRef = useRef(null)
  const isManager = role === 'manager'
  const hasSidebar = role === 'manager' || role === 'admin'

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
      height: '3.5rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {hasSidebar && (
          <button
            type="button"
            className="icon-button topbar-menu-button"
            aria-label="Open navigation"
            onClick={onMenuClick}
          >
            <Menu size={17} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)', margin: 0, letterSpacing: 'var(--tracking-tight)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </h1>
          {subtitle && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-subtle)', marginTop: '0.0625rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {isManager && <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label="Open notifications"
            onClick={toggleNotif}
            style={{
              width: '2.25rem', height: '2.25rem', borderRadius: 'var(--radius-md)',
              background: notifOpen ? 'var(--brand-50)' : 'var(--slate-100)',
              border: notifOpen ? '1px solid var(--brand-200)' : '1px solid transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all var(--dur-fast)',
            }}
          >
            <Bell size={15} color={notifOpen ? 'var(--brand-500)' : 'var(--fg-body)'} />
          </button>
          {hasActivity && !notifOpen && (
            <span aria-hidden="true" style={{ position: 'absolute', top: '0.375rem', right: '0.375rem', width: '0.5rem', height: '0.5rem', borderRadius: 'var(--radius-full)', background: 'var(--danger-500)', boxShadow: '0 0 0 2px var(--bg-surface)' }} />
          )}

          {notifOpen && (
            <NotifDropdown
              items={notifItems}
              loading={notifLoading}
              onClose={() => setNotifOpen(false)}
              onViewAll={() => { setNotifOpen(false); navigate('/manager/reports') }}
            />
          )}
        </div>}

        {action}
      </div>
    </header>
  )
}

export default TopBar
