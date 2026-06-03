/* Candidate Exam Runner — timer, code editor, MCQs */

const ExamRunnerScreen = ({ navigate, tweaks }) => {
  const { EXAM_QUESTIONS } = window.SCREENO_DATA;
  const [qIdx, setQIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [code, setCode] = React.useState(EXAM_QUESTIONS[0].starter || "");
  const [seconds, setSeconds] = React.useState(34 * 60 + 22); // 34:22 remaining
  const [showWarning, setShowWarning] = React.useState(false);
  window.useLucide([qIdx, showWarning]);

  React.useEffect(() => {
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    if (EXAM_QUESTIONS[qIdx].kind === "code") setCode(EXAM_QUESTIONS[qIdx].starter || "");
  }, [qIdx]);

  const q = EXAM_QUESTIONS[qIdx];
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const lowTime = seconds < 5 * 60;

  const answer = (val) => setAnswers(a => ({ ...a, [q.id]: val }));

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "#F8FAFC", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", background: "#FFF", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="sb-brand-mark" style={{ width: 26, height: 26 }} />
          <div style={{ fontWeight: 600, color: "#0F172A", fontSize: 15 }}>Senior .NET Developer · Coding exam</div>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>·</span>
          <span style={{ fontSize: 13, color: "#6B7280" }}>Question {qIdx + 1} of {EXAM_QUESTIONS.length}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: showWarning ? "#FF5C35" : "#059669" }}>
            <span className="pulse-dot" style={{ background: showWarning ? "#FF5C35" : "#10B981", animationDuration: showWarning ? "0.8s" : "1.6s" }} />
            <span style={{ fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{showWarning ? "Tab switch detected" : "Proctored"}</span>
          </span>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 8,
            background: lowTime ? "#FFEDE6" : "#F1F5F9",
            color: lowTime ? "#B53618" : "#0F172A",
            fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 15,
            fontVariantNumeric: "tabular-nums",
          }}>
            <window.Icon name="clock" size={14} />
            {mins}:{secs}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#E2E8F0", position: "relative" }}>
        <div style={{ height: "100%", width: `${((qIdx + 1) / EXAM_QUESTIONS.length) * 100}%`, background: "linear-gradient(90deg, #5B4FE9, #7B69ED)", transition: "width 220ms cubic-bezier(0.2,0,0,1)" }} />
      </div>

      {/* Tab switch warning banner */}
      {showWarning && (
        <div style={{ background: "#FFEDE6", borderBottom: "1px solid #FFD4C2", padding: "10px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "fadein 180ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#B53618", fontSize: 13 }}>
            <window.Icon name="alert-triangle" size={16} />
            <strong>Tab switch detected.</strong> Leaving this tab during the exam is logged for review. Stay on this page until you submit.
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowWarning(false)} style={{ color: "#B53618" }}>
            <window.Icon name="x" size={14} /> Dismiss
          </button>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: "flex", padding: "28px 28px 100px", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: q.kind === "code" ? 1280 : 760, display: q.kind === "code" ? "grid" : "block", gridTemplateColumns: q.kind === "code" ? "minmax(360px, 480px) 1fr" : undefined, gap: 24 }}>
          {/* Question column */}
          <div className="card card-pad-lg fadeup" key={qIdx}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#5B4FE9", fontWeight: 600, background: "#EFEDFD", padding: "2px 8px", borderRadius: 6 }}>Q{qIdx + 1}</span>
              <window.Pill tone={q.kind === "code" ? "brand" : "info"} icon={q.kind === "code" ? "terminal" : "check-square"}>
                {q.kind === "code" ? "Coding" : "Multiple choice"}
              </window.Pill>
              {q.timeMins && <span style={{ fontSize: 12, color: "#6B7280" }}>Suggested {q.timeMins} min</span>}
            </div>
            <h2 className="display" style={{ fontSize: 22, margin: 0, marginBottom: 14, lineHeight: 1.3 }}>{q.title}</h2>
            {q.prompt && <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, margin: 0 }}>{q.prompt}</p>}

            {q.kind === "code" && q.examples && (
              <div style={{ marginTop: 20 }}>
                <window.Eyebrow color="#6B7280">Examples</window.Eyebrow>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {q.examples.map((ex, i) => (
                    <div key={i} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, fontFamily: "var(--font-mono)", fontSize: 12, color: "#374151" }}>
                      <div><span style={{ color: "#94A3B8" }}>Input:&nbsp;&nbsp;</span>{ex.in}</div>
                      <div style={{ marginTop: 4 }}><span style={{ color: "#94A3B8" }}>Output: </span>{ex.out}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {q.kind === "mcq" && (
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {q.options.map((opt, i) => {
                  const selected = answers[q.id] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => answer(i)}
                      style={{
                        textAlign: "left", display: "flex", alignItems: "center", gap: 14,
                        padding: 16, borderRadius: 8,
                        border: `1px solid ${selected ? "#5B4FE9" : "#E2E8F0"}`,
                        background: selected ? "#F3F0FF" : "#FFF",
                        cursor: "pointer", transition: "all 120ms cubic-bezier(0.2,0,0,1)",
                        fontSize: 14, color: "#0F172A", fontWeight: 500,
                      }}
                      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "#F8FAFC"; }}
                      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "#FFF"; }}
                    >
                      <span style={{
                        width: 22, height: 22, borderRadius: 9999,
                        border: `2px solid ${selected ? "#5B4FE9" : "#CBD5E1"}`,
                        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        transition: "all 120ms",
                      }}>
                        {selected && <span style={{ width: 10, height: 10, borderRadius: 9999, background: "#5B4FE9" }} />}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#94A3B8", width: 16 }}>{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Code editor column (only for code questions) */}
          {q.kind === "code" && (
            <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 480 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <window.Icon name="file-code" size={14} color="#6B7280" />
                  <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#374151" }}>solution.js</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #E2E8F0", borderRadius: 6, background: "#FFF", color: "#374151" }} defaultValue="js">
                    <option value="js">JavaScript</option>
                    <option value="py">Python</option>
                    <option value="cs">C#</option>
                    <option value="java">Java</option>
                  </select>
                  <button className="btn btn-secondary btn-sm">
                    <window.Icon name="play" size={12} /> Run
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr", flex: 1, background: "#0F172A", color: "#E2E8F0", fontFamily: "var(--font-mono)", fontSize: 13, overflow: "hidden", minHeight: 0 }}>
                <div style={{ padding: "14px 8px", textAlign: "right", color: "#475569", borderRight: "1px solid #1E293B", userSelect: "none" }}>
                  {code.split("\n").map((_, i) => <div key={i} style={{ lineHeight: 1.6 }}>{i + 1}</div>)}
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  style={{
                    background: "transparent", color: "#E2E8F0",
                    border: 0, outline: "none", resize: "none",
                    padding: "14px 14px",
                    fontFamily: "inherit", fontSize: "inherit", lineHeight: 1.6,
                    tabSize: 2, whiteSpace: "pre",
                  }}
                />
              </div>
              <div style={{ padding: "10px 14px", borderTop: "1px solid #1E293B", background: "#0F172A", color: "#64748B", fontSize: 11, fontFamily: "var(--font-mono)", display: "flex", justifyContent: "space-between" }}>
                <span>Tests: 0 / 4 passed · run to evaluate</span>
                <span>Auto-saved 2s ago</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#FFF", borderTop: "1px solid #E2E8F0", padding: "12px 28px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 -4px 12px rgba(15,23,42,0.04)", zIndex: 5 }}>
        <button className="btn btn-secondary" onClick={() => setQIdx(i => Math.max(0, i - 1))} disabled={qIdx === 0}>
          <window.Icon name="arrow-left" size={14} /> Previous
        </button>
        <div style={{ display: "flex", gap: 6, flex: 1, justifyContent: "center" }}>
          {EXAM_QUESTIONS.map((qq, i) => {
            const answered = answers[qq.id] != null || (qq.kind === "code" && i < qIdx);
            const current = i === qIdx;
            return (
              <button
                key={qq.id}
                onClick={() => setQIdx(i)}
                title={`Q${i + 1}`}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  fontSize: 12, fontWeight: 600,
                  background: current ? "#5B4FE9" : answered ? "#EFEDFD" : "#F1F5F9",
                  color: current ? "#FFF" : answered ? "#3A31A3" : "#6B7280",
                  border: 0, transition: "all 120ms",
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowWarning(true)}>
          <window.Icon name="alert-triangle" size={12} /> Simulate tab switch
        </button>
        {qIdx === EXAM_QUESTIONS.length - 1 ? (
          <button className="btn btn-success">
            <window.Icon name="check" size={14} /> Submit exam
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setQIdx(i => Math.min(EXAM_QUESTIONS.length - 1, i + 1))}>
            Next <window.Icon name="arrow-right" size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

window.ExamRunnerScreen = ExamRunnerScreen;
