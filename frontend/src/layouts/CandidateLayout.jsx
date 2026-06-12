/* CandidateLayout — full-bleed, no sidebar, with stepper + circular timer */

const CANDIDATE_STEPS = [
  { id: "device-check", label: "Device check" },
  { id: "consent",      label: "Consent" },
  { id: "interview",    label: "Interview" },
  { id: "done",         label: "Done" },
];

/* Circular progress ring — used as the interview timer */
const TimerRing = ({ remaining, total, size = 44, stroke = 3.5, label }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, remaining / total));
  const offset = c * (1 - pct);
  const lowTime = remaining < total * 0.15;
  const color = lowTime ? "var(--danger-500)" : "var(--brand-500)";
  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: "var(--slate-500)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{label || "Time left"}</span>
      <div style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--slate-200)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.4s linear, stroke 200ms" }}
          />
        </svg>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: lowTime ? "var(--danger-700)" : "var(--slate-900)", fontVariantNumeric: "tabular-nums" }}>{mins}:{secs}</span>
      </div>
    </div>
  );
};

/* Step indicator (the dots header) */
const StepIndicator = ({ steps, currentIdx }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
    {steps.map((s, i) => {
      const done = i < currentIdx;
      const active = i === currentIdx;
      const dotColor = done ? "var(--brand-500)" : active ? "var(--brand-500)" : "var(--slate-200)";
      const labelColor = done ? "var(--slate-900)" : active ? "var(--brand-500)" : "var(--slate-400)";
      return (
        <React.Fragment key={s.id}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 24, height: 24, borderRadius: 9999,
              background: done ? "var(--brand-500)" : "var(--bg-surface)",
              border: active ? "2px solid var(--brand-500)" : done ? "0" : "1px solid var(--slate-300)",
              color: "var(--bg-surface)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: active ? "0 0 0 4px rgba(91,79,233,0.16)" : "none",
              transition: "all 240ms cubic-bezier(0.2,0,0,1)",
            }}>
              {done
                ? <window.Icon name="check" size={13} color="var(--bg-surface)" />
                : active
                  ? <span style={{ width: 8, height: 8, borderRadius: 9999, background: "var(--brand-500)" }} />
                  : <span style={{ fontSize: 11, fontWeight: 600, color: "var(--slate-400)", fontFamily: "var(--font-mono)" }}>{i + 1}</span>
              }
            </span>
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: labelColor, transition: "color 240ms" }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <span style={{
              width: 48, height: 2, margin: "0 14px",
              background: "linear-gradient(90deg, " + (done ? "var(--brand-500)" : "var(--slate-200)") + ", " + (i + 1 <= currentIdx ? "var(--brand-500)" : "var(--slate-200)") + ")",
              borderRadius: 9999, transition: "all 240ms",
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* Header */
const CandidateHeader = ({ currentStep, showTimer, remaining, total }) => {
  const idx = CANDIDATE_STEPS.findIndex(s => s.id === currentStep);
  return (
    <header style={{
      height: 64, background: "var(--bg-surface)", borderBottom: "1px solid var(--slate-200)",
      display: "grid", gridTemplateColumns: "200px 1fr 200px",
      alignItems: "center", padding: "0 32px",
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <window.ScreenoLogo color="var(--brand-500)" dotColor="var(--brand-500)" size={22} />
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <StepIndicator steps={CANDIDATE_STEPS} currentIdx={Math.max(0, idx)} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {showTimer ? (
          <TimerRing remaining={remaining} total={total} />
        ) : (
          <span style={{ fontSize: 12, color: "var(--slate-400)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <window.Icon name="user" size={13} /> Candidate
          </span>
        )}
      </div>
    </header>
  );
};

/* Footer */
const CandidateFooter = () => (
  <footer style={{
    height: 48, background: "var(--bg-surface)", borderTop: "1px solid var(--slate-200)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 32px", fontSize: 12, color: "var(--slate-400)",
    flexShrink: 0,
  }}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <window.Icon name="lock" size={12} />
      Secure & encrypted
    </span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
      <a style={{ color: "var(--slate-400)", cursor: "pointer" }} onMouseEnter={e => e.target.style.color = "var(--brand-500)"} onMouseLeave={e => e.target.style.color = "var(--slate-400)"}>Help</a>
      <a style={{ color: "var(--slate-400)", cursor: "pointer" }} onMouseEnter={e => e.target.style.color = "var(--brand-500)"} onMouseLeave={e => e.target.style.color = "var(--slate-400)"}>Privacy</a>
      <span>© 2026 Screeno</span>
    </span>
  </footer>
);

/* The composed layout */
const CandidateLayout = ({
  step = "device-check",
  showTimer = false,
  remaining = 1500,
  total = 1800,
  children,
}) => {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [step, showTimer]);

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--slate-50)", display: "flex", flexDirection: "column" }}>
      <CandidateHeader currentStep={step} showTimer={showTimer} remaining={remaining} total={total} />
      <main style={{ flex: 1, display: "flex", justifyContent: "center", padding: "48px 24px" }}>
        <div key={step} style={{
          width: "100%", maxWidth: 680,
          animation: "candidateIn 320ms cubic-bezier(0.2, 0, 0, 1)",
        }}>
          {typeof children === "function" ? children({ step }) : children}
        </div>
      </main>
      <CandidateFooter />
      <style>{`
        @keyframes candidateIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

Object.assign(window, {
  CandidateLayout, CandidateHeader, CandidateFooter,
  StepIndicator, TimerRing, CANDIDATE_STEPS,
});
