/* Reports — analytics overview */

const ReportsScreen = ({ tweaks }) => {
  window.useLucide();

  const funnel = [
    { stage: "Applied",   n: 142, w: "100%", color: "var(--info-500)" },
    { stage: "Screened",  n: 87,  w: "61%",  color: "var(--brand-500)" },
    { stage: "Interview", n: 34,  w: "24%",  color: "var(--warning-500)" },
    { stage: "Offer",     n: 12,  w: "8.5%", color: "var(--success-500)" },
    { stage: "Hired",     n: 7,   w: "4.9%", color: "var(--success-600)" },
  ];

  // Weekly bars data
  const weeks = [
    { w: "W18", a: 18, s: 11, i: 4, h: 1 },
    { w: "W19", a: 24, s: 16, i: 7, h: 2 },
    { w: "W20", a: 31, s: 20, i: 8, h: 1 },
    { w: "W21", a: 28, s: 19, i: 9, h: 2 },
    { w: "W22", a: 42, s: 28, i: 12, h: 3 },
  ];

  return (
    <div className="fadeup" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Range bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="seg">
          <button>7 days</button>
          <button className="on">30 days</button>
          <button>90 days</button>
          <button>QTD</button>
          <button>Custom</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary"><window.Icon name="download" size={14} /> Export CSV</button>
          <button className="btn btn-secondary"><window.Icon name="share-2" size={14} /> Share</button>
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <window.Stat label="Applied" value="142" delta="+18% vs prev" deltaDir="up" icon="user-plus" />
        <window.Stat label="Pass rate (screen → interview)" value="39%" delta="-2pp" deltaDir="down" icon="filter" />
        <window.Stat label="Offer accept rate" value="71%" delta="+6pp" deltaDir="up" icon="check-circle-2" />
        <window.Stat label="Time to hire" value="14d" delta="-2d" deltaDir="up" icon="clock" />
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        {/* Funnel */}
        <div className="card card-pad-lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <window.Eyebrow>Hiring funnel · last 30 days</window.Eyebrow>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--slate-900)", marginTop: 6 }}>4.9% applied → hired</div>
            </div>
            <button className="btn btn-ghost btn-sm">By role <window.Icon name="chevron-down" size={12} /></button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {funnel.map((f, i) => (
              <div key={f.stage}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--slate-700)", marginBottom: 6 }}>
                  <span style={{ fontWeight: 500 }}>{f.stage}</span>
                  <span><strong style={{ fontFamily: "var(--font-mono)", color: "var(--slate-900)" }}>{f.n}</strong> <span style={{ color: "var(--slate-500)" }}>· {f.w}</span></span>
                </div>
                <div style={{ height: 24, background: "var(--slate-50)", borderRadius: 6, position: "relative", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: f.w, background: f.color, borderRadius: 6, transition: "width 400ms cubic-bezier(0.2,0,0,1)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By source */}
        <div className="card card-pad-lg">
          <window.Eyebrow>Applications by source</window.Eyebrow>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { name: "Naukri",      n: 58, pct: 41, color: "var(--brand-500)" },
              { name: "Referrals",   n: 42, pct: 30, color: "var(--success-500)" },
              { name: "LinkedIn",    n: 28, pct: 20, color: "var(--info-500)" },
              { name: "Direct",      n: 14, pct: 9,  color: "var(--warning-500)" },
            ].map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--slate-900)" }}>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span style={{ color: "var(--slate-500)", fontSize: 12 }}>{s.n} · {s.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "var(--slate-100)", borderRadius: 9999, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: 9999 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly volume chart */}
      <div className="card card-pad-lg">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <window.Eyebrow>Weekly pipeline volume</window.Eyebrow>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--slate-900)", marginTop: 6 }}>Last 5 weeks</div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--slate-500)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--brand-200)" }} /> Applied</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--brand-500)" }} /> Screened</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--warning-500)" }} /> Interview</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--success-500)" }} /> Hired</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 24, alignItems: "end", height: 240, padding: "0 12px" }}>
          {weeks.map(w => {
            const max = 48;
            const bars = [
              { v: w.a, c: "var(--brand-200)" },
              { v: w.s, c: "var(--brand-500)" },
              { v: w.i, c: "var(--warning-500)" },
              { v: w.h, c: "var(--success-500)" },
            ];
            return (
              <div key={w.w} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "end", gap: 4, width: "100%", justifyContent: "center" }}>
                  {bars.map((b, i) => (
                    <div key={i} style={{
                      width: 18, height: `${(b.v / max) * 100}%`,
                      background: b.c, borderRadius: "4px 4px 0 0",
                      transition: "height 400ms cubic-bezier(0.2,0,0,1)",
                    }} title={`${b.v}`} />
                  ))}
                </div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--slate-400)" }}>{w.w}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

window.ReportsScreen = ReportsScreen;
