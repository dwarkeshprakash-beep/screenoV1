/* Scorecard form — interviewer fills this in after a round */

const ScorecardScreen = ({ candidate, navigate, onSubmit }) => {
  const { RUBRIC } = window.SCREENO_DATA;
  const [scores, setScores] = React.useState({ tech: 4, problem: 4, comm: 5, collab: 4 });
  const [notes, setNotes] = React.useState({});
  const [recommend, setRecommend] = React.useState("hire");
  const [overallNote, setOverallNote] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  window.useLucide();

  if (!candidate) return null;

  const overall = (Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length).toFixed(1);
  const recommendOptions = [
    { id: "strong-hire", label: "Strong hire",   icon: "thumbs-up",      color: "var(--success-600)", bg: "var(--success-50)" },
    { id: "hire",        label: "Hire",           icon: "check-circle-2", color: "var(--success-500)", bg: "var(--success-50)" },
    { id: "no-hire",     label: "No hire",        icon: "x-circle",       color: "var(--danger-700)", bg: "var(--danger-50)" },
    { id: "strong-no",   label: "Strong no hire", icon: "thumbs-down",    color: "#7F1D1D", bg: "#FEE2E2" },
  ];

  return (
    <div className="fadeup" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
      {/* Main form */}
      <div className="card card-pad-lg">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 22, borderBottom: "1px solid var(--slate-100)" }}>
          <window.Avatar name={candidate.name} size={48} />
          <div style={{ flex: 1 }}>
            <window.Eyebrow>Scorecard · Round 2 · Tech</window.Eyebrow>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--slate-900)", marginTop: 4 }}>How did {candidate.name.split(" ")[0]} perform?</div>
            <div style={{ fontSize: 13, color: "var(--slate-500)", marginTop: 2 }}>{candidate.role} · 60 min interview</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("candidate", candidate)}>
            <window.Icon name="x" size={14} /> Close
          </button>
        </div>

        {/* Rubric */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {RUBRIC.map(r => (
            <div key={r.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)" }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: "var(--slate-500)", marginTop: 2 }}>{r.desc}</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 18, color: scores[r.id] >= 4 ? "var(--success-600)" : scores[r.id] >= 3 ? "var(--warning-600)" : "var(--danger-700)" }}>
                  {scores[r.id] || "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { v: 1, label: "Weak" },
                  { v: 2, label: "Below bar" },
                  { v: 3, label: "OK" },
                  { v: 4, label: "Good" },
                  { v: 5, label: "Excellent" },
                ].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => { setScores(s => ({ ...s, [r.id]: opt.v })); setTouched(true); }}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 8,
                      border: "1px solid",
                      borderColor: scores[r.id] === opt.v ? "var(--brand-500)" : "var(--slate-200)",
                      background: scores[r.id] === opt.v ? "var(--brand-50)" : "var(--bg-surface)",
                      color: scores[r.id] === opt.v ? "var(--brand-700)" : "var(--slate-700)",
                      cursor: "pointer", transition: "all 120ms",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 15 }}>{opt.v}</span>
                    <span style={{ fontSize: 10, color: "inherit", opacity: 0.8, fontWeight: 500 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
              <textarea
                className="input"
                rows="2"
                placeholder={`Evidence for ${r.label.toLowerCase()} score (optional)…`}
                value={notes[r.id] || ""}
                onChange={(e) => setNotes(n => ({ ...n, [r.id]: e.target.value }))}
                style={{ marginTop: 10, fontSize: 13, resize: "vertical" }}
              />
            </div>
          ))}
        </div>

        {/* Recommendation */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--slate-100)" }}>
          <window.Eyebrow>Hiring recommendation</window.Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
            {recommendOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setRecommend(opt.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  padding: "16px 12px", borderRadius: 10,
                  border: `1px solid ${recommend === opt.id ? opt.color : "var(--slate-200)"}`,
                  background: recommend === opt.id ? opt.bg : "var(--bg-surface)",
                  color: recommend === opt.id ? opt.color : "var(--slate-500)",
                  cursor: "pointer", transition: "all 120ms",
                  fontWeight: recommend === opt.id ? 600 : 500, fontSize: 13,
                }}
              >
                <window.Icon name={opt.icon} size={20} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overall note */}
        <div style={{ marginTop: 24 }}>
          <label className="label">Summary for hiring panel</label>
          <textarea
            className="input"
            rows="4"
            placeholder="One paragraph: where they shone, where they wobbled, and your decision rationale."
            value={overallNote}
            onChange={(e) => setOverallNote(e.target.value)}
            style={{ fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
          />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--slate-100)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="btn btn-ghost btn-sm">
            <window.Icon name="save" size={14} /> Save draft
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => navigate("candidate", candidate)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSubmit?.()}>
              <window.Icon name="check" size={14} /> Submit scorecard
            </button>
          </div>
        </div>
      </div>

      {/* Side rail */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 88 }}>
        <div className="card card-pad" style={{ textAlign: "center" }}>
          <window.Eyebrow>Overall score</window.Eyebrow>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.03em", lineHeight: 1, marginTop: 12 }}>
            {overall}
          </div>
          <div style={{ fontSize: 12, color: "var(--slate-500)", marginTop: 4 }}>/ 5.0</div>
          <div style={{ height: 6, background: "var(--slate-100)", borderRadius: 9999, marginTop: 16, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(overall / 5) * 100}%`, background: "var(--brand-500)", borderRadius: 9999, transition: "width 240ms" }} />
          </div>
        </div>

        <div className="card card-pad">
          <window.Eyebrow>Other rounds</window.Eyebrow>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { who: "Sara Mehta",   round: "Round 1 · Tech",  s: 4.1 },
              { who: "Screeno AI",   round: "AI voice screen", s: 4.4 },
              { who: "—",            round: "Coding exam",     s: "92%" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <window.Avatar name={r.who === "Screeno AI" ? "AI" : r.who} size={26} fontSize={11} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--slate-900)" }}>{r.who}</div>
                  <div style={{ fontSize: 11, color: "var(--slate-500)" }}>{r.round}</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13, color: "var(--success-600)" }}>{typeof r.s === "number" ? r.s.toFixed(1) : r.s}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 14, background: "var(--slate-50)", borderRadius: 10, fontSize: 12, color: "var(--slate-500)", lineHeight: 1.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--slate-900)", fontWeight: 600, marginBottom: 6 }}>
            <window.Icon name="info" size={14} color="var(--brand-500)" /> Scoring guidance
          </div>
          Use specific evidence. "Walked through tradeoffs of an idempotency key" reads better than "great communication."
        </div>
      </div>
    </div>
  );
};

window.ScorecardScreen = ScorecardScreen;
