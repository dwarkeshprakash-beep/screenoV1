/* HR Pipeline screen — table + kanban variants */

const PipelineScreen = ({ onOpenCandidate, tweaks, navigate }) => {
  const { CANDIDATES, STAGES, MODES } = window.SCREENO_DATA;
  const [stage, setStage] = React.useState("all");
  const [sort, setSort] = React.useState({ col: "applied", dir: "desc" });
  const [view, setView] = React.useState(tweaks.pipelineView || "table"); // table | kanban
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(tweaks.loadingState === "loading");
  const [showEmpty, setShowEmpty] = React.useState(tweaks.loadingState === "empty");

  React.useEffect(() => { setView(tweaks.pipelineView || "table"); }, [tweaks.pipelineView]);
  React.useEffect(() => {
    setLoading(tweaks.loadingState === "loading");
    setShowEmpty(tweaks.loadingState === "empty");
    if (tweaks.loadingState === "loading") {
      const t = setTimeout(() => setLoading(false), 1400);
      return () => clearTimeout(t);
    }
  }, [tweaks.loadingState]);

  window.useLucide([stage, view, query, loading, showEmpty]);

  const counts = React.useMemo(() => {
    const c = { all: CANDIDATES.length };
    Object.keys(STAGES).forEach(k => { c[k] = CANDIDATES.filter(x => x.stage === k).length; });
    return c;
  }, []);

  const filtered = React.useMemo(() => {
    let rows = stage === "all" ? CANDIDATES : CANDIDATES.filter(c => c.stage === stage);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(c => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.loc.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sort.col], bv = b[sort.col];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [stage, sort, query]);

  const stages = [
    { id: "all", label: "All", count: counts.all },
    { id: "applied", label: "Applied", count: counts.applied },
    { id: "screen", label: "In screen", count: counts.screen },
    { id: "interview", label: "Interview", count: counts.interview },
    { id: "offer", label: "Offer", count: counts.offer },
    { id: "rejected", label: "Rejected", count: counts.rejected },
  ];

  const Th = ({ id, children, width, align = "left" }) => (
    <th className="sortable" style={{ width, textAlign: align }} onClick={() => setSort({ col: id, dir: sort.col === id && sort.dir === "asc" ? "desc" : "asc" })}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {children}
        <window.Icon name={sort.col === id ? (sort.dir === "asc" ? "chevron-up" : "chevron-down") : "chevrons-up-down"} size={12} color="#94A3B8" />
      </span>
    </th>
  );

  return (
    <div className="fadeup" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <window.Stat label="Active candidates" value={CANDIDATES.filter(c => c.stage !== "rejected").length} delta="+4 this week" deltaDir="up" icon="users" />
        <window.Stat label="In interview"      value={counts.interview} delta="+2 vs last week" deltaDir="up" icon="phone" />
        <window.Stat label="Avg score"         value="3.9" delta="↑ 0.2" deltaDir="up" icon="star" />
        <window.Stat label="Time to hire"      value="14d" delta="-2d" deltaDir="up" icon="clock" />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <window.Segmented items={stages} active={stage} onChange={setStage} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="search" style={{ width: 240, padding: "6px 12px" }}>
            <window.Icon name="search" size={14} />
            <input placeholder="Filter by name, role…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="seg">
            <button className={view === "table" ? "on" : ""} onClick={() => setView("table")} title="Table view"><window.Icon name="list" size={14} /></button>
            <button className={view === "kanban" ? "on" : ""} onClick={() => setView("kanban")} title="Kanban view"><window.Icon name="kanban-square" size={14} /></button>
          </div>
          <button className="btn btn-secondary"><window.Icon name="filter" size={14} /> Filter</button>
          <button className="btn btn-primary"><window.Icon name="plus" size={14} /> Invite candidate</button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="card card-pad" style={{ padding: 0 }}>
          <div style={{ padding: "0 16px" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: i < 5 ? "1px solid #F1F5F9" : 0 }}>
                <window.Skeleton w={32} h={32} r={9999} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <window.Skeleton w="40%" h={12} />
                  <window.Skeleton w="60%" h={10} />
                </div>
                <window.Skeleton w={120} h={20} r={9999} />
                <window.Skeleton w={80} h={12} />
              </div>
            ))}
          </div>
        </div>
      ) : showEmpty || filtered.length === 0 ? (
        <div className="card">
          <window.Empty
            icon="users"
            title={query ? "No matches" : "No candidates yet"}
            body={query ? `No candidates match "${query}". Try a different search.` : "Invite candidates by email or share a public application link."}
            action={!query && <button className="btn btn-primary"><window.Icon name="plus" size={14} /> Invite candidate</button>}
          />
        </div>
      ) : view === "table" ? (
        <table className={`tbl ${tweaks.density === "compact" ? "tbl--compact" : ""}`}>
          <thead>
            <tr>
              <Th id="name" width="26%">Candidate</Th>
              <Th id="role" width="22%">Role</Th>
              <Th id="mode" width="14%">Next mode</Th>
              <Th id="stage" width="12%">Stage</Th>
              <Th id="score" width="14%">Score</Th>
              <Th id="applied" width="10%">Applied</Th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="row" onClick={() => onOpenCandidate(c)}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <window.Avatar name={c.name} size={36} />
                    <div>
                      <div style={{ fontWeight: 600, color: "#0F172A" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
                        <window.Icon name="map-pin" size={11} color="#94A3B8" />
                        {c.loc} · {c.exp}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ color: "#374151" }}>{c.role}</td>
                <td><window.ModeBadge mode={c.mode} /></td>
                <td><window.StageBadge stage={c.stage} /></td>
                <td><window.Score value={c.score} /></td>
                <td style={{ color: "#6B7280", fontSize: 12 }}>{c.applied}</td>
                <td>
                  <button className="btn btn-ghost btn-icon" onClick={(e) => e.stopPropagation()}>
                    <window.Icon name="more-horizontal" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Kanban candidates={filtered} onOpen={onOpenCandidate} stages={Object.keys(STAGES)} />
      )}
    </div>
  );
};

const Kanban = ({ candidates, onOpen, stages }) => {
  const { STAGES, MODES } = window.SCREENO_DATA;
  return (
    <div className="kan-board">
      {stages.map(key => {
        const col = candidates.filter(c => c.stage === key);
        const meta = STAGES[key];
        return (
          <div key={key} className="kan-col">
            <div className="kan-col-head">
              <div className="kan-col-title">
                <span className="kan-col-dot" style={{ background: meta.dot }} />
                {meta.label}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6B7280", marginLeft: 4 }}>{col.length}</span>
              </div>
              <button className="btn btn-ghost btn-icon" style={{ padding: 4 }}><window.Icon name="plus" size={14} /></button>
            </div>
            {col.length === 0 ? (
              <div style={{ color: "#94A3B8", fontSize: 12, padding: "20px 0", textAlign: "center" }}>None</div>
            ) : col.map(c => {
              const mode = MODES[c.mode];
              return (
                <div key={c.id} className="kan-card" onClick={() => onOpen(c)}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <window.Avatar name={c.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#0F172A", fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.role}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 8 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: mode.color, fontWeight: 600 }}>
                      <window.Icon name={mode.icon} size={12} />
                      {mode.label.split(" ")[0]}
                    </span>
                    <window.Score value={c.score} width={36} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

window.PipelineScreen = PipelineScreen;
