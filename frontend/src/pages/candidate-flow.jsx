/* v2 — Candidate flow: DeviceCheck, Consent, Completion */

/* ============ DEVICE CHECK ============ */

const DeviceCheckScreen = ({ onContinue }) => {
  // Each check: idle | checking | passed | failed
  const checks = [
    { id: "camera", label: "Camera", icon: "camera" },
    { id: "mic",    label: "Microphone", icon: "mic" },
    { id: "speaker", label: "Speaker",   icon: "volume-2" },
    { id: "network", label: "Network",   icon: "wifi" },
  ];

  const [status, setStatus] = React.useState(() => Object.fromEntries(checks.map(c => [c.id, "idle"])));
  const [speakerClicked, setSpeakerClicked] = React.useState(false);
  const [level, setLevel] = React.useState([0.3, 0.6, 0.4, 0.7, 0.5]);

  // Run checks sequentially with 800ms gap
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < checks.length; i++) {
        if (cancelled) return;
        const id = checks[i].id;
        // skip speaker until clicked
        if (id === "speaker") continue;
        setStatus(s => ({ ...s, [id]: "checking" }));
        await new Promise(r => setTimeout(r, 900));
        if (cancelled) return;
        setStatus(s => ({ ...s, [id]: "passed" }));
        await new Promise(r => setTimeout(r, 250));
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  // animate mic level when mic is passed
  React.useEffect(() => {
    if (status.mic !== "passed") return;
    const t = setInterval(() => {
      setLevel(prev => prev.map(() => 0.25 + Math.random() * 0.75));
    }, 220);
    return () => clearInterval(t);
  }, [status.mic]);

  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [status, speakerClicked]);

  const handleSpeaker = () => {
    setSpeakerClicked(true);
    setStatus(s => ({ ...s, speaker: "checking" }));
    setTimeout(() => setStatus(s => ({ ...s, speaker: "passed" })), 1000);
  };

  const allPassed = checks.every(c => status[c.id] === "passed");

  return (
    <window.Reveal style={{ background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderRadius: 16, padding: 32, boxShadow: "0 8px 28px rgba(15,23,42,0.06), 0 2px 6px rgba(15,23,42,0.04)", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.02em", margin: 0 }}>
        Let's check your device
      </h1>
      <p style={{ fontSize: 14, color: "var(--slate-500)", margin: "6px 0 24px" }}>This takes about 30 seconds.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {checks.map((c, i) => {
          const st = status[c.id];
          return <CheckRow key={c.id} check={c} status={st} index={i} extra={c.id === "camera" ? "camera" : c.id === "mic" ? "mic-level" : c.id === "speaker" ? "speaker-cta" : "network-speed"} level={level} onSpeakerTest={handleSpeaker} speakerClicked={speakerClicked} />;
        })}
      </div>

      {/* Final state */}
      <div style={{ marginTop: 24 }}>
        {allPassed && (
          <window.Reveal style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, background: "var(--success-50)", border: "1px solid #A7F3D0", borderRadius: 10, color: "var(--success-600)", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            <window.Icon name="check-circle-2" size={16} /> All checks passed
          </window.Reveal>
        )}
        <button
          onClick={onContinue}
          disabled={!allPassed}
          style={{
            width: "100%", padding: "13px 22px",
            background: allPassed ? "var(--brand-500)" : "var(--slate-200)",
            color: allPassed ? "var(--bg-surface)" : "var(--slate-400)",
            border: 0, borderRadius: 10, fontWeight: 600, fontSize: 14,
            cursor: allPassed ? "pointer" : "not-allowed",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: allPassed ? "0 8px 20px rgba(91,79,233,0.25)" : "none",
            transition: "all 160ms cubic-bezier(0.2, 0, 0, 1)",
          }}
          onMouseEnter={e => { if (allPassed) e.currentTarget.style.background = "var(--brand-600)"; }}
          onMouseLeave={e => { if (allPassed) e.currentTarget.style.background = "var(--brand-500)"; }}
        >
          Continue <window.Icon name="arrow-right" size={14} />
        </button>
      </div>
    </window.Reveal>
  );
};

const CheckRow = ({ check, status, index, extra, level, onSpeakerTest, speakerClicked }) => {
  const tone = status === "passed" ? "success" : status === "failed" ? "danger" : "neutral";
  const iconBg = tone === "success" ? "var(--success-50)" : tone === "danger" ? "var(--danger-50)" : "var(--slate-100)";
  const iconFg = tone === "success" ? "var(--success-600)" : tone === "danger" ? "var(--danger-700)" : "var(--slate-400)";
  return (
    <window.Reveal delay={index * 80} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px solid var(--slate-200)", borderRadius: 12, background: status === "passed" ? "#FAFAFE" : "var(--bg-surface)", transition: "all 240ms" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 240ms" }}>
        <window.Icon name={check.icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)" }}>{check.label}</div>
        <div style={{ fontSize: 12, color: "var(--slate-500)", marginTop: 2, minHeight: 16 }}>
          {status === "idle" && <span>Waiting…</span>}
          {status === "checking" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <window.Icon name="loader-2" size={12} style={{ animation: "spin 1s linear infinite" }} />
              Checking…
            </span>
          )}
          {status === "passed" && extra === "camera" && <span>Detected: FaceTime HD Camera</span>}
          {status === "passed" && extra === "mic-level" && <span>Detected: Built-in Microphone</span>}
          {status === "passed" && extra === "speaker-cta" && speakerClicked && <span>Test sound played</span>}
          {status === "passed" && extra === "speaker-cta" && !speakerClicked && <span>Play a short test sound</span>}
          {status === "passed" && extra === "network-speed" && <span>Stable · 18 Mbps</span>}
          {status === "failed" && <span style={{ color: "var(--danger-700)" }}>Failed — check permissions</span>}
        </div>
      </div>

      {/* Right side detail per row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {extra === "camera" && status === "passed" && (
          <window.Pop>
            <div style={{ width: 40, height: 40, borderRadius: 9999, overflow: "hidden", background: "linear-gradient(135deg, #475569, #1E293B)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg-surface)", fontSize: 11, fontWeight: 600, boxShadow: "0 2px 6px rgba(15,23,42,0.16)", border: "2px solid var(--bg-surface)" }}>
              <window.AvatarV2 name="Rahul" size={36} />
            </div>
          </window.Pop>
        )}
        {extra === "mic-level" && status === "passed" && (
          <window.Pop>
            <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
              {level.map((v, i) => (
                <span key={i} style={{
                  width: 3, height: `${Math.max(6, v * 24)}px`,
                  background: "var(--brand-500)", borderRadius: 9999,
                  transition: "height 180ms cubic-bezier(0.2, 0, 0, 1)",
                }} />
              ))}
            </div>
          </window.Pop>
        )}
        {extra === "speaker-cta" && (
          <>
            {!speakerClicked ? (
              <button
                onClick={onSpeakerTest}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8,
                  border: "1px solid var(--slate-300)", background: "var(--bg-surface)",
                  fontSize: 12, fontWeight: 600, color: "var(--slate-900)", cursor: "pointer",
                  transition: "all 120ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--slate-100)"; e.currentTarget.style.borderColor = "var(--slate-400)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.borderColor = "var(--slate-300)"; }}
              >
                <window.Icon name="play" size={12} /> Play test sound
              </button>
            ) : null}
          </>
        )}
        {extra === "network-speed" && status === "passed" && (
          <window.Pop>
            <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--slate-900)" }}>18 Mbps</span>
          </window.Pop>
        )}

        {/* Status icon */}
        {status === "passed" && (
          <window.Pop>
            <window.Icon name="check-circle-2" size={20} color="#10B981" style={{ strokeWidth: 2 }} />
          </window.Pop>
        )}
        {status === "checking" && (
          <window.Icon name="loader-2" size={20} color="var(--slate-400)" style={{ animation: "spin 1s linear infinite" }} />
        )}
        {status === "failed" && <window.Icon name="x-circle" size={20} color="var(--danger-500)" />}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </window.Reveal>
  );
};

