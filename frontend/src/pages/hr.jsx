/* v2 — HR screens: Pipeline (refined), CandidateDetail (refined), ScheduleModal (3-step) */

const HR_PIPELINE_DATA = [
  { id: 1,  name: "Rahul Sharma",   email: "rahul.sharma@gmail.com",  role: "Senior .NET Developer", stage: "Tech Round 2", status: "active",    activity: "2 hours ago",  next: { when: "Today 2:00 PM",  today: true },  owner: "Sneha Patel" },
  { id: 2,  name: "Priya Mehta",    email: "priya.m@gmail.com",       role: "React Developer",        stage: "Final Round",  status: "active",    activity: "Yesterday",    next: { when: "Tomorrow 11:00 AM", today: false }, owner: "Amit Joshi" },
  { id: 3,  name: "Ankit Verma",    email: "ankit.v@outlook.com",     role: "Full Stack Engineer",    stage: "Offer Sent",   status: "offer",     activity: "3 days ago",   next: { when: "—" }, owner: "Sneha Patel" },
  { id: 4,  name: "Divya Singh",    email: "divya.s@gmail.com",       role: ".NET Developer",         stage: "AI Screening", status: "screening", activity: "Just now",     next: { when: "—" }, owner: null },
  { id: 5,  name: "Ravi Kumar",     email: "ravi.k@yahoo.in",         role: "Backend Developer",      stage: "Rejected",     status: "rejected",  activity: "1 week ago",   next: { when: "—" }, owner: "Amit Joshi" },
  { id: 6,  name: "Karthik Reddy",  email: "karthik.r@gmail.com",     role: "DevOps Engineer",        stage: "Tech Round 1", status: "active",    activity: "5 hours ago",  next: { when: "Today 4:30 PM", today: true },  owner: "Sneha Patel" },
  { id: 7,  name: "Sneha Joshi",    email: "sneha.j@gmail.com",       role: "Full Stack Engineer",    stage: "Exam",         status: "screening", activity: "1 day ago",    next: { when: "Awaiting submission" }, owner: null },
  { id: 8,  name: "Arjun Nair",     email: "arjun.n@gmail.com",       role: "Mobile Engineer",        stage: "Applied",      status: "screening", activity: "Today",        next: { when: "Send invite" }, owner: "Amit Joshi" },
];

