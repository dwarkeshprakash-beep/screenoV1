/* Jobs screen — lightweight list */

const JobsScreen = ({ tweaks }) => {
  const { JOBS } = window.SCREENO_DATA;
  window.useLucide();
  return (
    <div className="fadeup" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <window.Eyebrow>5 open roles · 24 active candidates</window.Eyebrow>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary"><window.Icon name="filter" size={14} /> Filter</button>
          <button className="btn btn-primary"><window.Icon name="plus" size={14} /> New role</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
        {JOBS.map(j => (
          <div key={j.id} className="card card-pad" style={{ cursor: "pointer", transition: "all 120ms" }}
               onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,23,42,0.06)"}
               onMouseLeave={e => e.currentTarget.style.boxShadow = ""}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <window.Pill tone="success" icon="circle">{j.stage}</window.Pill>
                <h3 className="display" style={{ fontSize: 17, margin: "10px 0 4px", letterSpacing: "-0.01em" }}>{j.title}</h3>
                <div style={{ fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><window.Icon name="building-2" size={12} /> {j.team}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><window.Icon name="map-pin" size={12} /> {j.loc}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon"><window.Icon name="more-horizontal" size={16} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "14px 0", borderTop: "1px solid #F1F5F9" }}>
              <div>
                <div style={{ fontSize: 11, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>Open</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "#0F172A" }}>{j.open}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>Pipeline</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "#0F172A" }}>{j.pipeline}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>Applied</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "#0F172A" }}>{j.applied}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6B7280" }}>
                <window.Avatar name={j.owner} size={22} fontSize={10} />
                {j.owner}
              </div>
              <button className="btn btn-ghost btn-sm">View <window.Icon name="arrow-right" size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.JobsScreen = JobsScreen;
