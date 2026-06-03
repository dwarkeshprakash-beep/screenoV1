/* v2 — Candidate: Exam runner with question nav + MCQ + text + code + submit modal */

const EXAM_SECTION = {
  name: "Section 2: Technical",
  total: 10,
  answered: 7,
  questions: [
    // 0–9; mark state per question; q3 is current
    { i: 1,  state: "answered" }, { i: 2,  state: "answered" }, { i: 3,  state: "current"  },
    { i: 4,  state: "answered" }, { i: 5,  state: "skipped"  }, { i: 6,  state: "answered" },
    { i: 7,  state: "answered" }, { i: 8,  state: "answered" }, { i: 9,  state: "answered" },
    { i: 10, state: "unanswered" },
  ],
};

const QUESTIONS = {
  mcq: {
    no: 3, kind: "mcq", title: "Which of the following best describes idempotency in HTTP methods?",
    options: [
      "The result of an operation is reversible.",
      "Repeated identical requests produce the same result.",
      "The operation only runs once per connection.",
      "The operation requires a unique nonce.",
    ],
    answer: 1,
  },
  text: {
    no: 4, kind: "text", title: "Explain when you would use `IEnumerable<T>` versus `IQueryable<T>` in C#. One short paragraph.",
  },
  code: {
    no: 5, kind: "code", title: "Implement a generic Repository<T> with an async `GetByIdAsync` method using async/await.",
    starter: "public class Repository<T> where T : class\n{\n    // your code here\n}\n",
  },
};

