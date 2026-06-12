/* AppLayout — collapsible sidebar + topbar (HR / staff workspace) */

const APP_NAV = [
  { section: "Main", items: [
    { id: "dashboard",  label: "Dashboard",  icon: "layout-dashboard" },
    { id: "pipeline",   label: "Pipeline",   icon: "git-pull-request", badge: 24 },
    { id: "candidates", label: "Candidates", icon: "users" },
    { id: "interviews", label: "Interviews", icon: "video", badge: 3 },
  ]},
  { section: "Manage", items: [
    { id: "reports",        label: "Reports",        icon: "bar-chart-3" },
    { id: "question-banks", label: "Question banks", icon: "library" },
  ]},
  { section: "Settings", items: [
    { id: "team",     label: "Team",     icon: "user-cog" },
    { id: "settings", label: "Settings", icon: "settings" },
  ]},
];

/* Brand mark — "screeno" wordmark with a purple-dot accent on the "o" */
const ScreenoLogo = ({ color = "var(--bg-surface)", dotColor = "var(--brand-400)", size = 20 }) => (
  <div style={{ display: "inline-flex", alignItems: "baseline", gap: 0, letterSpacing: "-0.025em" }}>
    <span style={{ fontFamily: "var(--font-display)", fontSize: size, fontWeight: 600, color, lineHeight: 1 }}>screen</span>
    <span style={{ position: "relative", display: "inline-flex", alignItems: "baseline" }}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: size, fontWeight: 600, color, lineHeight: 1 }}>o</span>
      <span style={{ position: "absolute", right: -1, top: -2, width: size * 0.22, height: size * 0.22, borderRadius: 9999, background: dotColor, boxShadow: `0 0 0 2px rgba(91,79,233,0.18)` }} />
    </span>
  </div>
);

/* Tooltip wrapper used by collapsed nav items */
const Tooltip = ({ label, children, side = "right" }) => {
  const [shown, setShown] = React.useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
          onMouseEnter={() => setShown(true)}
          onMouseLeave={() => setShown(false)}>
      {children}
      {shown && (
        <span style={{
          position: "absolute", left: "calc(100% + 12px)", top: "50%", transform: "translateY(-50%)",
          background: "var(--slate-900)", color: "var(--bg-surface)", fontSize: 12, fontWeight: 500,
          padding: "6px 10px", borderRadius: 6, whiteSpace: "nowrap",
          boxShadow: "0 6px 16px rgba(15,23,42,0.18)", zIndex: 50,
          animation: "fadein 120ms cubic-bezier(0.2,0,0,1)",
        }}>
          {label}
          <span style={{ position: "absolute", left: -4, top: "50%", transform: "translateY(-50%) rotate(45deg)", width: 8, height: 8, background: "var(--slate-900)" }} />
        </span>
      )}
    </span>
  );
};

