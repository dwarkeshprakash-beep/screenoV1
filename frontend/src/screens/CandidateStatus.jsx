/* Candidate Status — welcoming dashboard for the candidate */

const CandidateStatusScreen = ({ navigate }) => {
  window.useLucide();
  const candidate = { name: "Rahul Sharma", first: "Rahul", role: "Senior .NET Developer", company: "Acme Technologies", initials: "RS" };

  const steps = [
    { id: "applied", label: "Application received", state: "done", when: "3 days ago" },
    { id: "exam",    label: "Coding exam",          state: "done", when: "2 days ago · 92%" },
    { id: "ai",      label: "AI voice screen",      state: "active", when: "Today · 4:30 PM" },
    { id: "live",    label: "Live interview",       state: "upcoming", when: "Scheduled after AI screen" },
    { id: "decision", label: "Decision",            state: "upcoming", when: "Typically 2 business days" },
  ];

  return (
    <div className="brand-glow" style={{ minHeight: "calc(100vh - 52px)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(226,232,240,0.6)", position: "relative", zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="sb-brand-mark" />
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>Screeno</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
          <div style={{ textAlign: "right", lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600, color: "#0F172A" }}>{candidate.name}</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>{candidate.role}</div>
          </div>
          <window.Avatar name={candidate.name} size={36} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "60px 24px" }}>
        <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Greeting */}
          <div>
            <window.Eyebrow>You're applying to {candidate.company}</window.Eyebrow>
            <h1 className="display" style={{ fontSize: 40, lineHeight: 1.15, margin: "10px 0 6px", letterSpacing: "-0.025em" }}>
              Welcome back, {candidate.first}.
            </h1>
            <p style={{ fontSize: 16, color: "#374151", margin: 0, lineHeight: 1.6 }}>
              Your AI voice screen is scheduled for <strong style={{ color: "#0F172A" }}>today at 4:30 PM IST</strong>. Take your time — it'll take about 25 minutes.
            </p>
          </div>

          {/* Next-action card */}
          <div className="card card-pad-lg" style={{ display: "flex", alignItems: "center", gap: 24, borderColor: "#DEDAFB", boxShadow: "0 12px 36px rgba(91,79,233,0.08), 0 2px 6px rgba(91,79,233,0.04)" }}>
            <div style={{ width: 72, height: 72, borderRadius: 16, background: "linear-gradient(135deg, #5B4FE9, #4A3FCE)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 24px rgba(91,79,233,0.3)" }}>
              <window.Icon name="phone" size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="eyebrow" style={{ color: "#5B4FE9" }}>Next up</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "#0F172A", marginTop: 4, letterSpacing: "-0.01em" }}>AI voice interview</div>
              <div style={{ fontSize: 13, color: "#6B7280", marginTop: 6, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="clock" size={13} /> 25 min</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="mic" size={13} /> Voice only</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="calendar" size={13} /> Today, 4:30 PM IST</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate("ai-room")}>
                Start now <window.Icon name="arrow-right" size={14} />
              </button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Reschedule</button>
            </div>
          </div>

          {/* Process steps */}
          <div className="card card-pad-lg">
            <window.Eyebrow>Your hiring journey</window.Eyebrow>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
              {/* connector line */}
              <div style={{ position: "absolute", left: 17, top: 12, bottom: 12, width: 2, background: "#E2E8F0", zIndex: 0 }} />
              {steps.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", position: "relative", zIndex: 1 }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 9999,
                    background: s.state === "done" ? "#5B4FE9" : s.state === "active" ? "#FFF" : "#FFF",
                    border: s.state === "active" ? "2px solid #5B4FE9" : s.state === "upcoming" ? "1px solid #E2E8F0" : "0",
                    boxShadow: s.state === "active" ? "0 0 0 4px rgba(91,79,233,0.15)" : "none",
                    color: s.state === "done" ? "#FFF" : s.state === "active" ? "#5B4FE9" : "#94A3B8",
                    display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    fontWeight: 600, fontSize: 13,
                  }}>
                    {s.state === "done" ? <window.Icon name="check" size={16} /> : (i + 1)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: s.state === "active" ? 600 : 500, color: s.state === "upcoming" ? "#94A3B8" : "#0F172A", fontSize: 15 }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: s.state === "active" ? "#5B4FE9" : "#6B7280", marginTop: 2 }}>{s.when}</div>
                  </div>
                  {s.state === "active" && <window.Pill tone="brand">In progress</window.Pill>}
                  {s.state === "done" && <window.Pill tone="success" icon="check">Done</window.Pill>}
                </div>
              ))}
            </div>
          </div>

          {/* Help */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <a className="card card-pad" style={{ display: "flex", gap: 14, cursor: "pointer", textDecoration: "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EFEDFD", color: "#5B4FE9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <window.Icon name="headphones" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "#0F172A", fontSize: 14 }}>How the AI screen works</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>What to expect, how to prepare, and what we look for.</div>
              </div>
            </a>
            <a className="card card-pad" style={{ display: "flex", gap: 14, cursor: "pointer", textDecoration: "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#ECFDF5", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <window.Icon name="life-buoy" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "#0F172A", fontSize: 14 }}>Something not working?</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>Reach out anytime at help@screeno.io — we reply within an hour.</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

window.CandidateStatusScreen = CandidateStatusScreen;