const ExamRunnerScreenV2 = ({ initialKind = "mcq", onExit }) => {
  const [kind, setKind] = React.useState(initialKind);
  const [selected, setSelected] = React.useState(null);
  const [text, setText] = React.useState("");
  const [code, setCode] = React.useState(QUESTIONS.code.starter);
  const [remaining, setRemaining] = React.useState(18 * 60 + 42);
  const [saveState, setSaveState] = React.useState("idle"); // idle | saving | saved
  const [submitOpen, setSubmitOpen] = React.useState(false);
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [kind, selected, submitOpen]);

  // countdown
  React.useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // simulate auto-save when input changes
  const lastEditRef = React.useRef(Date.now());
  React.useEffect(() => {
    lastEditRef.current = Date.now();
    setSaveState("saving");
    const t = setTimeout(() => setSaveState("saved"), 700);
    return () => clearTimeout(t);
  }, [selected, text, code]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");
  const lowTime = remaining < 2 * 60;
  const sectionPct = (EXAM_SECTION.answered / EXAM_SECTION.total) * 100;

  const q = QUESTIONS[kind];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, maxWidth: 1280, margin: "0 auto" }}>
      {/* Left — question nav */}
      <aside style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, height: "fit-content", boxShadow: "0 1px 3px rgba(15,23,42,0.04)", position: "sticky", top: 80 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{EXAM_SECTION.name}</div>
          <button style={{ background: "transparent", border: 0, color: "#94A3B8", cursor: "pointer", padding: 4, borderRadius: 4 }} title="Collapse section">
            <window.Icon name="chevron-down" size={14} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
          {EXAM_SECTION.questions.map(q => (
            <QNavButton key={q.i} num={q.i} state={q.state} />
          ))}
        </div>

        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", color: "#0F172A", fontWeight: 600 }}>{EXAM_SECTION.answered}</span> of {EXAM_SECTION.total} answered
        </div>
        <div style={{ height: 4, background: "#F1F5F9", borderRadius: 9999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${sectionPct}%`, background: "#5B4FE9", borderRadius: 9999, transition: "width 240ms" }} />
        </div>

        {/* Legend */}
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #F1F5F9", display: "flex", flexDirection: "column", gap: 8 }}>
          <Legend color="#5B4FE9" label="Answered" />
          <Legend color="#FFF" border="#5B4FE9" label="Current" />
          <Legend color="#FEF3C7" textColor="#92400E" label="Skipped" />
          <Legend color="#F1F5F9" label="Unanswered" />
        </div>

        <button
          onClick={() => setSubmitOpen(true)}
          style={{ marginTop: 18, width: "100%", padding: "10px 14px", background: "#FFF", border: "1px solid #5B4FE9", borderRadius: 8, color: "#5B4FE9", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 120ms" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#EFEDFD"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#FFF"; }}
        >
          Submit section <window.Icon name="arrow-right" size={12} />
        </button>
      </aside>

      {/* Right — question area */}
      <main style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
          <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{EXAM_SECTION.name}</div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13,
            color: lowTime ? "#B53618" : "#0F172A",
            padding: "5px 12px",
            background: lowTime ? "#FFEDE6" : "#F1F5F9",
            borderRadius: 6, fontVariantNumeric: "tabular-nums",
          }}>
            <window.Icon name="clock" size={13} />
            Section timer: {mins}:{secs}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "#F1F5F9", borderRadius: 9999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${sectionPct}%`, background: "linear-gradient(90deg, #5B4FE9, #7B69ED)", borderRadius: 9999, transition: "width 240ms" }} />
        </div>

        {/* Type switcher (prototype convenience) */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "0 4px" }}>
          <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Q type</span>
          {[
            { id: "mcq", label: "MCQ" },
            { id: "text", label: "Short text" },
            { id: "code", label: "Code" },
          ].map(t => (
            <button key={t.id} onClick={() => setKind(t.id)} style={{
              padding: "4px 10px", borderRadius: 6, border: 0, fontSize: 11, fontWeight: 600,
              background: kind === t.id ? "#5B4FE9" : "#F1F5F9",
              color:      kind === t.id ? "#FFF"    : "#475569",
              cursor: "pointer", transition: "all 120ms",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Question card */}
        <window.Reveal key={kind} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 28, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#5B4FE9", background: "#EFEDFD", padding: "3px 9px", borderRadius: 6 }}>Q{q.no}</span>
            <window.Chip tone="info" icon={kind === "mcq" ? "check-square" : kind === "text" ? "type" : "code-2"}>
              {kind === "mcq" ? "Multiple choice" : kind === "text" ? "Short text" : "Coding"}
            </window.Chip>
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: "#0F172A", letterSpacing: "-0.01em", lineHeight: 1.6, margin: "0 0 22px" }}>
            {q.title}
          </h2>

          {kind === "mcq" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((opt, i) => {
                const isSelected = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      textAlign: "left", padding: "14px 18px", borderRadius: 10,
                      background: isSelected ? "#EFEDFD" : "#FFF",
                      border: `${isSelected ? 2 : 1}px solid ${isSelected ? "#5B4FE9" : "#E2E8F0"}`,
                      cursor: "pointer", transition: "all 120ms cubic-bezier(0.2, 0, 0, 1)",
                      fontSize: 14, color: "#0F172A", fontWeight: 500,
                    }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = "#5B4FE9"; e.currentTarget.style.background = "#F8FAFC"; } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#FFF"; } }}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: 9999,
                      border: `2px solid ${isSelected ? "#5B4FE9" : "#CBD5E1"}`,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 120ms",
                    }}>
                      {isSelected && <span style={{ width: 10, height: 10, borderRadius: 9999, background: "#5B4FE9" }} />}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#94A3B8", width: 16 }}>{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {kind === "text" && (
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your answer…"
                rows={8}
                style={{
                  width: "100%", padding: 14, borderRadius: 10,
                  border: "1px solid #CBD5E1", fontFamily: "inherit", fontSize: 14,
                  lineHeight: 1.6, color: "#0F172A", outline: "none", resize: "vertical",
                  background: "#FFF", transition: "all 120ms",
                }}
                onFocus={e => { e.target.style.borderColor = "#5B4FE9"; e.target.style.boxShadow = "0 0 0 3px rgba(91,79,233,0.18)"; }}
                onBlur={e => { e.target.style.borderColor = "#CBD5E1"; e.target.style.boxShadow = "none"; }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#94A3B8" }}>
                <span>Up to 500 words</span>
                <span>{text.split(/\s+/).filter(Boolean).length} words · {text.length} chars</span>
              </div>
            </div>
          )}

          {kind === "code" && (
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #1E293B" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "#0F172A", borderBottom: "1px solid #1E293B" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#94A3B8", fontSize: 12, fontFamily: "var(--font-mono)" }}>
                  <window.Icon name="file-code" size={13} />
                  Repository.cs
                </div>
                <select style={{ background: "#1E293B", color: "#CBD5E1", border: "1px solid #334155", borderRadius: 6, padding: "3px 8px", fontSize: 11, outline: "none" }}>
                  <option>C#</option><option>JavaScript</option><option>Python</option><option>Java</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", background: "#0F172A", color: "#E2E8F0", fontFamily: "var(--font-mono)", fontSize: 13, minHeight: 240 }}>
                <div style={{ padding: "14px 8px", textAlign: "right", color: "#475569", borderRight: "1px solid #1E293B", userSelect: "none" }}>
                  {code.split("\n").map((_, i) => <div key={i} style={{ lineHeight: 1.6 }}>{i + 1}</div>)}
                </div>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  spellCheck={false}
                  style={{ background: "transparent", color: "#E2E8F0", border: 0, outline: "none", resize: "vertical", padding: "14px 14px", fontFamily: "inherit", fontSize: "inherit", lineHeight: 1.6, tabSize: 4, whiteSpace: "pre", minHeight: 240 }}
                />
              </div>
              <div style={{ padding: "8px 14px", background: "#0F172A", borderTop: "1px solid #1E293B", display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                <span>Tests: 0 / 6 passed · click Run to evaluate</span>
                <button style={{ background: "#5B4FE9", color: "#FFF", border: 0, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <window.Icon name="play" size={11} /> Run
                </button>
              </div>
            </div>
          )}
        </window.Reveal>

        {/* Bottom bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94A3B8" }}>
            <window.Icon
              name={saveState === "saving" ? "loader-2" : "check"}
              size={13}
              style={{ animation: saveState === "saving" ? "spin 1s linear infinite" : "none", color: saveState === "saving" ? "#94A3B8" : "#10B981" }}
            />
            {saveState === "saving" ? "Saving…" : "Saved 3s ago"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnGhost}><window.Icon name="arrow-left" size={13} /> Previous</button>
            <button style={btnBrand}>Next <window.Icon name="arrow-right" size={13} /></button>
          </div>
        </div>
      </main>

      {/* Submit modal */}
      <window.Modal open={submitOpen} onClose={() => setSubmitOpen(false)} width={480}>
        <div style={{ padding: "24px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#FFFBEB", color: "#B45309", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <window.Icon name="alert-triangle" size={20} />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#0F172A", margin: 0, letterSpacing: "-0.01em" }}>Submit section?</h3>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0", lineHeight: 1.55 }}>You'll move to the next section. You can't come back to edit these answers.</p>
            </div>
          </div>

          <div style={{ marginTop: 18, padding: 14, background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "#6B7280" }}>Answered</span>
              <span style={{ fontWeight: 600, color: "#0F172A", fontFamily: "var(--font-mono)" }}>{EXAM_SECTION.answered} / {EXAM_SECTION.total}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "#6B7280" }}>Skipped</span>
              <span style={{ fontWeight: 600, color: "#B45309", fontFamily: "var(--font-mono)" }}>1</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#6B7280" }}>Unanswered</span>
              <span style={{ fontWeight: 600, color: "#B53618", fontFamily: "var(--font-mono)" }}>2</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: 20, justifyContent: "flex-end", borderTop: "1px solid #F1F5F9", marginTop: 22 }}>
          <button style={btnGhost} onClick={() => setSubmitOpen(false)}>Keep working</button>
          <button style={btnBrand} onClick={() => setSubmitOpen(false)}>Submit section</button>
        </div>
      </window.Modal>
    </div>
  );
};

