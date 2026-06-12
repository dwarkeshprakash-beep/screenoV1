/* v2 — Candidate: AI interview room with 3 states (listening / thinking / speaking) */

const AI_TRANSCRIPT_V2 = [
  { who: "ai",   text: "Hi Rahul, thanks for joining. I'll ask you a few questions about your .NET work, then a couple of system design scenarios. Sound good?" },
  { who: "user", text: "Yes, sounds good. Ready when you are." },
  { who: "ai",   text: "Great. Let's start with a recent backend service you built in .NET. Walk me through it." },
  { who: "user", text: "Sure. Most recently I built an order-reconciliation service for a fintech client. It consumes events from Kafka, dedupes them, and writes settled orders to Postgres." },
  { who: "ai",   text: "Tell me about a time you had to debug a critical production issue under time pressure." },
];

const AIRoomScreen = ({ state: initialState = "speaking", onEnd }) => {
  const [aiState, setAiState] = React.useState(initialState); // listening | thinking | speaking
  const [muted, setMuted] = React.useState(false);
  const [showTranscript, setShowTranscript] = React.useState(true);
  const transcriptRef = React.useRef(null);

  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [aiState, muted, showTranscript]);

  // auto-scroll the transcript to bottom on new messages
  React.useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [aiState, showTranscript]);

  const stateLabel = {
    speaking:  { text: "AI is speaking…",   icon: "volume-2", color: "var(--brand-500)" },
    thinking:  { text: "AI is thinking…",   icon: "loader-2", color: "var(--slate-400)" },
    listening: { text: "AI is listening…",  icon: "ear",      color: "var(--success-500)" },
  }[aiState];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0 120px", position: "relative" }}>
      {/* AI orb */}
      <AIOrb state={aiState} />

      {/* State label */}
      <window.Reveal key={aiState} delay={0} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 28, fontSize: 14, fontWeight: 600, color: stateLabel.color }}>
        <window.Icon name={stateLabel.icon} size={16} style={{ animation: aiState === "thinking" ? "spin 1.2s linear infinite" : "none" }} />
        {stateLabel.text}
      </window.Reveal>

      {/* Current question card */}
      <window.Reveal delay={120} style={{
        marginTop: 28, maxWidth: 520, width: "100%",
        background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderLeft: "4px solid var(--brand-500)",
        borderRadius: 12, padding: "16px 20px",
        boxShadow: "0 4px 14px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--slate-500)", marginBottom: 6 }}>Current question</div>
        <p style={{ fontSize: 15, color: "var(--slate-900)", margin: 0, lineHeight: 1.55, fontWeight: 500 }}>
          Tell me about a time you had to debug a critical production issue under time pressure.
        </p>
      </window.Reveal>

      {/* Transcript */}
      <div style={{ maxWidth: 520, width: "100%", marginTop: 14 }}>
        <button
          onClick={() => setShowTranscript(s => !s)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 8,
            background: "transparent", border: 0,
            color: "var(--brand-500)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "background 120ms",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--slate-100)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <window.Icon name={showTranscript ? "chevron-down" : "chevron-right"} size={12} />
          {showTranscript ? "Hide transcript" : "Show transcript"}
        </button>
        {showTranscript && (
          <window.Reveal y={6} duration={220} style={{ marginTop: 8 }}>
            <div
              ref={transcriptRef}
              style={{
                background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderRadius: 12, padding: 16,
                maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10,
                boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              }}
            >
              {AI_TRANSCRIPT_V2.map((m, i) => {
                const last = i === AI_TRANSCRIPT_V2.length - 1;
                return (
                  <div key={i} style={{
                    fontSize: 13, lineHeight: 1.55,
                    padding: last ? "6px 8px" : 0,
                    background: last ? "#F3F0FF" : "transparent",
                    borderRadius: last ? 6 : 0,
                    color: m.who === "ai" ? "var(--slate-500)" : "var(--slate-900)",
                  }}>
                    <strong style={{ color: m.who === "ai" ? "var(--brand-500)" : "var(--slate-900)", marginRight: 6, fontWeight: 600 }}>
                      {m.who === "ai" ? "AI:" : "You:"}
                    </strong>
                    {m.text}
                  </div>
                );
              })}
            </div>
          </window.Reveal>
        )}
      </div>

      {/* Candidate camera preview (bottom-left fixed) */}
      <div style={{
        position: "absolute", bottom: 120, left: 24,
        width: 120, height: 120, borderRadius: 9999,
        background: "linear-gradient(135deg, #475569, #1E293B)",
        border: "3px solid var(--bg-surface)",
        boxShadow: "0 12px 28px rgba(15,23,42,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", flexShrink: 0,
      }}>
        <window.AvatarV2 name="Rahul Sharma" size={108} />
      </div>
      <div style={{ position: "absolute", bottom: 100, left: 24, width: 120, textAlign: "center", fontSize: 11, color: "var(--slate-500)", fontWeight: 500 }}>You</div>

      {/* Controls (fixed bottom-center) */}
      <div style={{
        position: "fixed", bottom: 72, left: "50%", transform: "translateX(-50%)",
        display: "inline-flex", gap: 8, padding: 6,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)",
        border: "1px solid var(--slate-200)", borderRadius: 9999,
        boxShadow: "0 12px 28px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.04)",
        zIndex: 5,
      }}>
        <RoundCtrl icon={muted ? "mic-off" : "mic"} label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(m => !m)} active={muted} />
        <RoundCtrl icon="rotate-cw" label="Repeat question" />
        <RoundCtrl icon="skip-forward" label="Skip" />
        <div style={{ width: 1, background: "var(--slate-200)", margin: "4px 4px" }} />
        <button
          onClick={onEnd}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 9999,
            background: "var(--danger-500)", color: "var(--bg-surface)", border: 0,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(255,92,53,0.25)",
            transition: "background 120ms",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--danger-600)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--danger-500)"}
        >
          <window.Icon name="phone-off" size={14} /> End
        </button>
      </div>

      {/* Demo control to flip states */}
      <div style={{
        position: "fixed", top: 88, right: 24,
        background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderRadius: 10,
        padding: 8, display: "flex", gap: 4, alignItems: "center",
        boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
        zIndex: 5, fontSize: 11,
      }}>
        <span style={{ fontWeight: 600, color: "var(--slate-400)", letterSpacing: "0.05em", textTransform: "uppercase", paddingRight: 4 }}>State</span>
        {["listening", "thinking", "speaking"].map(s => (
          <button
            key={s}
            onClick={() => setAiState(s)}
            style={{
              padding: "5px 9px", borderRadius: 6, border: 0,
              background: aiState === s ? "var(--brand-500)" : "transparent",
              color: aiState === s ? "var(--bg-surface)" : "#475569",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              textTransform: "capitalize", transition: "all 120ms",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

const RoundCtrl = ({ icon, label, onClick, active }) => (
  <button
    onClick={onClick}
    title={label}
    style={{
      width: 40, height: 40, borderRadius: 9999, border: 0,
      background: active ? "var(--danger-50)" : "transparent",
      color: active ? "var(--danger-700)" : "var(--slate-900)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", transition: "all 120ms",
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--slate-100)"; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
  >
    <window.Icon name={icon} size={16} />
  </button>
);

/* The AI orb — 200px, animated per state */
const AIOrb = ({ state }) => {
  const size = 200;
  if (state === "speaking") {
    // 5 radiating bars
    return (
      <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Soft gradient core */}
        <div style={{
          position: "absolute", inset: 24, borderRadius: 9999,
          background: "radial-gradient(circle at 35% 30%, var(--brand-100), var(--brand-500) 70%, var(--brand-600) 100%)",
          boxShadow: "0 12px 36px rgba(91,79,233,0.32), 0 0 0 12px rgba(91,79,233,0.08)",
        }} />
        {/* Inner highlight */}
        <div style={{
          position: "absolute", inset: 24, borderRadius: 9999,
          background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.6) 0%, transparent 40%)",
        }} />
        {/* Vertical bars */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 5, height: 64 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} style={{
              width: 6, height: 50,
              background: "var(--bg-surface)", borderRadius: 9999,
              transformOrigin: "center",
              animation: `barWave 1.2s ease-in-out ${i * 110}ms infinite`,
              boxShadow: "0 0 8px rgba(255,255,255,0.6)",
            }} />
          ))}
        </div>
        <style>{`@keyframes barWave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }`}</style>
      </div>
    );
  }
  if (state === "listening") {
    // concentric expanding rings (green)
    return (
      <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            position: "absolute", width: 160, height: 160, borderRadius: 9999,
            border: "2px solid var(--success-500)",
            animation: `ringPulse 2.4s ease-out ${i * 800}ms infinite`,
            opacity: 0,
          }} />
        ))}
        <div style={{
          width: 120, height: 120, borderRadius: 9999,
          background: "radial-gradient(circle at 35% 30%, var(--success-100), var(--success-500) 75%)",
          boxShadow: "0 12px 28px rgba(5,150,105,0.32), 0 0 0 8px rgba(16,185,129,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <window.Icon name="ear" size={42} color="var(--bg-surface)" />
        </div>
        <style>{`
          @keyframes ringPulse {
            0%   { transform: scale(0.6); opacity: 0.7; }
            70%  { opacity: 0.15; }
            100% { transform: scale(1.6); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }
  // thinking — soft pulse, gradient ring
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: 9999,
        background: "conic-gradient(from 0deg, var(--brand-100), var(--brand-500), var(--brand-100))",
        animation: "spin 4s linear infinite",
        opacity: 0.4,
      }} />
      <div style={{
        position: "absolute", inset: 12, borderRadius: 9999,
        background: "var(--slate-50)",
      }} />
      <div style={{
        position: "relative", zIndex: 1,
        width: 140, height: 140, borderRadius: 9999,
        background: "radial-gradient(circle at 35% 30%, var(--brand-100), var(--brand-500) 90%)",
        animation: "softPulse 2s ease-in-out infinite",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 12px 28px rgba(91,79,233,0.18)",
      }}>
        <window.Icon name="sparkles" size={42} color="var(--bg-surface)" />
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes softPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

Object.assign(window, { AIRoomScreen, AIOrb });
