/* Layouts demo — toggle between AppLayout and CandidateLayout */

function PlaceholderContent({ active }) {
  // Placeholder content that morphs slightly with the active nav id
  const map = {
    dashboard: { eyebrow: "Today at a glance", h1: "Good morning, Alex.", body: "You have 3 interviews scheduled today and 12 scorecards waiting on the panel." },
    pipeline:  { eyebrow: "Pipeline · 5 open roles", h1: "Pipeline", body: "24 active candidates across 5 roles. Move quickly — average time-in-stage is 4 days." },
    candidates:{ eyebrow: "All candidates", h1: "Candidates", body: "Search, filter, and bulk-action candidates across every role." },
    interviews:{ eyebrow: "Live and upcoming", h1: "Interviews", body: "3 live now · 7 scheduled for today · 2 awaiting feedback." },
    reports:   { eyebrow: "Hiring health", h1: "Reports", body: "Funnel conversion, time-to-hire, and source mix — all in one place." },
    "question-banks": { eyebrow: "Library", h1: "Question banks", body: "12 banks across .NET, React, Java, DevOps, and System Design." },
    team:      { eyebrow: "Workspace", h1: "Team", body: "Invite interviewers, manage roles, and set interview availability." },
    settings:  { eyebrow: "Workspace", h1: "Settings", body: "Branding, candidate-facing copy, integrations, and exam defaults." },
  };
  const c = map[active] || map.dashboard;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Hero */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-500)" }}>{c.eyebrow}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.025em", margin: "8px 0 8px" }}>{c.h1}</h1>
        <p style={{ fontSize: 15, color: "var(--slate-700)", margin: 0, lineHeight: 1.6, maxWidth: 640 }}>{c.body}</p>
      </div>

      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Active candidates", value: "24", delta: "+4 this week" },
          { label: "Interviews today",  value: "3",  delta: "next at 4:30 PM" },
          { label: "Avg score",          value: "3.9", delta: "↑ 0.2" },
          { label: "Time to hire",       value: "14d", delta: "-2d" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderRadius: 10, padding: "14px 18px", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--slate-500)" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--success-500)", fontWeight: 500, marginTop: 2 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Two-column placeholder content */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(15,23,42,0.04)", minHeight: 300 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--slate-900)", margin: 0 }}>Recent activity</h3>
            <a style={{ fontSize: 12, color: "var(--brand-500)", fontWeight: 500, cursor: "pointer" }}>View all</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { who: "Rahul Sharma",  what: "completed coding exam · 92%", when: "12 min ago", tone: "success", icon: "check-circle-2" },
              { who: "Priya Patel",   what: "moved to AI screen",          when: "1h ago",      tone: "brand",   icon: "arrow-right-circle" },
              { who: "Ankit Verma",   what: "accepted offer for React Frontend Engineer", when: "3h ago", tone: "success", icon: "party-popper" },
              { who: "Divya Iyer",    what: "scheduled Round 2 for Thu 10:00", when: "Yesterday", tone: "neutral", icon: "calendar" },
            ].map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9999, flexShrink: 0,
                  background: a.tone === "success" ? "var(--success-50)" : a.tone === "brand" ? "var(--brand-50)" : "var(--slate-100)",
                  color:      a.tone === "success" ? "var(--success-600)" : a.tone === "brand" ? "var(--brand-500)" : "var(--slate-500)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <window.Icon name={a.icon} size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--slate-900)" }}>
                    <strong>{a.who}</strong> <span style={{ color: "var(--slate-500)", fontWeight: 400 }}>{a.what}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--slate-400)", marginTop: 2 }}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--slate-900)", margin: "0 0 14px" }}>Next up</h3>
          {[
            { t: "4:30 PM", title: "AI screen · Rahul Sharma",  sub: "Senior .NET" },
            { t: "5:00 PM", title: "Tech round · Neha Gupta",   sub: "React Frontend" },
            { t: "Tomorrow", title: "Round 2 · Divya Iyer",       sub: "Backend (Java)" },
          ].map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 0", borderTop: i === 0 ? 0 : "1px solid var(--slate-100)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--slate-900)", width: 70, flexShrink: 0 }}>{e.t}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--slate-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                <div style={{ fontSize: 11, color: "var(--slate-500)" }}>{e.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Candidate placeholder content — varies by step */
