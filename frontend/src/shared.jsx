/* Screeno shared components */

const Icon = ({ name, size = 16, color, strokeWidth, style, className }) => (
  <i
    data-lucide={name}
    style={{ width: size, height: size, color, strokeWidth, display: "inline-flex", flexShrink: 0, ...style }}
    className={className}
  ></i>
);

// Initials avatar — name-based color
const INITIALS_COLORS = [
  { bg: "#DEDAFB", fg: "#3A31A3" }, // brand
  { bg: "#FED7AA", fg: "#9A3412" }, // orange
  { bg: "#A7F3D0", fg: "#065F46" }, // green
  { bg: "#BFDBFE", fg: "#1E40AF" }, // blue
  { bg: "#FBCFE8", fg: "#9D174D" }, // pink
  { bg: "#FDE68A", fg: "#854D0E" }, // amber
  { bg: "#C7D2FE", fg: "#3730A3" }, // indigo
  { bg: "#FCA5A5", fg: "#7F1D1D" }, // red
];
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); };
const initialsOf = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

const Avatar = ({ name = "?", size = 32, fontSize, src, style, ring }) => {
  const c = INITIALS_COLORS[hashStr(name) % INITIALS_COLORS.length];
  return (
    <div
      className="av"
      style={{
        width: size, height: size,
        background: src ? "transparent" : c.bg, color: c.fg,
        fontSize: fontSize || Math.round(size * 0.38),
        boxShadow: ring ? `0 0 0 2px #FFF, 0 0 0 4px ${ring}` : undefined,
        ...style,
      }}
    >
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", borderRadius: "9999px", objectFit: "cover" }} /> : initialsOf(name)}
    </div>
  );
};

const Pill = ({ children, tone = "neutral", icon }) => (
  <span className={`pill pill--${tone}`}>
    {icon && <Icon name={icon} size={12} />}
    {children}
  </span>
);

