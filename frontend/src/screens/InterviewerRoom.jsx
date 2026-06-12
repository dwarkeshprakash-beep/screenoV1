/* Interviewer Live Video Room — video tile + side scorecard */

const InterviewerRoomScreen = ({ navigate, tweaks }) => {
  const { RUBRIC } = window.SCREENO_DATA;
  const [muted, setMuted] = React.useState(false);
  const [camOn, setCamOn] = React.useState(true);
  const [elapsed, setElapsed] = React.useState(1132); // 18:52
  const [scores, setScores] = React.useState({});
  const [notes, setNotes] = React.useState("Strong on idempotency tradeoffs. Ask about scaling reads — Postgres replica strategy.");
  const [activePanel, setActivePanel] = React.useState("scorecard"); // scorecard | rubric | notes
  window.useLucide([camOn, muted, activePanel]);

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--slate-900)", display: "flex", flexDirection: "column", color: "var(--slate-200)" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", background: "var(--slate-900)", borderBottom: "1px solid #1E293B" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="sb-brand-mark" style={{ width: 26, height: 26 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--bg-surface)" }}>Round 2 · Divya Iyer</div>
            <div style={{ fontSize: 12, color: "var(--slate-400)" }}>Backend Engineer (Java) · 60 min · Hosted by Screeno</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--danger-500)" }}>
            <span className="pulse-dot" />
            <span style={{ fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Live</span>
          </span>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--slate-200)", fontVariantNumeric: "tabular-nums", padding: "5px 12px", background: "#1E293B", borderRadius: 6 }}>{mins}:{secs}</div>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--slate-400)" }}>
            <window.Icon name="users" size={14} /> 2 in room
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", gap: 0, minHeight: 0 }}>
        {/* Video stage */}
        <div style={{ display: "flex", flexDirection: "column", padding: 20, gap: 16, minHeight: 0 }}>
          {/* Main video */}
          <div style={{ flex: 1, background: "#1E293B", borderRadius: 16, position: "relative", overflow: "hidden", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Mock video — initials in big circle */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 40%, #334155 0%, var(--slate-900) 70%)" }} />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              <window.Avatar name="Divya Iyer" size={140} fontSize={48} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--bg-surface)", textAlign: "center" }}>Divya Iyer</div>
                <div style={{ fontSize: 12, color: "var(--slate-400)", textAlign: "center", marginTop: 4 }}>Chennai · Backend Engineer (Java)</div>
              </div>
            </div>
            {/* Name label bottom-left */}
            <div style={{ position: "absolute", left: 16, bottom: 16, padding: "6px 12px", background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)", borderRadius: 8, fontSize: 13, color: "var(--bg-surface)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <window.Icon name="mic" size={12} color="#10B981" />
              Divya Iyer
            </div>
            {/* PiP self-view */}
            <div style={{ position: "absolute", right: 16, bottom: 16, width: 200, height: 132, background: camOn ? "linear-gradient(135deg, #475569, #334155)" : "#1E293B", borderRadius: 12, border: "2px solid #334155", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {camOn ? (
                <>
                  <window.Avatar name="Anand Raman" size={56} fontSize={20} />
                  <div style={{ position: "absolute", left: 8, bottom: 6, fontSize: 11, color: "var(--bg-surface)", padding: "2px 6px", background: "rgba(15,23,42,0.6)", borderRadius: 4 }}>You</div>
                </>
              ) : (
                <div style={{ color: "#64748B", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <window.Icon name="video-off" size={20} />
                  <div style={{ fontSize: 11 }}>Camera off</div>
                </div>
              )}
            </div>
            {/* Recording indicator */}
            <div style={{ position: "absolute", left: 16, top: 16, padding: "5px 10px", background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)", borderRadius: 6, fontSize: 11, color: "var(--bg-surface)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="pulse-dot" style={{ width: 6, height: 6 }} />
              <span style={{ fontWeight: 600, letterSpacing: "0.05em" }}>REC · 18:52</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <button
              onClick={() => setMuted(m => !m)}
              className="btn"
              style={{
                width: 48, height: 48, borderRadius: 9999,
                background: muted ? "var(--danger-500)" : "#1E293B",
                color: "var(--bg-surface)", border: 0,
              }}
              title={muted ? "Unmute" : "Mute"}
            >
              <window.Icon name={muted ? "mic-off" : "mic"} size={18} />
            </button>
            <button
              onClick={() => setCamOn(c => !c)}
              className="btn"
              style={{
                width: 48, height: 48, borderRadius: 9999,
                background: !camOn ? "var(--danger-500)" : "#1E293B",
                color: "var(--bg-surface)", border: 0,
              }}
              title={camOn ? "Turn camera off" : "Turn camera on"}
            >
              <window.Icon name={camOn ? "video" : "video-off"} size={18} />
            </button>
            <button className="btn" style={{ width: 48, height: 48, borderRadius: 9999, background: "#1E293B", color: "var(--bg-surface)", border: 0 }} title="Share screen">
              <window.Icon name="monitor-up" size={18} />
            </button>
            <button className="btn" style={{ width: 48, height: 48, borderRadius: 9999, background: "#1E293B", color: "var(--bg-surface)", border: 0 }} title="Open whiteboard">
              <window.Icon name="pen-tool" size={18} />
            </button>
            <button className="btn btn-danger" style={{ height: 48, padding: "0 22px", borderRadius: 9999, marginLeft: 8 }} onClick={() => navigate("pipeline")}>
              <window.Icon name="phone-off" size={16} /> End call
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div style={{ background: "var(--bg-surface)", color: "var(--slate-900)", display: "flex", flexDirection: "column", borderLeft: "1px solid #1E293B" }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--slate-200)" }}>
            {[
              { id: "scorecard", label: "Scorecard", icon: "check-square" },
              { id: "rubric",    label: "Rubric",    icon: "list-checks" },
              { id: "notes",     label: "Notes",     icon: "edit-3" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActivePanel(t.id)}
                style={{
                  flex: 1, padding: "14px 0",
                  background: "transparent", border: 0,
                  fontSize: 12, fontWeight: activePanel === t.id ? 600 : 500,
                  color: activePanel === t.id ? "var(--brand-500)" : "var(--slate-500)",
                  borderBottom: activePanel === t.id ? "2px solid var(--brand-500)" : "2px solid transparent",
                  marginBottom: -1,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 120ms",
                }}
              >
                <window.Icon name={t.icon} size={13} />
                {t.label}
              </button>
            ))}
          </div>

          {activePanel === "scorecard" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <window.Eyebrow>Live scorecard</window.Eyebrow>
                <div style={{ fontSize: 13, color: "var(--slate-500)", marginTop: 4 }}>Score as you go. Auto-saved.</div>
              </div>
              {RUBRIC.map(r => (
                <div key={r.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-900)" }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: "var(--slate-500)", marginTop: 2, lineHeight: 1.5 }}>{r.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setScores(s => ({ ...s, [r.id]: n }))}
                        style={{
                          flex: 1, padding: "10px 0",
                          borderRadius: 6, border: "1px solid",
                          borderColor: scores[r.id] === n ? "var(--brand-500)" : "var(--slate-200)",
                          background: scores[r.id] === n ? "var(--brand-50)" : "var(--bg-surface)",
                          color: scores[r.id] === n ? "var(--brand-700)" : "var(--slate-500)",
                          fontWeight: 600, fontSize: 13, cursor: "pointer",
                          fontFamily: "var(--font-mono)", transition: "all 120ms",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--slate-100)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--slate-500)", marginBottom: 6 }}>
                  <span>Overall</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--slate-900)" }}>
                    {Object.keys(scores).length > 0 ? (Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length).toFixed(1) : "—"} / 5.0
                  </span>
                </div>
                <button className="btn btn-primary" style={{ width: "100%" }}>Submit at end of call</button>
              </div>
            </div>
          )}

          {activePanel === "rubric" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <window.Eyebrow>Suggested questions</window.Eyebrow>
              {[
                { q: "Walk me through a recent backend service you built. What tradeoffs did you make?", asked: true },
                { q: "How would you design a rate limiter for an API gateway serving 50k RPS?", asked: true },
                { q: "Tell me about a time you debugged a production incident.", asked: false },
                { q: "How do you decide when to add an index in a high-write Postgres table?", asked: false },
                { q: "Walk me through how you would deprecate a legacy endpoint with active customers.", asked: false },
              ].map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: 12, border: "1px solid var(--slate-200)", borderRadius: 8, background: q.asked ? "var(--slate-50)" : "var(--bg-surface)" }}>
                  <span style={{ width: 22, height: 22, borderRadius: 9999, background: q.asked ? "var(--brand-500)" : "var(--slate-100)", color: q.asked ? "var(--bg-surface)" : "var(--slate-400)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 600 }}>
                    {q.asked ? <window.Icon name="check" size={12} /> : (i + 1)}
                  </span>
                  <div style={{ fontSize: 13, color: q.asked ? "var(--slate-400)" : "var(--slate-900)", lineHeight: 1.5, textDecoration: q.asked ? "line-through" : "none" }}>{q.q}</div>
                </div>
              ))}
            </div>
          )}

          {activePanel === "notes" && (
            <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column" }}>
              <window.Eyebrow>Private notes</window.Eyebrow>
              <div style={{ fontSize: 12, color: "var(--slate-500)", marginTop: 4, marginBottom: 12 }}>Visible only to you and the hiring panel.</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ flex: 1, resize: "none", border: "1px solid var(--slate-200)", borderRadius: 8, padding: 14, fontSize: 13, fontFamily: "inherit", lineHeight: 1.6, color: "var(--slate-900)", outline: "none" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--brand-500)"; e.target.style.boxShadow = "0 0 0 3px rgba(91,79,233,0.18)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--slate-200)"; e.target.style.boxShadow = "none"; }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--slate-400)" }}>
                <span>Auto-saved · 3s ago</span>
                <span>{notes.length} chars</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

window.InterviewerRoomScreen = InterviewerRoomScreen;