const QNavButton = ({ num, state }) => {
  const styles = {
    answered:   { bg: "#5B4FE9", fg: "#FFF",     border: "1px solid transparent" },
    current:    { bg: "#FFF",    fg: "#5B4FE9",  border: "2px solid #5B4FE9", weight: 700 },
    skipped:    { bg: "#FEF3C7", fg: "#92400E",  border: "1px solid transparent" },
    unanswered: { bg: "#F1F5F9", fg: "#64748B",  border: "1px solid transparent" },
  }[state] || {};
  return (
    <button style={{
      width: 40, height: 40, borderRadius: 9999,
      background: styles.bg, color: styles.fg, border: styles.border,
      fontWeight: styles.weight || 600, fontSize: 13,
      fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums",
      cursor: "pointer", transition: "all 120ms",
    }}>{num}</button>
  );
};

const Legend = ({ color, border, label, textColor }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6B7280" }}>
    <span style={{ width: 16, height: 16, borderRadius: 9999, background: color, border: border ? `2px solid ${border}` : "1px solid #E2E8F0", color: textColor }} />
    {label}
  </div>
);

const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 14px", borderRadius: 8,
  background: "#FFF", border: "1px solid #CBD5E1",
  fontSize: 13, fontWeight: 600, color: "#0F172A", cursor: "pointer",
  transition: "all 120ms",
};
const btnBrand = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 16px", borderRadius: 8,
  background: "#5B4FE9", color: "#FFF", border: 0,
  fontSize: 13, fontWeight: 600, cursor: "pointer",
  boxShadow: "0 4px 12px rgba(91,79,233,0.2)",
  transition: "all 120ms",
};

Object.assign(window, { ExamRunnerScreenV2 });
