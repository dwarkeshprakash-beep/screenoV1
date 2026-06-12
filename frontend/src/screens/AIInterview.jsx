/* Candidate AI Voice Interview — waveform, transcript */

const AIInterviewScreen = ({ navigate, tweaks }) => {
  const { AI_TRANSCRIPT } = window.SCREENO_DATA;
  const [muted, setMuted] = React.useState(false);
  const [speaking, setSpeaking] = React.useState("ai"); // ai | user | none
  const [elapsed, setElapsed] = React.useState(264); // 4:24
  const [transcriptIdx, setTranscriptIdx] = React.useState(AI_TRANSCRIPT.length);
  window.useLucide([speaking, muted]);

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // alternate speaking state every ~4s
  React.useEffect(() => {
    const t = setInterval(() => setSpeaking(s => s === "ai" ? "user" : "ai"), 4200);
    return () => clearInterval(t);
  }, []);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  const transcript = AI_TRANSCRIPT.slice(0, transcriptIdx);

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--slate-50)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", background: "var(--bg-surface)", borderBottom: "1px solid var(--slate-200)", zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="sb-brand-mark" style={{ width: 26, height: 26 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)" }}>AI voice screen · Senior .NET Developer</div>
            <div style={{ fontSize: 12, color: "var(--slate-500)" }}>Acme Technologies · Hosted by Screeno AI</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--danger-500)" }}>
            <span className="pulse-dot" />
            <span style={{ fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Recording</span>
          </span>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--slate-900)", fontVariantNumeric: "tabular-nums", padding: "5px 12px", background: "var(--slate-100)", borderRadius: 6 }}>{mins}:{secs}</div>
        </div>
      </div>

      {/* Body — two columns */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.1fr 1fr", minHeight: 0 }}>
        {/* Left — AI presence */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, gap: 32, background: "var(--bg-surface)", borderRight: "1px solid var(--slate-200)", position: "relative", overflow: "hidden" }}>
          {/* Background glow */}
          <div style={{ position: "absolute", width: 600, height: 600, borderRadius: 9999, background: "radial-gradient(circle, var(--brand-50) 0%, transparent 70%)", filter: "blur(40px)", opacity: speaking === "ai" ? 0.8 : 0.4, transition: "opacity 600ms" }} />

          {/* AI orb */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <AIOrb speaking={speaking === "ai"} />
            <div style={{ textAlign: "center" }}>
              <window.Eyebrow>Interviewing you</window.Eyebrow>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--slate-900)", marginTop: 6, letterSpacing: "-0.01em" }}>Screeno AI</div>
              <div style={{ fontSize: 13, color: "var(--slate-500)", marginTop: 4 }}>
                {speaking === "ai" ? "Speaking…" : speaking === "user" ? "Listening to you" : "Pause"}
              </div>
            </div>
          </div>

          {/* Waveform */}
          <div className="wave" style={{ width: 240 }}>
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{
                  height: 40,
                  animationDelay: `${i * 70}ms`,
                  animationDuration: `${0.9 + (i % 4) * 0.15}s`,
                  background: speaking === "ai" ? "var(--brand-500)" : "var(--slate-300)",
                  opacity: speaking === "none" ? 0.4 : 1,
                  animationPlayState: speaking === "none" ? "paused" : "running",
                }}
              />
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              className="btn"
              onClick={() => setMuted(m => !m)}
              style={{
                width: 56, height: 56, borderRadius: 9999,
                background: muted ? "var(--danger-50)" : "var(--bg-surface)",
                color: muted ? "var(--danger-700)" : "var(--slate-900)",
                border: `1px solid ${muted ? "var(--danger-100)" : "var(--slate-300)"}`,
              }}
              title={muted ? "Unmute" : "Mute"}
            >
              <window.Icon name={muted ? "mic-off" : "mic"} size={20} />
            </button>
            <button className="btn btn-danger" style={{ height: 56, padding: "0 24px", borderRadius: 9999, fontSize: 14 }} onClick={() => navigate("status")}>
              <window.Icon name="phone-off" size={18} /> End interview
            </button>
            <button className="btn" style={{ width: 56, height: 56, borderRadius: 9999, background: "var(--bg-surface)", color: "var(--slate-900)", border: "1px solid var(--slate-300)" }} title="Settings">
              <window.Icon name="settings" size={20} />
            </button>
          </div>

          <div style={{ fontSize: 11, color: "var(--slate-400)", textAlign: "center", maxWidth: 360 }}>
            Speak normally. If the AI interrupts, finish your thought — it'll follow up. You can end the call any time.
          </div>
        </div>

        {/* Right — Transcript */}
        <div style={{ display: "flex", flexDirection: "column", padding: "24px 0", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px 16px", borderBottom: "1px solid var(--slate-100)" }}>
            <div>
              <window.Eyebrow>Live transcript</window.Eyebrow>
              <div style={{ fontSize: 13, color: "var(--slate-500)", marginTop: 4 }}>Speech to text · always private until the interviewer reviews</div>
            </div>
            <div className="seg">
              <button className="on">EN</button>
              <button>HI</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            {transcript.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 12, animation: "fadein 240ms" }}>
                {line.who === "ai" ? (
                  <div style={{ width: 30, height: 30, borderRadius: 9999, background: "var(--brand-50)", color: "var(--brand-500)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <window.Icon name="sparkles" size={14} />
                  </div>
                ) : (
                  <window.Avatar name="Rahul Sharma" size={30} fontSize={11} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: line.who === "ai" ? "var(--brand-500)" : "var(--slate-900)" }}>
                      {line.who === "ai" ? "Screeno AI" : "Rahul"}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate-400)" }}>{line.t}</span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--slate-700)", lineHeight: 1.65 }}>{line.text}</div>
                </div>
              </div>
            ))}
            {speaking === "user" && (
              <div style={{ display: "flex", gap: 12, opacity: 0.7 }}>
                <window.Avatar name="Rahul Sharma" size={30} fontSize={11} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--slate-900)", marginBottom: 4 }}>Rahul · transcribing…</div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "8px 0" }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ width: 6, height: 6, borderRadius: 9999, background: "var(--slate-400)", animation: `pulseDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: "16px 28px 0", borderTop: "1px solid var(--slate-100)", display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--slate-500)" }}>
            <window.Icon name="info" size={14} color="var(--slate-400)" />
            <span>Question 3 of about 6 · 14 minutes remaining</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIOrb = ({ speaking }) => (
  <div style={{
    position: "relative",
    width: 180, height: 180,
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    {/* outer ring */}
    <div style={{
      position: "absolute", inset: 0, borderRadius: 9999,
      background: "linear-gradient(135deg, var(--brand-100), var(--brand-200), var(--brand-400))",
      animation: speaking ? "spin 8s linear infinite" : "none",
      opacity: 0.5,
    }} />
    {/* middle ring */}
    <div style={{
      position: "absolute", inset: 14, borderRadius: 9999,
      background: "linear-gradient(135deg, var(--brand-500), var(--brand-600))",
      boxShadow: speaking ? "0 0 0 6px rgba(91,79,233,0.18), 0 16px 48px rgba(91,79,233,0.35)" : "0 8px 24px rgba(91,79,233,0.2)",
      transition: "box-shadow 400ms",
    }} />
    {/* inner highlight */}
    <div style={{
      position: "absolute", top: 26, left: 36, width: 60, height: 60, borderRadius: 9999,
      background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)",
      filter: "blur(8px)",
    }} />
    {/* sparkles icon */}
    <window.Icon name="sparkles" size={56} color="var(--bg-surface)" style={{ zIndex: 1, opacity: 0.95 }} />
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </div>
);

window.AIInterviewScreen = AIInterviewScreen;
