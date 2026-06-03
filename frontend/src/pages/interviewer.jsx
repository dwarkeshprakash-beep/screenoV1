/* v2 — Interviewer screens: Dashboard, Interview Prep, Scorecard */

/* ============ INTERVIEWER DASHBOARD ============ */

const InterviewerDashboardV2 = () => {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, []);

  const interviews = [
    { time: "10:30 AM", name: "Rahul Sharma", role: "Senior .NET Developer", stage: "Tech Round 1", minsAway: 4,  state: "starting-soon" },
    { time: "2:00 PM",  name: "Priya Mehta",  role: "React Frontend Dev",    stage: "Tech Round 2", minsAway: 240, state: "upcoming" },
    { time: "4:30 PM",  name: "Ankit Verma",  role: "Full Stack Engineer",   stage: "Final Round",  minsAway: 390, state: "upcoming" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <DashStat label="Interviews this month" value="12" sub="↑ 3 vs last month">
          <window.Sparkline values={[6, 8, 7, 9, 11, 10, 12]} />
        </DashStat>
        <DashStat label="Pass rate" value="67%" sub="14 of 21 passed">
          <window.Donut value={67} size={48} stroke={5} />
        </DashStat>
        <DashStat label="Avg decision time" value="4.2 h" sub="↓ 1.1 h vs last month" icon="clock" />
      </div>

      {/* Today */}
      <section style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#0F172A", margin: 0, display: "inline-flex", alignItems: "center", gap: 10 }}>
            Today — Thursday, 22 May
            <window.Chip tone="brand">{interviews.length} interviews</window.Chip>
          </h2>
          <a style={{ fontSize: 12, color: "#5B4FE9", fontWeight: 500, cursor: "pointer" }}>View all</a>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {interviews.map((iv, i) => <InterviewRow key={i} interview={iv} divided={i > 0} />)}
        </div>
      </section>

      {/* Pending scorecards */}
      <section style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#0F172A", margin: 0, display: "inline-flex", alignItems: "center", gap: 10 }}>
            Pending scorecards
            <window.Chip tone="danger" icon="alert-circle">2 overdue</window.Chip>
          </h2>
        </div>
        {[
          { name: "Divya Singh", role: "React Frontend", round: "Tech Round 1", days: 1 },
          { name: "Karthik Reddy", role: "DevOps Engineer", round: "Tech Round 2", days: 2 },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: i === 0 ? 0 : "1px solid #F1F5F9" }}>
            <window.AvatarV2 name={s.name} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{s.role} · {s.round}</div>
            </div>
            <window.Chip tone="danger">Overdue by {s.days} day{s.days > 1 ? "s" : ""}</window.Chip>
            <button style={{
              padding: "7px 14px", borderRadius: 8, border: 0,
              background: "#5B4FE9", color: "#FFF", fontWeight: 600, fontSize: 13, cursor: "pointer",
              transition: "background 120ms", display: "inline-flex", alignItems: "center", gap: 6,
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#4A3FCE"}
              onMouseLeave={e => e.currentTarget.style.background = "#5B4FE9"}
            >
              <window.Icon name="check-square" size={13} /> Fill scorecard
            </button>
          </div>
        ))}
      </section>

      {/* This week */}
      <section style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#0F172A", margin: 0 }}>This week</h2>
          <a style={{ fontSize: 12, color: "#5B4FE9", fontWeight: 500, cursor: "pointer" }}>Open calendar</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {[
            { d: "Mon", n: 19, dots: 1, today: false },
            { d: "Tue", n: 20, dots: 2, today: false },
            { d: "Wed", n: 21, dots: 0, today: false },
            { d: "Thu", n: 22, dots: 3, today: true },
            { d: "Fri", n: 23, dots: 2, today: false },
            { d: "Sat", n: 24, dots: 0, today: false },
            { d: "Sun", n: 25, dots: 0, today: false },
          ].map((day, i) => (
            <div key={i} style={{
              padding: 14, textAlign: "center", borderRadius: 10,
              background: day.today ? "#EFEDFD" : "#F8FAFC",
              border: `1px solid ${day.today ? "#5B4FE9" : "#F1F5F9"}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: day.today ? "#5B4FE9" : "#94A3B8" }}>{day.d}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: day.today ? "#5B4FE9" : "#0F172A", marginTop: 4 }}>{day.n}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 8, height: 6 }}>
                {[...Array(day.dots)].map((_, j) => (
                  <span key={j} style={{ width: 5, height: 5, borderRadius: 9999, background: day.today ? "#5B4FE9" : "#7B69ED" }} />
                ))}
                {day.dots === 0 && <span style={{ fontSize: 10, color: "#94A3B8" }}>—</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const DashStat = ({ label, value, sub, children, icon }) => (
  <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(15,23,42,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#059669", fontWeight: 500, marginTop: 2 }}>{sub}</div>
    </div>
    {children || (icon && <window.Icon name={icon} size={16} color="#94A3B8" />)}
  </div>
);

const InterviewRow = ({ interview, divided }) => {
  const live = interview.state === "starting-soon";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderTop: divided ? "1px solid #F1F5F9" : 0 }}>
      <div style={{ width: 90, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0F172A" }}>{interview.time}</div>
        {live && <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginTop: 2 }}>in {interview.minsAway} min</div>}
      </div>
      <window.AvatarV2 name={interview.name} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{interview.name}</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{interview.role}</div>
      </div>
      <window.Chip tone="brand">{interview.stage}</window.Chip>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ padding: "7px 14px", borderRadius: 8, background: "#FFF", border: "1px solid #CBD5E1", color: "#0F172A", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <window.Icon name="book-open" size={13} /> Prep
        </button>
        <button
          disabled={!live}
          style={{
            padding: "7px 16px", borderRadius: 8, border: 0,
            background: live ? "#059669" : "#E2E8F0",
            color: live ? "#FFF" : "#94A3B8",
            fontWeight: 600, fontSize: 13,
            cursor: live ? "pointer" : "not-allowed",
            display: "inline-flex", alignItems: "center", gap: 6,
            boxShadow: live ? "0 4px 12px rgba(5,150,105,0.25)" : "none",
            animation: live ? "joinPulse 1.8s ease-in-out infinite" : "none",
          }}
        >
          <window.Icon name="video" size={13} /> Join
          {!live && <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 4 }}>· {Math.floor(interview.minsAway / 60)}h away</span>}
        </button>
      </div>
      <style>{`@keyframes joinPulse { 0%, 100% { box-shadow: 0 4px 12px rgba(5,150,105,0.25); } 50% { box-shadow: 0 4px 18px rgba(5,150,105,0.45); } }`}</style>
    </div>
  );
};

/* ============ INTERVIEW PREP ============ */

const InterviewPrepV2 = () => {
  const [tab, setTab] = React.useState("suggested");
  const [askedSet, setAskedSet] = React.useState(new Set());
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [tab, askedSet]);

  const suggestedQuestions = [
    { id: "q1", source: "From CV",       text: "Your CV shows 3 years with .NET Core. Walk me through the most complex system you've built.",
      followups: ["What were the team size and architecture decisions?", "What would you do differently in hindsight?"] },
    { id: "q2", source: "From CV",       text: "You mentioned microservices at Binary Republik — how did you handle service-to-service auth?",
      followups: ["Did you use mTLS or token-based auth?", "How did you rotate credentials?"] },
    { id: "q3", source: "Role template", text: "What's your experience with Azure Functions and when would you use them vs a regular API?",
      followups: ["Cold start tradeoffs?", "How would you size durable functions?"] },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 300px", gap: 18 }}>
      {/* Left — candidate info */}
      <PrepLeftPanel />

      {/* Center — questions */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 0, boxShadow: "0 1px 3px rgba(15,23,42,0.04)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "0 16px", borderBottom: "1px solid #E2E8F0" }}>
          {[
            { id: "suggested",  label: "Suggested questions", count: 3 },
            { id: "bank",       label: "Question bank" },
            { id: "notes",      label: "My notes" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "transparent", border: 0,
              padding: "14px 14px 12px",
              fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? "#3A31A3" : "#6B7280",
              borderBottom: tab === t.id ? "2px solid #5B4FE9" : "2px solid transparent",
              marginBottom: -1, cursor: "pointer",
              transition: "color 120ms",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              {t.label}
              {t.count != null && <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "var(--font-mono)" }}>({t.count})</span>}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {tab === "suggested" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {suggestedQuestions.map((q, i) => (
                <PrepQuestionCard key={q.id} q={q} index={i} asked={askedSet.has(q.id)} onToggle={() => {
                  setAskedSet(s => { const n = new Set(s); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
                }} />
              ))}
            </div>
          )}
          {tab === "bank" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F1F5F9", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
                <window.Icon name="search" size={14} color="#94A3B8" />
                <input placeholder="Search questions…" style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontSize: 13, color: "#0F172A" }} />
              </div>
              {[
                ".NET Core: Explain the difference between IEnumerable and IQueryable.",
                "C#: When would you use a struct vs a class?",
                ".NET Core: Walk through middleware pipeline order.",
                "System Design: Design a URL shortener.",
                "Azure: When to use Functions vs App Service?",
              ].map((q, i) => (
                <div key={i} style={{ padding: "12px 0", borderTop: i === 0 ? 0 : "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#374151" }}>
                  <window.Icon name="circle" size={6} color="#5B4FE9" />
                  {q}
                </div>
              ))}
            </div>
          )}
          {tab === "notes" && (
            <textarea placeholder="Jot down anything you want to remember during the interview…"
              style={{ width: "100%", minHeight: 240, border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, fontSize: 13, fontFamily: "inherit", lineHeight: 1.6, outline: "none", resize: "vertical" }} />
          )}
        </div>
      </div>

      {/* Right — skills matrix */}
      <PrepRightPanel />
    </div>
  );
};

const PrepLeftPanel = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <window.AvatarV2 name="Rahul Sharma" size={48} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>Rahul Sharma</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Senior .NET Developer</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><window.Icon name="mail" size={12} /> rahul.sharma@gmail.com</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><window.Icon name="phone" size={12} /> +91 98765 43210</div>
      </div>
      <button style={{ width: "100%", marginTop: 14, padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, background: "#FFF", color: "#0F172A", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <window.Icon name="file-text" size={13} /> View CV
      </button>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <window.Chip tone="warning">Tech Round 1</window.Chip>
        <span style={{ fontSize: 11, color: "#94A3B8" }}>Applied 3 days ago</span>
      </div>
    </div>

    <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5B4FE9", marginBottom: 12 }}>Previous rounds</div>
      {[
        { title: "AI Screening", status: "Passed", score: null, icon: "check-circle-2" },
        { title: "Coding exam",  status: "Passed", score: "78%", icon: "check-circle-2" },
      ].map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i === 0 ? 0 : "1px solid #F1F5F9" }}>
          <window.Icon name={r.icon} size={16} color="#059669" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{r.title}</div>
            <div style={{ fontSize: 11, color: "#047857" }}>{r.status}{r.score ? ` · ${r.score}` : ""}</div>
          </div>
          <a style={{ fontSize: 11, color: "#5B4FE9", fontWeight: 500, cursor: "pointer" }}>View report</a>
        </div>
      ))}
    </div>
  </div>
);

const PrepQuestionCard = ({ q, index, asked, onToggle }) => {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });
  return (
    <window.Reveal delay={index * 60} style={{
      background: asked ? "#FAFAFE" : "#FFF",
      border: `1px solid ${asked ? "#DEDAFB" : "#E2E8F0"}`,
      borderRadius: 10, padding: 16, transition: "all 220ms",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <button onClick={onToggle} title={asked ? "Mark not asked" : "Mark as asked"} style={{
          width: 22, height: 22, borderRadius: 6, marginTop: 2,
          background: asked ? "#5B4FE9" : "#FFF",
          border: `1.5px solid ${asked ? "#5B4FE9" : "#CBD5E1"}`,
          cursor: "pointer", padding: 0, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          transition: "all 160ms cubic-bezier(0.2, 0, 0, 1)",
        }}>
          {asked && <window.Icon name="check" size={13} color="#FFF" />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "inline-flex", marginBottom: 6 }}>
            <window.Chip tone="brand">{q.source}</window.Chip>
          </div>
          <div style={{ fontSize: 14, color: asked ? "#94A3B8" : "#0F172A", lineHeight: 1.55, textDecoration: asked ? "line-through" : "none" }}>{q.text}</div>
          <button onClick={() => setOpen(o => !o)} style={{ marginTop: 8, padding: "4px 0", background: "transparent", border: 0, color: "#5B4FE9", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <window.Icon name={open ? "chevron-down" : "chevron-right"} size={11} />
            {open ? "Hide follow-ups" : `Show ${q.followups.length} follow-ups`}
          </button>
          {open && (
            <window.Reveal y={4} duration={200} style={{ marginTop: 8, paddingLeft: 14, borderLeft: "2px solid #E2E8F0" }}>
              {q.followups.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.55, fontStyle: "italic", padding: "3px 0" }}>↳ {f}</div>
              ))}
            </window.Reveal>
          )}
        </div>
      </div>
    </window.Reveal>
  );
};

const PrepRightPanel = () => {
  const items = [
    { label: ".NET Core",        status: "covered",   note: "AI round" },
    { label: "SQL / DB Design",  status: "covered",   note: "Exam" },
    { label: "System Design",    status: "partial",   note: "Partially covered" },
    { label: "Azure / Cloud",    status: "open",      note: "Not covered" },
    { label: "Problem Solving",  status: "open",      note: "Not covered" },
    { label: "Communication",    status: "open",      note: "Not covered" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5B4FE9", marginBottom: 12 }}>Skills to cover</div>
        {items.map((s, i) => {
          const tone = s.status === "covered" ? { color: "#059669", icon: "check-circle-2" }
                    : s.status === "partial" ? { color: "#D97706", icon: "circle-dot" }
                    : { color: "#CBD5E1", icon: "circle" };
          return (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i === 0 ? 0 : "1px solid #F1F5F9" }}>
              <window.Icon name={tone.icon} size={16} color={tone.color} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: s.status === "open" ? "#6B7280" : "#0F172A" }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{s.note}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background: "linear-gradient(135deg, #EFEDFD, #FFF)", border: "1px solid #DEDAFB", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5B4FE9", marginBottom: 8 }}>
          <window.Icon name="target" size={12} /> Focus areas for today
        </div>
        <div style={{ fontSize: 13, color: "#0F172A", lineHeight: 1.6, fontWeight: 500 }}>
          <strong>Azure / Cloud</strong> and <strong>Problem Solving</strong> haven't been covered. Spend the bulk of today's hour here.
        </div>
      </div>
    </div>
  );
};

/* ============ POST-INTERVIEW SCORECARD ============ */

const ScorecardV2 = () => {
  const [scores, setScores] = React.useState({ dotnet: 4, arch: 3, azure: 2, problem: 4, comm: 5 });
  const [decision, setDecision] = React.useState("pass");
  const [reason, setReason] = React.useState("");
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); }, [decision]);

  const competencies = [
    { id: "dotnet",  label: ".NET Core & C# expertise", weight: "Core",  evidence: "Candidate demonstrated strong async/await understanding and explained middleware pipeline clearly." },
    { id: "arch",    label: "System architecture",      weight: "Core",  evidence: "Decent understanding of monolith to microservice migration but lacked specifics on decomposition strategies." },
    { id: "azure",   label: "Azure / Cloud",             weight: "Core",  evidence: "Limited hands-on experience. Mentioned Azure Functions but couldn't explain cold start tradeoffs." },
    { id: "problem", label: "Problem solving",          weight: "Core",  evidence: "Strong debugging approach. Walked through production incident methodically." },
    { id: "comm",    label: "Communication",             weight: "Bonus", evidence: "Exceptionally clear communicator. Structured answers well, confirmed understanding before answering." },
  ];
  const dotLabels = ["Poor", "Weak", "Good", "Strong", "Excellent"];

  const decisions = [
    { id: "pass",   label: "Pass",   icon: "thumbs-up",      color: "#047857", bg: "#ECFDF5", border: "#A7F3D0" },
    { id: "maybe",  label: "Maybe",  icon: "help-circle",    color: "#B45309", bg: "#FFFBEB", border: "#FEF3C7" },
    { id: "reject", label: "Reject", icon: "thumbs-down",    color: "#B53618", bg: "#FFEDE6", border: "#FFD4C2" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
      {/* Left — scorecard */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13, color: "#6B7280", padding: "12px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <window.Icon name="sparkles" size={14} color="#5B4FE9" />
          AI has pre-filled this scorecard based on the interview transcript. Review, edit, and submit.
        </div>

        {competencies.map((c, i) => (
          <window.Reveal key={c.id} delay={i * 60} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{c.label}</span>
                <window.Chip tone={c.weight === "Core" ? "brand" : "neutral"}>{c.weight}</window.Chip>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14, color: scores[c.id] >= 4 ? "#047857" : scores[c.id] >= 3 ? "#B45309" : "#B53618" }}>
                {scores[c.id]}/5
              </span>
            </div>
            <window.ScoreDots value={scores[c.id]} interactive onChange={(v) => setScores(s => ({ ...s, [c.id]: v }))} labels={dotLabels} size={22} />
            <EvidenceArea defaultText={c.evidence} />
          </window.Reveal>
        ))}

        {/* Final decision */}
        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 22, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 14 }}>Final decision</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {decisions.map(d => (
              <button key={d.id} onClick={() => setDecision(d.id)} style={{
                padding: 16, borderRadius: 10,
                border: `${decision === d.id ? 2 : 1}px solid ${decision === d.id ? d.border : "#E2E8F0"}`,
                background: decision === d.id ? d.bg : "#FFF",
                cursor: "pointer", transition: "all 160ms cubic-bezier(0.2, 0, 0, 1)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                fontWeight: 600, fontSize: 14,
                color: decision === d.id ? d.color : "#6B7280",
                transform: decision === d.id ? "translateY(-1px)" : "translateY(0)",
              }}>
                <window.Icon name={d.icon} size={20} />
                {d.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Why did you make this decision? <span style={{ color: "#FF5C35" }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 200))}
              rows={3}
              placeholder="Brief rationale for the hiring panel…"
              style={{ width: "100%", padding: 12, border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", lineHeight: 1.55, color: "#0F172A", outline: "none", resize: "vertical" }}
              onFocus={e => { e.target.style.borderColor = "#5B4FE9"; e.target.style.boxShadow = "0 0 0 3px rgba(91,79,233,0.18)"; }}
              onBlur={e => { e.target.style.borderColor = "#CBD5E1"; e.target.style.boxShadow = "none"; }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 11, color: "#94A3B8", marginTop: 4, fontFamily: "var(--font-mono)" }}>{reason.length}/200</div>
          </div>

          <button style={{
            width: "100%", marginTop: 16, padding: "12px 18px",
            background: "#5B4FE9", color: "#FFF", border: 0, borderRadius: 10,
            fontWeight: 600, fontSize: 14, cursor: "pointer",
            boxShadow: "0 8px 20px rgba(91,79,233,0.25)",
            transition: "background 120ms",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#4A3FCE"}
            onMouseLeave={e => e.currentTarget.style.background = "#5B4FE9"}
          >
            Submit scorecard
          </button>
          <div style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", marginTop: 8 }}>Last auto-saved 1 minute ago</div>
        </div>
      </div>

      {/* Right — AI insights */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 80, height: "fit-content" }}>
        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5B4FE9", marginBottom: 14 }}>
            <window.Icon name="sparkles" size={13} /> AI insights
          </div>
          {[
            { icon: "lightbulb",     color: "#5B4FE9", text: "Candidate contradicted earlier answer on Azure — mentioned 2 years experience in intro but couldn't answer basic Function App question." },
            { icon: "bar-chart-3",   color: "#5B4FE9", text: "Score aligns with AI screening: previous round gave 3.8/5 overall." },
            { icon: "alert-triangle", color: "#B45309", text: "Azure/Cloud is a core requirement for this role — consider if score of 2 is acceptable." },
          ].map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "12px 0", borderTop: i === 0 ? 0 : "1px solid #F1F5F9" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#EFEDFD", color: it.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <window.Icon name={it.icon} size={14} />
              </div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.55 }}>{it.text}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(15,23,42,0.04)", display: "flex", flexDirection: "column", gap: 12 }}>
          <a style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#5B4FE9", fontWeight: 500, cursor: "pointer" }}>
            <window.Icon name="file-text" size={14} /> Jump to transcript
          </a>
          <a style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#5B4FE9", fontWeight: 500, cursor: "pointer" }}>
            <window.Icon name="play-circle" size={14} /> Play recording <span style={{ marginLeft: "auto", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>52:14</span>
          </a>
        </div>
      </div>
    </div>
  );
};

const EvidenceArea = ({ defaultText }) => {
  const [text, setText] = React.useState(defaultText);
  const [edited, setEdited] = React.useState(false);
  return (
    <textarea
      value={text}
      onChange={e => { setText(e.target.value); setEdited(true); }}
      rows={3}
      style={{
        marginTop: 12, width: "100%", padding: 12,
        border: "1px solid #E2E8F0", borderRadius: 8,
        fontSize: 13, fontFamily: "inherit", lineHeight: 1.55,
        color: edited ? "#0F172A" : "#94A3B8",
        fontStyle: edited ? "normal" : "italic",
        outline: "none", resize: "vertical", background: edited ? "#FFF" : "#FAFAFE",
        transition: "all 160ms",
      }}
      onFocus={e => { e.target.style.borderColor = "#5B4FE9"; e.target.style.boxShadow = "0 0 0 3px rgba(91,79,233,0.18)"; setEdited(true); }}
      onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
    />
  );
};

Object.assign(window, { InterviewerDashboardV2, InterviewPrepV2, ScorecardV2 });