const HRPipelineV2 = ({ onOpenCandidate, onSchedule }) => {
  const [query, setQuery] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [roleFilter, setRoleFilter] = React.useState("All");
  const [selected, setSelected] = React.useState(new Set());
  const [hoverRow, setHoverRow] = React.useState(null);
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [query, selected, hoverRow]);

  const filterActive = query || stageFilter !== "All" || statusFilter !== "All" || roleFilter !== "All";
  const rows = HR_PIPELINE_DATA.filter(r => {
    if (query && !`${r.name} ${r.email} ${r.role}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (stageFilter !== "All" && r.stage !== stageFilter) return false;
    if (statusFilter !== "All" && r.status !== statusFilter) return false;
    if (roleFilter !== "All" && r.role !== roleFilter) return false;
    return true;
  });

  const toggleRow = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));

  return (
    <>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em", margin: 0 }}>Pipeline</h1>
          <window.Chip tone="neutral">{HR_PIPELINE_DATA.length} candidates</window.Chip>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnOutline}><window.Icon name="upload" size={13} /> Import CSV</button>
          <button style={btnPrimaryV2}><window.Icon name="plus" size={13} /> Add candidate</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12,
        padding: 14, marginBottom: 16,
        display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F1F5F9", borderRadius: 8, padding: "8px 12px", width: 280 }}>
          <window.Icon name="search" size={14} color="#94A3B8" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontSize: 13, color: "#0F172A" }}
          />
          {query && <button onClick={() => setQuery("")} style={{ background: "transparent", border: 0, color: "#94A3B8", cursor: "pointer", padding: 2 }}><window.Icon name="x" size={12} /></button>}
        </div>
        <FilterSelect label="All Roles" value={roleFilter} onChange={setRoleFilter} options={["All", ...new Set(HR_PIPELINE_DATA.map(r => r.role))]} />
        <FilterSelect label="All Stages" value={stageFilter} onChange={setStageFilter} options={["All", ...new Set(HR_PIPELINE_DATA.map(r => r.stage))]} />
        <FilterSelect label="All Status" value={statusFilter} onChange={setStatusFilter} options={["All", "active", "screening", "offer", "rejected"]} />
        <FilterSelect label="Last 30 days" value="Last 30 days" options={["Last 7 days", "Last 30 days", "Last 90 days", "All time"]} />
        {filterActive && (
          <button onClick={() => { setQuery(""); setStageFilter("All"); setStatusFilter("All"); setRoleFilter("All"); }}
            style={{ background: "transparent", border: 0, color: "#5B4FE9", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "4px 8px" }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              <Th width={36}>
                <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} style={{ accentColor: "#5B4FE9", cursor: "pointer" }} />
              </Th>
              <Th>Candidate</Th>
              <Th>Role</Th>
              <Th>Stage</Th>
              <Th>Last activity</Th>
              <Th>Next interview</Th>
              <Th>Status</Th>
              <Th>Assigned</Th>
              <Th width={36}></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSelected = selected.has(r.id);
              const isHover = hoverRow === r.id;
              return (
                <tr key={r.id}
                  onMouseEnter={() => setHoverRow(r.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  onClick={() => onOpenCandidate?.(r)}
                  style={{
                    background: isSelected ? "#F3F0FF" : isHover ? "#F8FAFC" : "#FFF",
                    cursor: "pointer", transition: "background 120ms",
                  }}
                >
                  <Td><input type="checkbox" checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={() => toggleRow(r.id)} style={{ accentColor: "#5B4FE9", cursor: "pointer" }} /></Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <window.AvatarV2 name={r.name} size={36} />
                      <div>
                        <div style={{ fontWeight: 600, color: "#0F172A" }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{r.email}</div>
                      </div>
                    </div>
                  </Td>
                  <Td style={{ color: "#374151" }}>{r.role}</Td>
                  <Td><StageBadgeV2 stage={r.stage} status={r.status} /></Td>
                  <Td style={{ color: "#6B7280", fontSize: 12 }}>{r.activity}</Td>
                  <Td>
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color: r.next?.today ? "#047857" : "#6B7280",
                      fontFamily: r.next?.when?.includes("PM") || r.next?.when?.includes("AM") ? "var(--font-mono)" : "inherit",
                    }}>{r.next?.when || "—"}</span>
                  </Td>
                  <Td><StatusPill status={r.status} /></Td>
                  <Td>
                    {r.owner ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <window.AvatarV2 name={r.owner} size={24} />
                        <span style={{ fontSize: 12, color: "#374151" }}>{r.owner}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>Unassigned</span>
                    )}
                  </Td>
                  <Td>
                    {(isHover || isSelected) && (
                      <button onClick={(e) => { e.stopPropagation(); }} style={{ background: "transparent", border: 0, padding: 4, cursor: "pointer", color: "#6B7280", borderRadius: 6 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#E2E8F0"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <window.Icon name="more-horizontal" size={16} />
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #F1F5F9", fontSize: 12, color: "#6B7280" }}>
          <span>Showing {rows.length} of {HR_PIPELINE_DATA.length} candidates</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={pageBtn}><window.Icon name="chevron-left" size={12} /></button>
            <button style={{ ...pageBtn, background: "#5B4FE9", color: "#FFF", borderColor: "transparent" }}>1</button>
            <button style={pageBtn}>2</button>
            <button style={pageBtn}>3</button>
            <button style={pageBtn}><window.Icon name="chevron-right" size={12} /></button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())} />
      )}
    </>
  );
};

const FilterSelect = ({ label, value, onChange, options }) => (
  <select value={value} onChange={e => onChange?.(e.target.value)} style={{
    border: "1px solid #CBD5E1", borderRadius: 8, padding: "7px 28px 7px 12px",
    background: "#FFF", fontSize: 13, color: "#0F172A", fontWeight: 500,
    outline: "none", cursor: "pointer", fontFamily: "inherit",
    appearance: "none",
    backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path stroke=\'%236B7280\' stroke-width=\'1.5\' fill=\'none\' d=\'M2 4l3 3 3-3\'/></svg>")',
    backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
  }}>
    {(options || [label]).map(o => <option key={o} value={o}>{o === "All" ? label : o}</option>)}
  </select>
);

const Th = ({ children, width }) => (
  <th style={{
    textAlign: "left", padding: "11px 16px",
    fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
    color: "#6B7280", borderBottom: "1px solid #E2E8F0",
    width, whiteSpace: "nowrap",
  }}>{children}</th>
);

const Td = ({ children, style }) => (
  <td style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle", ...style }}>{children}</td>
);

const StageBadgeV2 = ({ stage, status }) => {
  const tone = {
    "Applied":       "info",
    "AI Screening":  "info",
    "Exam":          "info",
    "Tech Round 1":  "brand",
    "Tech Round 2":  "brand",
    "Final Round":   "warning",
    "Offer Sent":    "purple",
    "Rejected":      "danger",
  }[stage] || "neutral";
  return <window.Chip tone={tone}>{stage}</window.Chip>;
};

const StatusPill = ({ status }) => {
  const map = {
    active:    { tone: "success",  label: "Active",    icon: "circle" },
    screening: { tone: "info",     label: "Screening", icon: "circle" },
    offer:     { tone: "purple",   label: "Offer",     icon: "circle" },
    rejected:  { tone: "danger",   label: "Rejected",  icon: "circle" },
  }[status] || { tone: "neutral", label: status };
  return <window.Chip tone={map.tone}>{map.label}</window.Chip>;
};

const BulkBar = ({ count, onClear }) => (
  <div style={{
    position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
    background: "#0F172A", color: "#FFF", borderRadius: 14,
    padding: "10px 14px 10px 18px",
    display: "inline-flex", alignItems: "center", gap: 14,
    boxShadow: "0 16px 40px rgba(15,23,42,0.32)", zIndex: 30,
    animation: "bulkSlide 240ms cubic-bezier(0.2,0,0,1) both",
    fontSize: 13,
  }}>
    <span style={{ fontWeight: 600, fontSize: 13 }}>{count} selected</span>
    <div style={{ display: "flex", gap: 4 }}>
      {[
        { icon: "arrow-right-circle", label: "Advance" },
        { icon: "x-circle",            label: "Reject" },
        { icon: "mail",                label: "Remind" },
      ].map(b => (
        <button key={b.label} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 12px", borderRadius: 8, border: 0,
          background: "transparent", color: "#FFF", fontSize: 13, fontWeight: 500, cursor: "pointer",
          transition: "background 120ms",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <window.Icon name={b.icon} size={13} /> {b.label}
        </button>
      ))}
    </div>
    <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
    <button onClick={onClear} style={{ background: "transparent", border: 0, color: "#94A3B8", fontSize: 13, cursor: "pointer", padding: "4px 8px" }}>Deselect</button>
    <style>{`@keyframes bulkSlide { from { transform: translate(-50%, 60px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
  </div>
);

/* ============ HR CANDIDATE DETAIL (refined) ============ */

const HRCandidateDetailV2 = ({ candidate, onBack, onScheduleClick }) => {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [candidate?.id]);
  if (!candidate) candidate = HR_PIPELINE_DATA[0];

  const timeline = [
    { id: 1, type: "Exam",         done: true,  date: "May 18", body: "Score 78%",            tone: "success", icon: "check-circle-2", link: true },
    { id: 2, type: "AI Screening", done: true,  date: "May 19", body: "Passed (4.1 / 5)",      tone: "success", icon: "check-circle-2", link: true },
    { id: 3, type: "Tech Round 1", done: true,  date: "May 20", body: "Passed — Priya Kapoor", tone: "success", icon: "check-circle-2", link: true },
    { id: 4, type: "Tech Round 2", done: false, date: "May 22 · 2:00 PM", body: "Scheduled with Ankit Joshi", tone: "brand", icon: "video", link: false, current: true },
    { id: 5, type: "Final Round",  done: false, date: "—",      body: "Not yet scheduled",     tone: "neutral", icon: "circle", link: false, upcoming: true },
  ];

  return (
    <>
      {/* Header card */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: "0 1px 3px rgba(15,23,42,0.04)", display: "flex", alignItems: "flex-start", gap: 20 }}>
        <window.AvatarV2 name={candidate.name} size={64} ring="#DEDAFB" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.025em", margin: 0 }}>{candidate.name}</h1>
            <StatusPill status={candidate.status} />
            <StageBadgeV2 stage={candidate.stage} />
          </div>
          <div style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>Applied for {candidate.role}</div>
          <div style={{ display: "flex", gap: 18, fontSize: 13, color: "#6B7280", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="mail" size={13} /> {candidate.email}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="phone" size={13} /> +91 98765 43210</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="map-pin" size={13} /> Bangalore</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={onScheduleClick} style={btnPrimaryV2}><window.Icon name="calendar-plus" size={13} /> Schedule next</button>
          <button style={btnOutline}><window.Icon name="pause" size={13} /> Hold</button>
          <button style={{ ...btnOutline, color: "#B53618", borderColor: "#FFD4C2" }}><window.Icon name="x" size={13} /> Reject</button>
          <button style={btnIconOnly} title="Add note"><window.Icon name="message-square" size={14} /></button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Interview history */}
          <section style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#0F172A", margin: 0 }}>Interview history</h2>
              <button style={{ ...btnOutline, padding: "6px 12px", fontSize: 12 }} onClick={onScheduleClick}>
                <window.Icon name="plus" size={12} /> Schedule next
              </button>
            </div>
            <div style={{ position: "relative", paddingLeft: 28 }}>
              <div style={{ position: "absolute", left: 13, top: 6, bottom: 6, width: 2, background: "#E2E8F0", borderRadius: 9999 }} />
              {timeline.map((t, i) => (
                <window.Reveal key={t.id} delay={i * 60} style={{ position: "relative", padding: "10px 0 12px", display: "flex", gap: 14 }}>
                  <span style={{
                    position: "absolute", left: -28, top: 8,
                    width: 28, height: 28, borderRadius: 9999,
                    background: t.done ? "#5B4FE9" : t.current ? "#FFF" : "#FFF",
                    border: t.current ? "2px solid #5B4FE9" : t.upcoming ? "1px solid #E2E8F0" : 0,
                    color: t.done ? "#FFF" : t.current ? "#5B4FE9" : "#94A3B8",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    boxShadow: t.current ? "0 0 0 4px rgba(91,79,233,0.12)" : "none",
                  }}>
                    <window.Icon name={t.icon} size={14} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: t.upcoming ? "#94A3B8" : "#0F172A" }}>{t.type}</div>
                        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{t.date} · {t.body}</div>
                      </div>
                      {t.link && <a style={{ fontSize: 12, color: "#5B4FE9", fontWeight: 500, cursor: "pointer" }}>View report</a>}
                      {t.current && <window.Chip tone="brand">Up next</window.Chip>}
                    </div>
                  </div>
                </window.Reveal>
              ))}
            </div>
          </section>

          {/* HR notes */}
          <section style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#0F172A", margin: "0 0 16px" }}>HR notes</h2>
            <div style={{ padding: "14px 16px", background: "#F8FAFC", borderRadius: 10, borderLeft: "3px solid #5B4FE9", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <window.AvatarV2 name="Sneha Patel" size={24} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Sneha Patel</span>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>May 19</span>
              </div>
              <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>Strong candidate, recommended by internal referral. Fast learner per AI report.</p>
            </div>
            <textarea placeholder="Add a note for the hiring team…" rows={3}
              style={{ width: "100%", padding: 12, border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", lineHeight: 1.55, color: "#0F172A", outline: "none", resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button style={btnPrimaryV2}>Add note</button>
            </div>
          </section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* CV panel */}
          <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Curriculum vitae</div>
              <button style={{ ...btnIconOnly, padding: 4 }} title="Download">
                <window.Icon name="download" size={14} color="#5B4FE9" />
              </button>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, fontSize: 11, color: "#94A3B8", fontFamily: "var(--font-mono)" }}>
              {[
                { type: "h", w: "65%" }, { type: "h", w: "40%" },
                { type: "s" },
                { type: "p", w: "100%" }, { type: "p", w: "92%" }, { type: "p", w: "78%" },
                { type: "s" },
                { type: "p", w: "100%" }, { type: "p", w: "90%" },
                { type: "s" },
                { type: "p", w: "85%" }, { type: "p", w: "100%" }, { type: "p", w: "55%" },
              ].map((l, i) => l.type === "s" ? (
                <div key={i} style={{ height: 12 }} />
              ) : (
                <div key={i} style={{
                  height: l.type === "h" ? 7 : 5,
                  background: l.type === "h" ? "#94A3B8" : "#CBD5E1",
                  borderRadius: 9999,
                  width: l.w,
                  marginBottom: 6,
                }} />
              ))}
            </div>
            <a style={{ display: "block", textAlign: "center", marginTop: 12, fontSize: 12, color: "#5B4FE9", fontWeight: 500, cursor: "pointer" }}>Open full screen</a>
          </div>

          {/* Application info */}
          <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 14 }}>Application</div>
            {[
              { label: "Source",             value: <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><window.Icon name="linkedin" size={12} /> LinkedIn</span> },
              { label: "Applied",            value: "May 16, 2025" },
              { label: "Referred by",        value: "Rahul Mehta (Internal)" },
              { label: "Current interviewer", value: "Ankit Joshi" },
              { label: "Assigned HR",        value: "Sneha Patel" },
            ].map((it, i) => (
              <div key={it.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: i === 0 ? 0 : "1px solid #F1F5F9", fontSize: 12 }}>
                <span style={{ color: "#6B7280" }}>{it.label}</span>
                <span style={{ color: "#0F172A", fontWeight: 500 }}>{it.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

/* ============ SCHEDULE MODAL (3-step) ============ */

const ScheduleModalV2 = ({ open, candidate, onClose }) => {
  const [step, setStep] = React.useState(2); // start on Details
  const [interviewer, setInterviewer] = React.useState("ankit");
  const [selectedDay, setSelectedDay] = React.useState(3);
  const [selectedTime, setSelectedTime] = React.useState("14:00");
  const [duration, setDuration] = React.useState(60);
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [step, interviewer, selectedDay, selectedTime, duration]);

  const interviewers = [
    { id: "ankit",  name: "Ankit Joshi",  role: "Senior Engineer", avail: "Available today",            avlbl: true },
    { id: "priya",  name: "Priya Kapoor", role: "Tech Lead",        avail: "Busy today, available tomorrow", avlbl: false },
  ];
  const days = [
    { d: "Mon", n: 19 }, { d: "Tue", n: 20 }, { d: "Wed", n: 21 }, { d: "Thu", n: 22 }, { d: "Fri", n: 23 }, { d: "Sat", n: 24 }, { d: "Sun", n: 25 },
  ];
  const times = [
    { t: "10:00", available: true },  { t: "10:30", available: true },  { t: "11:00", available: false },
    { t: "14:00", available: true },  { t: "14:30", available: true },  { t: "15:00", available: false },
    { t: "16:00", available: true },
  ];

  return (
    <window.Modal open={open} onClose={onClose} width={560}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#0F172A", margin: 0, letterSpacing: "-0.01em" }}>
          Schedule interview — {candidate?.name || "Rahul Sharma"}
        </h3>
        <button onClick={onClose} style={{ background: "transparent", border: 0, padding: 6, borderRadius: 6, cursor: "pointer", color: "#6B7280" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#F1F5F9"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        ><window.Icon name="x" size={18} /></button>
      </div>

      {/* Body */}
      <div style={{ padding: 24, overflowY: "auto" }}>
        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, padding: "0 12px" }}>
          {["Type", "Details", "Confirm"].map((label, i) => {
            const idx = i + 1;
            const done = idx < step;
            const active = idx === step;
            return (
              <React.Fragment key={label}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 9999,
                    background: done ? "#5B4FE9" : active ? "#FFF" : "#FFF",
                    border: active ? "2px solid #5B4FE9" : done ? 0 : "1px solid #CBD5E1",
                    color: done ? "#FFF" : active ? "#5B4FE9" : "#94A3B8",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
                  }}>{done ? <window.Icon name="check" size={11} /> : idx}</span>
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "#5B4FE9" : done ? "#0F172A" : "#94A3B8" }}>{label}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: idx < step ? "#5B4FE9" : "#E2E8F0", margin: "0 12px", borderRadius: 9999 }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Type readonly */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#F8FAFC", borderRadius: 10, marginBottom: 18, border: "1px solid #E2E8F0" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EFEDFD", color: "#5B4FE9", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <window.Icon name="video" size={15} />
          </div>
          <div style={{ flex: 1, fontSize: 13, color: "#0F172A", fontWeight: 500 }}>Human video interview</div>
          <button style={{ background: "transparent", border: 0, color: "#5B4FE9", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Change</button>
        </div>

        {/* Interviewer */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Select interviewer</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {interviewers.map(iv => (
              <button key={iv.id} onClick={() => setInterviewer(iv.id)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: 10,
                border: `1px solid ${interviewer === iv.id ? "#5B4FE9" : "#E2E8F0"}`,
                background: interviewer === iv.id ? "#F3F0FF" : "#FFF",
                borderRadius: 10, cursor: "pointer", transition: "all 120ms",
                textAlign: "left",
              }}>
                <window.AvatarV2 name={iv.name} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{iv.name}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{iv.role}</div>
                </div>
                <window.Chip tone={iv.avlbl ? "success" : "warning"}>{iv.avail}</window.Chip>
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Preferred date</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {days.map((d, i) => (
              <button key={i} onClick={() => setSelectedDay(i)} style={{
                padding: "10px 4px", borderRadius: 8,
                background: selectedDay === i ? "#5B4FE9" : "#FFF",
                border: `1px solid ${selectedDay === i ? "#5B4FE9" : "#E2E8F0"}`,
                color: selectedDay === i ? "#FFF" : "#0F172A",
                cursor: "pointer", transition: "all 120ms", textAlign: "center",
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: selectedDay === i ? 0.85 : 0.6 }}>{d.d}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, marginTop: 2 }}>{d.n}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Available time</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {times.map(t => (
              <button key={t.t} disabled={!t.available} onClick={() => setSelectedTime(t.t)} style={{
                padding: "8px 0", borderRadius: 8,
                background: selectedTime === t.t ? "#5B4FE9" : "#FFF",
                border: `1px solid ${selectedTime === t.t ? "#5B4FE9" : "#E2E8F0"}`,
                color: !t.available ? "#CBD5E1" : selectedTime === t.t ? "#FFF" : "#374151",
                fontWeight: 600, fontSize: 13,
                cursor: t.available ? "pointer" : "not-allowed",
                textDecoration: !t.available ? "line-through" : "none",
                fontFamily: "var(--font-mono)",
                transition: "all 120ms",
              }}>{t.t}</button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Duration</label>
          <div style={{ display: "inline-flex", gap: 2, padding: 3, background: "#F1F5F9", borderRadius: 8 }}>
            {[30, 45, 60].map(d => (
              <button key={d} onClick={() => setDuration(d)} style={{
                padding: "7px 18px", borderRadius: 6, border: 0,
                background: duration === d ? "#FFF" : "transparent",
                color: duration === d ? "#5B4FE9" : "#6B7280",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                boxShadow: duration === d ? "0 1px 3px rgba(15,23,42,0.08)" : "none",
                transition: "all 120ms",
              }}>{d} min</button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Add note for interviewer <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span></label>
          <textarea placeholder="Anything the interviewer should know…" rows={2}
            style={{ width: "100%", padding: 10, border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", lineHeight: 1.55, color: "#0F172A", outline: "none", resize: "vertical" }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid #F1F5F9" }}>
        <button onClick={() => setStep(s => Math.max(1, s - 1))} style={btnGhostV2}><window.Icon name="arrow-left" size={13} /> Back</button>
        <button onClick={() => setStep(s => Math.min(3, s + 1))} style={btnPrimaryV2}>Next: Confirm <window.Icon name="arrow-right" size={13} /></button>
      </div>
    </window.Modal>
  );
};

/* ===== Styles shared in this file ===== */
const btnPrimaryV2 = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  background: "#5B4FE9", color: "#FFF", border: 0,
  fontSize: 13, fontWeight: 600, cursor: "pointer",
  transition: "background 120ms",
};
const btnOutline = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  background: "#FFF", color: "#0F172A", border: "1px solid #CBD5E1",
  fontSize: 13, fontWeight: 600, cursor: "pointer",
  transition: "all 120ms",
};
const btnGhostV2 = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  background: "transparent", color: "#475569", border: 0,
  fontSize: 13, fontWeight: 600, cursor: "pointer",
  transition: "background 120ms",
};
const btnIconOnly = {
  background: "#FFF", border: "1px solid #CBD5E1", borderRadius: 8,
  padding: 8, cursor: "pointer", color: "#374151",
  transition: "background 120ms",
};
const pageBtn = {
  width: 28, height: 28, borderRadius: 6, border: "1px solid #E2E8F0",
  background: "#FFF", color: "#374151", fontSize: 12, fontWeight: 600,
  cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
};

Object.assign(window, { HRPipelineV2, HRCandidateDetailV2, ScheduleModalV2, HR_PIPELINE_DATA });