/* The sidebar */
const AppSidebar = ({ active, onNav, collapsed, onToggle, user = { name: "Alex Morgan", role: "Admin", initials: "AM" } }) => {
  const W = collapsed ? 64 : 240;
  return (
    <aside
      style={{
        width: W,
        background: "var(--slate-900)",
        color: "var(--bg-surface)",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        transition: "width 220ms cubic-bezier(0.2, 0, 0, 1)",
        borderRight: "1px solid #1E293B",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", padding: collapsed ? "18px 0" : "18px 16px", borderBottom: "1px solid #1E293B", height: 64, flexShrink: 0 }}>
        {collapsed ? (
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, var(--brand-500), var(--brand-600))", display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 4px 12px rgba(91,79,233,0.3)" }}>
            <div style={{ width: 12, height: 2.5, background: "var(--bg-surface)", borderRadius: 2 }} />
            <div style={{ position: "absolute", right: 4, top: 4, width: 6, height: 6, borderRadius: 9999, background: "var(--brand-400)", boxShadow: "0 0 0 2px var(--slate-900)" }} />
          </div>
        ) : (
          <ScreenoLogo />
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            style={{ background: "transparent", border: 0, color: "var(--slate-400)", padding: 6, borderRadius: 6, display: "inline-flex", cursor: "pointer", transition: "all 120ms" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--bg-surface)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--slate-400)"; }}
          >
            <window.Icon name="panel-left-close" size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "10px 8px" : "10px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {APP_NAV.map((sec, i) => (
          <React.Fragment key={i}>
            {!collapsed ? (
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", padding: "16px 12px 6px" }}>{sec.section}</div>
            ) : (
              <div style={{ height: 1, background: "#1E293B", margin: "12px 8px 4px" }} />
            )}
            {sec.items.map(it => {
              const isActive = active === it.id;
              const inner = (
                <div
                  onClick={() => onNav(it.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: collapsed ? "10px 0" : "9px 12px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    borderRadius: 6,
                    fontSize: 13, fontWeight: 500,
                    color: isActive ? "var(--bg-surface)" : "var(--slate-400)",
                    background: isActive ? "var(--brand-500)" : "transparent",
                    cursor: "pointer",
                    transition: "all 120ms cubic-bezier(0.2, 0, 0, 1)",
                    width: collapsed ? 48 : "100%",
                    boxShadow: isActive ? "0 4px 14px rgba(91,79,233,0.35)" : "none",
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--bg-surface)"; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--slate-400)"; } }}
                >
                  <window.Icon name={it.icon} size={16} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{it.label}</span>
                      {it.badge && (
                        <span style={{
                          background: isActive ? "rgba(255,255,255,0.18)" : "#1E293B",
                          color: isActive ? "var(--bg-surface)" : "var(--slate-300)",
                          fontSize: 11, fontWeight: 600,
                          padding: "1px 7px", borderRadius: 9999,
                          fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums",
                        }}>{it.badge}</span>
                      )}
                    </>
                  )}
                </div>
              );
              return (
                <div key={it.id} style={{ display: "flex", justifyContent: collapsed ? "center" : "stretch" }}>
                  {collapsed ? <Tooltip label={it.label}>{inner}</Tooltip> : inner}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Footer — user */}
      <div style={{
        padding: collapsed ? 10 : 14,
        borderTop: "1px solid #1E293B",
        display: "flex", alignItems: "center", gap: 10,
        justifyContent: collapsed ? "center" : "flex-start",
        flexShrink: 0,
      }}>
        {collapsed ? (
          <Tooltip label={`${user.name} · ${user.role}`}>
            <div style={{ width: 36, height: 36, borderRadius: 9999, background: "var(--brand-500)", color: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {user.initials}
            </div>
          </Tooltip>
        ) : (
          <>
            <div style={{ width: 36, height: 36, borderRadius: 9999, background: "var(--brand-500)", color: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
              {user.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bg-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ display: "inline-flex", marginTop: 2, padding: "1px 7px", borderRadius: 9999, background: "rgba(91,79,233,0.22)", color: "var(--brand-200)", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{user.role}</div>
            </div>
            <button
              title="Log out"
              style={{ background: "transparent", border: 0, color: "#64748B", padding: 6, borderRadius: 6, cursor: "pointer", transition: "all 120ms", display: "inline-flex" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--bg-surface)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; }}
            >
              <window.Icon name="log-out" size={15} />
            </button>
          </>
        )}
      </div>

      {/* Floating expand button when collapsed */}
      {collapsed && (
        <button
          onClick={onToggle}
          title="Expand sidebar"
          style={{
            position: "absolute", left: 48, top: 22,
            width: 22, height: 22, borderRadius: 9999,
            background: "var(--bg-surface)", border: "1px solid var(--slate-200)",
            color: "#475569", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 6px rgba(15,23,42,0.12)",
            zIndex: 20, transition: "all 120ms",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand-500)"; e.currentTarget.style.color = "var(--brand-500)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--slate-200)"; e.currentTarget.style.color = "#475569"; }}
        >
          <window.Icon name="chevron-right" size={12} />
        </button>
      )}
    </aside>
  );
};

/* Top bar */
const AppTopBar = ({ title }) => {
  const [search, setSearch] = React.useState(false);
  return (
    <header style={{
      height: 64, background: "var(--bg-surface)", borderBottom: "1px solid var(--slate-200)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px", position: "sticky", top: 0, zIndex: 10,
    }}>
      <h1 style={{
        fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700,
        color: "var(--slate-900)", letterSpacing: "-0.02em", margin: 0,
      }}>{title}</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Search button */}
        <button
          onClick={() => setSearch(s => !s)}
          title="Search · ⌘K"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: search ? "var(--bg-surface)" : "var(--slate-100)",
            border: search ? "1px solid var(--brand-500)" : "1px solid transparent",
            borderRadius: 8, padding: "8px 12px",
            color: "var(--slate-500)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", transition: "all 120ms",
            width: search ? 320 : 200,
            boxShadow: search ? "0 0 0 3px rgba(91,79,233,0.18)" : "none",
          }}
        >
          <window.Icon name="search" size={14} />
          <span style={{ flex: 1, textAlign: "left" }}>Search anything…</span>
          <kbd style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--slate-400)", border: "1px solid var(--slate-200)", borderRadius: 4, padding: "1px 5px", background: "var(--bg-surface)" }}>⌘K</kbd>
        </button>

        {/* Notifications */}
        <button
          title="Notifications"
          style={{
            position: "relative",
            background: "var(--slate-100)", border: 0, padding: 9, borderRadius: 8,
            color: "var(--slate-700)", cursor: "pointer", transition: "all 120ms",
            display: "inline-flex",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--slate-200)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--slate-100)"; }}
        >
          <window.Icon name="bell" size={16} />
          <span style={{
            position: "absolute", top: 6, right: 6,
            width: 8, height: 8, borderRadius: 9999,
            background: "var(--danger-500)", boxShadow: "0 0 0 2px var(--bg-surface)",
          }} />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: "var(--slate-200)", margin: "0 4px" }} />

        {/* User avatar */}
        <button
          title="Alex Morgan"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent", border: 0, padding: "4px 6px 4px 4px",
            borderRadius: 9999, cursor: "pointer", transition: "all 120ms",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--slate-100)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 9999, background: "var(--brand-500)", color: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 12 }}>AM</div>
          <window.Icon name="chevron-down" size={14} color="var(--slate-500)" />
        </button>
      </div>
    </header>
  );
};

/* The composed layout */
const AppLayout = ({ children, activeNav = "dashboard", onNav, title = "Dashboard" }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [active, setActive] = React.useState(activeNav);
  const handleNav = (id) => { setActive(id); onNav?.(id); };
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [collapsed, active]);

  // Title from active nav
  const allItems = APP_NAV.flatMap(s => s.items);
  const current = allItems.find(i => i.id === active);
  const computedTitle = current?.label || title;

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 52px)", background: "var(--slate-50)" }}>
      <AppSidebar active={active} onNav={handleNav} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, transition: "all 220ms cubic-bezier(0.2, 0, 0, 1)" }}>
        <AppTopBar title={computedTitle} />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 32px", background: "var(--slate-50)" }}>
          <div key={active} style={{ animation: "fadeUp 320ms cubic-bezier(0.2, 0, 0, 1)" }}>
            {typeof children === "function" ? children({ active }) : children}
          </div>
        </main>
      </div>
    </div>
  );
};

Object.assign(window, { AppLayout, AppSidebar, AppTopBar, ScreenoLogo, Tooltip, APP_NAV });