function CandidateStepContent({ step }) {
  if (step === "device-check") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--brand-50)", color: "var(--brand-500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <window.Icon name="mic" size={28} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-500)" }}>Step 1 of 4</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.025em", margin: "8px 0 12px" }}>Let's check your device</h1>
          <p style={{ fontSize: 15, color: "var(--slate-700)", margin: 0, lineHeight: 1.6, maxWidth: 480 }}>
            We'll quickly test your microphone and internet connection. This takes about 30 seconds.
          </p>
        </div>
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
          {[
            { icon: "mic", title: "Microphone", body: "Detected: Built-in Microphone", ok: true },
            { icon: "wifi", title: "Connection", body: "Stable · 42 Mbps", ok: true },
            { icon: "volume-2", title: "Audio output", body: "Detected: System default", ok: true },
            { icon: "globe", title: "Browser", body: "Chrome 124 (supported)", ok: true },
          ].map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderRadius: 10, textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: c.ok ? "var(--success-50)" : "var(--danger-50)", color: c.ok ? "var(--success-600)" : "var(--danger-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <window.Icon name={c.icon} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-900)" }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "var(--slate-500)", marginTop: 2 }}>{c.body}</div>
              </div>
              <window.Icon name="check-circle-2" size={16} color="var(--success-500)" />
            </div>
          ))}
        </div>
        <button style={{
          marginTop: 8, padding: "12px 28px", border: 0, borderRadius: 10,
          background: "var(--brand-500)", color: "var(--bg-surface)", fontWeight: 600, fontSize: 14,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
          boxShadow: "0 8px 20px rgba(91,79,233,0.25)",
          transition: "all 120ms cubic-bezier(0.2, 0, 0, 1)",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--brand-600)"}
        onMouseLeave={e => e.currentTarget.style.background = "var(--brand-500)"}>
          Continue <window.Icon name="arrow-right" size={14} />
        </button>
      </div>
    );
  }
  if (step === "consent") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-500)" }}>Step 2 of 4</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.025em", margin: "8px 0 12px" }}>Recording consent</h1>
          <p style={{ fontSize: 15, color: "var(--slate-700)", margin: 0, lineHeight: 1.6 }}>
            We record this interview so the hiring panel can review your answers. The recording is encrypted and only the hiring team and you can access it.
          </p>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: "shield-check", title: "Encrypted at rest and in transit", body: "AES-256 storage, TLS 1.3 in transit." },
            { icon: "user-x",        title: "Deleted on request",                body: "Email privacy@screeno.io anytime — we'll wipe it." },
            { icon: "eye-off",       title: "Not used for marketing or training", body: "Your data isn't sold or used to train external models." },
          ].map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand-50)", color: "var(--brand-500)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <window.Icon name={c.icon} size={14} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-900)" }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "var(--slate-500)", marginTop: 2, lineHeight: 1.5 }}>{c.body}</div>
              </div>
            </div>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--slate-700)", cursor: "pointer", padding: 14, background: "var(--slate-50)", border: "1px solid var(--slate-200)", borderRadius: 10 }}>
          <input type="checkbox" defaultChecked style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--brand-500)" }} />
          <span>I agree to have this interview recorded and processed under Screeno's <a style={{ color: "var(--brand-500)", fontWeight: 500 }}>privacy policy</a>.</span>
        </label>
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button style={btnSecondary}><window.Icon name="arrow-left" size={14} /> Back</button>
          <button style={btnPrimary}>Continue <window.Icon name="arrow-right" size={14} /></button>
        </div>
      </div>
    );
  }
  if (step === "interview") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-500)" }}>Question 2 of 6</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.02em", margin: "8px 0 4px", lineHeight: 1.25 }}>
            Walk me through a recent backend service you built. What was the trickiest decision?
          </h1>
          <p style={{ fontSize: 13, color: "var(--slate-500)", margin: "8px 0 0" }}>Take a breath, then speak in your own words. The AI will follow up if needed.</p>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--brand-100)", borderRadius: 14, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, boxShadow: "0 8px 24px rgba(91,79,233,0.06)" }}>
          <div style={{ width: 80, height: 80, borderRadius: 9999, background: "linear-gradient(135deg, var(--brand-500), var(--brand-600))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(91,79,233,0.25)", animation: "pulse 2s ease-in-out infinite" }}>
            <window.Icon name="mic" size={28} color="var(--bg-surface)" />
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", height: 36 }}>
            {[...Array(16)].map((_, i) => (
              <span key={i} style={{
                width: 3, height: 32,
                background: "var(--brand-500)", borderRadius: 9999,
                transformOrigin: "center",
                animation: `eqBar 1.2s ease-in-out ${i * 70}ms infinite`,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--brand-500)" }}>Listening…</div>
        </div>
        <style>{`
          @keyframes eqBar { 0%, 100% { transform: scaleY(0.2); opacity: 0.8; } 50% { transform: scaleY(1); opacity: 1; } }
          @keyframes pulse { 0%, 100% { box-shadow: 0 8px 24px rgba(91,79,233,0.25); } 50% { box-shadow: 0 8px 24px rgba(91,79,233,0.45), 0 0 0 12px rgba(91,79,233,0.08); } }
        `}</style>
      </div>
    );
  }
  // done
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: 9999, background: "var(--success-50)", color: "var(--success-600)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <window.Icon name="check" size={36} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--success-600)" }}>Step 4 of 4</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.025em", margin: "8px 0 12px" }}>All done — nice work.</h1>
        <p style={{ fontSize: 15, color: "var(--slate-700)", margin: 0, lineHeight: 1.6, maxWidth: 480 }}>
          Your interview has been sent to the Acme hiring team. You'll hear back within 2 business days, and we'll email you either way.
        </p>
      </div>
      <button style={btnPrimary}>Back to your applications <window.Icon name="arrow-right" size={14} /></button>
    </div>
  );
}