const StageBadge = ({ stage }) => {
  const { STAGES } = window.SCREENO_DATA;
  const s = STAGES[stage] || STAGES.applied;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

const ModeBadge = ({ mode, size = 14 }) => {
  const { MODES } = window.SCREENO_DATA;
  const m = MODES[mode];
  if (!m) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#374151", fontSize: 13 }}>
      <span style={{ width: 24, height: 24, borderRadius: 6, background: `${m.color}15`, color: m.color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={m.icon} size={size} />
      </span>
      <span style={{ fontWeight: 500 }}>{m.label}</span>
    </span>
  );
};

const Score = ({ value, width = 56, showBar = true }) => {
  if (value == null) return <span style={{ color: "#94A3B8", fontFamily: "var(--font-mono)" }}>—</span>;
  const color = value >= 4 ? "#047857" : value >= 3 ? "#B45309" : "#B53618";
  return (
    <span className="scorebar">
      <span style={{ color }}>{value.toFixed(1)}</span>
      {showBar && (
        <span className="scorebar-track" style={{ width }}>
          <span className="scorebar-fill" style={{ width: `${(value / 5) * 100}%`, background: color }} />
        </span>
      )}
    </span>
  );
};

const Eyebrow = ({ children, color = "#5B4FE9" }) => (
  <div className="eyebrow" style={{ color }}>{children}</div>
);

const Stat = ({ label, value, delta, deltaDir = "up", icon }) => (
  <div className="stat">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div className="stat-label">{label}</div>
      {icon && <Icon name={icon} size={14} color="#94A3B8" />}
    </div>
    <div className="stat-value">{value}</div>
    {delta && <div className={`stat-delta ${deltaDir}`}>{delta}</div>}
  </div>
);

const Empty = ({ icon = "inbox", title, body, action }) => (
  <div className="empty">
    <Icon name={icon} size={48} style={{ width: 48, height: 48, color: "#94A3B8", margin: "0 auto 14px" }} />
    <h3>{title}</h3>
    <p>{body}</p>
    {action}
  </div>
);

const Skeleton = ({ w = "100%", h = 14, r = 6, style }) => (
  <div className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />
);

const Tabs = ({ items, active, onChange }) => (
  <div className="tabs">
    {items.map(it => (
      <button key={it.id} className={active === it.id ? "on" : ""} onClick={() => onChange(it.id)}>
        {it.label}
        {it.count != null && <span style={{ marginLeft: 6, fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-mono)" }}>({it.count})</span>}
      </button>
    ))}
  </div>
);

const Segmented = ({ items, active, onChange }) => (
  <div className="seg">
    {items.map(it => (
      <button key={it.id} className={active === it.id ? "on" : ""} onClick={() => onChange(it.id)}>
        {it.icon && <Icon name={it.icon} size={14} />}
        {it.label}
        {it.count != null && <span className="seg-count">{it.count}</span>}
      </button>
    ))}
  </div>
);

/* Sidebar / app shell */
const SIDEBAR_NAV = [
  { section: "Hiring", items: [
    { id: "pipeline",  label: "Pipeline",  icon: "users", badge: 18 },
    { id: "candidate", label: "Candidate", icon: "user", hidden: true },
    { id: "jobs",      label: "Jobs",      icon: "briefcase", badge: 5 },
    { id: "schedule",  label: "Schedule",  icon: "calendar" },
    { id: "reports",   label: "Reports",   icon: "bar-chart-3" },
  ]},
  { section: "Workspace", items: [
    { id: "team",         label: "Team",         icon: "user-cog" },
    { id: "integrations", label: "Integrations", icon: "plug" },
    { id: "settings",     label: "Settings",     icon: "settings" },
  ]},
];

const Sidebar = ({ active, onNav, user = { name: "Alex Morgan", role: "HR · Acme" } }) => (
  <aside className="sb">
    <div className="sb-brand">
      <div className="sb-brand-mark" />
      <div className="sb-brand-text">Screeno</div>
    </div>
    {SIDEBAR_NAV.map((sec, i) => (
      <React.Fragment key={i}>
        <div className="sb-section">{sec.section}</div>
        {sec.items.filter(it => !it.hidden).map(it => (
          <div key={it.id} className={`sb-nav ${active === it.id ? "on" : ""}`} onClick={() => onNav(it.id)}>
            <Icon name={it.icon} size={16} />
            <span style={{ flex: 1 }}>{it.label}</span>
            {it.badge && <span className="sb-nav-badge">{it.badge}</span>}
          </div>
        ))}
      </React.Fragment>
    ))}
    <div className="sb-footer">
      <Avatar name={user.name} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
        <div className="role">{user.role}</div>
      </div>
      <Icon name="chevron-up" size={14} color="#64748B" />
    </div>
  </aside>
);

const TopBar = ({ title, crumbs, action, searchPlaceholder = "Search candidates, jobs…" }) => (
  <div className="tb">
    {crumbs ? (
      <div className="tb-crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            {c.onClick ? <a onClick={c.onClick} style={{ cursor: "pointer" }}>{c.label}</a> : <span style={{ color: i === crumbs.length - 1 ? "#0F172A" : "#6B7280", fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>{c.label}</span>}
          </React.Fragment>
        ))}
      </div>
    ) : (
      <h1>{title}</h1>
    )}
    <div className="tb-right">
      <div className="search">
        <Icon name="search" size={14} />
        <input placeholder={searchPlaceholder} />
        <kbd>⌘K</kbd>
      </div>
      <button className="btn btn-secondary btn-icon" title="Notifications">
        <Icon name="bell" size={16} />
      </button>
      {action}
    </div>
  </div>
);

const AppShell = ({ active, onNav, title, crumbs, action, children, screenLabel, user }) => (
  <div className="app" data-screen-label={screenLabel || active}>
    <Sidebar active={active} onNav={onNav} user={user} />
    <div className="main">
      <TopBar title={title} crumbs={crumbs} action={action} />
      <div className="content">{children}</div>
    </div>
  </div>
);

/* Toast helper (very simple) */
const Toast = ({ children, icon = "check-circle-2", onDismiss }) => {
  React.useEffect(() => {
    if (!onDismiss) return;
    const t = setTimeout(onDismiss, 2600);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="toast">
      <Icon name={icon} size={16} color="#10B981" />
      <span>{children}</span>
    </div>
  );
};

/* Re-render lucide after mount/update */
const useLucide = (deps = []) => {
  React.useEffect(() => {
    const t = setTimeout(() => window.lucide && window.lucide.createIcons(), 30);
    return () => clearTimeout(t);
  }, deps);
};

Object.assign(window, {
  Icon, Avatar, Pill, StageBadge, ModeBadge, Score, Eyebrow, Stat, Empty, Skeleton,
  Tabs, Segmented, Sidebar, TopBar, AppShell, Toast, useLucide,
  initialsOf, hashStr,
});