/* ============ CONSENT ============ */

const ConsentScreen = ({ onAgree, onDecline }) => {
  const [agreed, setAgreed] = React.useState(false);
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [agreed]);

  const items = [
    { icon: "video",       title: "Video recording",       body: "Your face and voice will be recorded for this session." },
    { icon: "camera",      title: "Periodic snapshots",    body: "Screenshots taken every 30 seconds during the interview." },
    { icon: "monitor",     title: "Tab activity",          body: "We detect if you switch tabs or leave fullscreen." },
    { icon: "sparkles",    title: "AI processing",         body: "Your responses are analyzed by AI to generate a report." },
    { icon: "database",    title: "Data retention",        body: "Your data is stored for 6 months then permanently deleted." },
  ];

  return (
    <window.Reveal style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.025em", margin: "0 0 6px" }}>
        Before you begin
      </h1>
      <p style={{ fontSize: 14, color: "var(--slate-500)", margin: "0 0 28px", lineHeight: 1.6 }}>
        Please review what will be recorded during your interview.
      </p>

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderRadius: 14, padding: 24, marginBottom: 18, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
        {items.map((it, i) => (
          <window.Reveal key={it.title} delay={i * 60} style={{ display: "flex", gap: 14, padding: "14px 0", borderTop: i === 0 ? 0 : "1px solid var(--slate-100)", alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--brand-50)", color: "var(--brand-500)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <window.Icon name={it.icon} size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)" }}>{it.title}</div>
              <div style={{ fontSize: 13, color: "var(--slate-500)", marginTop: 2, lineHeight: 1.55 }}>{it.body}</div>
            </div>
          </window.Reveal>
        ))}
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, background: agreed ? "#F3F0FF" : "var(--slate-50)", border: `1px solid ${agreed ? "var(--brand-500)" : "var(--slate-200)"}`, borderRadius: 10, cursor: "pointer", marginBottom: 14, fontSize: 13, color: "var(--slate-900)", fontWeight: 500, transition: "all 160ms cubic-bezier(0.2, 0, 0, 1)" }}>
        <span style={{
          width: 20, height: 20, borderRadius: 5,
          background: agreed ? "var(--brand-500)" : "var(--bg-surface)",
          border: `1.5px solid ${agreed ? "var(--brand-500)" : "var(--slate-300)"}`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all 160ms",
        }}>
          {agreed && <window.Icon name="check" size={14} color="var(--bg-surface)" />}
        </span>
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ display: "none" }} />
        I have read and understand the above
      </label>

      <button
        onClick={onAgree}
        disabled={!agreed}
        style={{
          width: "100%", padding: "13px 22px",
          background: agreed ? "var(--brand-500)" : "var(--slate-200)",
          color: agreed ? "var(--bg-surface)" : "var(--slate-400)",
          border: 0, borderRadius: 10, fontWeight: 600, fontSize: 14,
          cursor: agreed ? "pointer" : "not-allowed",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: agreed ? "0 8px 20px rgba(91,79,233,0.25)" : "none",
          transition: "all 160ms cubic-bezier(0.2, 0, 0, 1)",
        }}
        onMouseEnter={e => { if (agreed) e.currentTarget.style.background = "var(--brand-600)"; }}
        onMouseLeave={e => { if (agreed) e.currentTarget.style.background = "var(--brand-500)"; }}
      >
        Start interview <window.Icon name="arrow-right" size={14} />
      </button>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <button onClick={onDecline} style={{ background: "transparent", border: 0, padding: 6, color: "var(--slate-400)", fontSize: 13, fontWeight: 500, cursor: "pointer", textDecoration: "underline", textDecorationColor: "transparent", transition: "all 120ms" }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--slate-500)"; e.currentTarget.style.textDecorationColor = "var(--slate-500)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--slate-400)"; e.currentTarget.style.textDecorationColor = "transparent"; }}
        >
          I do not consent
        </button>
      </div>

      <p style={{ fontSize: 11, color: "var(--slate-400)", textAlign: "center", margin: "18px 0 0", lineHeight: 1.6 }}>
        You can request data deletion at any time by emailing <a style={{ color: "var(--brand-500)" }}>privacy@screeno.io</a>
      </p>
    </window.Reveal>
  );
};