const btnPrimary = {
  padding: "11px 22px", border: 0, borderRadius: 10,
  background: "var(--brand-500)", color: "var(--bg-surface)", fontWeight: 600, fontSize: 14,
  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
  transition: "all 120ms cubic-bezier(0.2, 0, 0, 1)",
};
const btnSecondary = {
  padding: "11px 18px", border: "1px solid var(--slate-300)", borderRadius: 10,
  background: "var(--bg-surface)", color: "var(--slate-900)", fontWeight: 600, fontSize: 14,
  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
  transition: "all 120ms cubic-bezier(0.2, 0, 0, 1)",
};

function LayoutsDemo() {
  const [layout, setLayout] = React.useState("app");
  const [appActive, setAppActive] = React.useState("dashboard");
  const [step, setStep] = React.useState("device-check");
  const showTimer = step === "interview";
  const [remaining, setRemaining] = React.useState(1500);
  const total = 1800;

  React.useEffect(() => {
    if (!showTimer) return;
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [showTimer]);

  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [layout, step, appActive]);

  return (
    <>
      {/* Demo chrome — switch between the two layouts + within candidate, between steps */}
      <div className="proto-bar">
        <span className="group-label">Layout</span>
        <button className={layout === "app" ? "on" : ""} onClick={() => setLayout("app")}>
          <window.Icon name="layout-dashboard" size={12} /> AppLayout
        </button>
        <button className={layout === "candidate" ? "on" : ""} onClick={() => setLayout("candidate")}>
          <window.Icon name="user-circle" size={12} /> CandidateLayout
        </button>
        {layout === "candidate" && (
          <>
            <div className="div" />
            <span className="group-label">Step</span>
            {window.CANDIDATE_STEPS.map(s => (
              <button key={s.id} className={step === s.id ? "on" : ""} onClick={() => setStep(s.id)}>
                {s.label}
              </button>
            ))}
          </>
        )}
      </div>

      {layout === "app" ? (
        <window.AppLayout activeNav={appActive} onNav={setAppActive}>
          {({ active }) => <PlaceholderContent active={active} />}
        </window.AppLayout>
      ) : (
        <window.CandidateLayout step={step} showTimer={showTimer} remaining={remaining} total={total}>
          {({ step }) => <CandidateStepContent step={step} />}
        </window.CandidateLayout>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<LayoutsDemo />);