/* ============ COMPLETION ============ */

const CompletionScreen = ({ onClose, candidate = { name: "Rahul Sharma", first: "Rahul", role: "Senior .NET Developer", company: "TechCorp India", email: "rahul.sharma@gmail.com" } }) => {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, []);
  const steps = [
    { icon: "search",       title: "We review your answers",  body: "AI generates a detailed report of your interview." },
    { icon: "user-check",   title: "Hiring team reviews",     body: "Our team reviews the report within 2–3 business days." },
    { icon: "mail",         title: "You'll hear from us",     body: `We'll email you at ${candidate.email} with next steps.` },
  ];
  return (
    <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
      <window.Pop>
        <div style={{ width: 80, height: 80, borderRadius: 9999, background: "var(--success-100)", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 28px rgba(5,150,105,0.18), 0 0 0 8px rgba(16,185,129,0.08)" }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M11 20 L18 27 L30 14" stroke="var(--success-500)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"
              style={{
                strokeDasharray: 40, strokeDashoffset: 40,
                animation: "drawCheck 600ms cubic-bezier(0.2, 0, 0, 1) 240ms forwards",
              }} />
          </svg>
        </div>
      </window.Pop>
      <style>{`@keyframes drawCheck { to { stroke-dashoffset: 0; } }`}</style>

      <window.Reveal delay={300}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.025em", margin: "24px 0 8px" }}>
          You're all done!
        </h1>
        <p style={{ fontSize: 15, color: "var(--slate-700)", margin: 0, lineHeight: 1.6, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          Thanks for completing the interview for <strong style={{ color: "var(--slate-900)" }}>{candidate.role}</strong> at <strong style={{ color: "var(--slate-900)" }}>{candidate.company}</strong>.
        </p>
      </window.Reveal>

      <div style={{ height: 1, background: "var(--slate-200)", margin: "32px 0" }} />

      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-500)", textAlign: "center", marginBottom: 18 }}>
          What happens next
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {steps.map((s, i) => (
            <window.Reveal key={s.title} delay={420 + i * 100} style={{ background: "var(--bg-surface)", border: "1px solid var(--slate-200)", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(15,23,42,0.04)", textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--brand-50)", color: "var(--brand-500)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <window.Icon name={s.icon} size={16} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)", marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "var(--slate-500)", lineHeight: 1.55 }}>{s.body}</div>
            </window.Reveal>
          ))}
        </div>
      </div>

      <button
        onClick={onClose}
        style={{ marginTop: 32, padding: "11px 20px", background: "transparent", border: "1px solid var(--slate-300)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "var(--slate-700)", cursor: "pointer", transition: "all 120ms" }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--slate-100)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        Close window
      </button>
    </div>
  );
};

Object.assign(window, { DeviceCheckScreen, ConsentScreen, CompletionScreen });
