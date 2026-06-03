/* HR Candidate detail — full page */

const CandidateDetailScreen = ({ candidate, navigate, onBack }) => {
  const { ACTIVITY, RUBRIC, MODES, STAGES } = window.SCREENO_DATA;
  const [tab, setTab] = React.useState("overview");
  window.useLucide([tab, candidate?.id]);

  if (!candidate) return null;
  const mode = MODES[candidate.mode];

  return (
    <div className="fadeup" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
      {/* Left column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero card */}
        <div className="card card-pad-lg" style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
          <window.Avatar name={candidate.name} size={72} fontSize={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 className="display" style={{ fontSize: 28, margin: 0 }}>{candidate.name}</h1>
              <window.StageBadge stage={candidate.stage} />
            </div>
            <div style={{ fontSize: 14, color: "#374151", marginBottom: 16 }}>{candidate.role}</div>
            <div style={{ display: "flex", gap: 22, fontSize: 13, color: "#6B7280", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="map-pin" size={14} /> {candidate.loc}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="briefcase" size={14} /> {candidate.exp} experience</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="mail" size={14} /> {candidate.email}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="phone" size={14} /> {candidate.phone}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><window.Icon name="link" size={14} /> {candidate.source}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button className="btn btn-secondary"><window.Icon name="calendar-plus" size={14} /> Schedule</button>
            <button className="btn btn-secondary"><window.Icon name="mail" size={14} /> Message</button>
            <button className="btn btn-primary" onClick={() => navigate("scorecard", candidate)}>
              <window.Icon name="check-square" size={14} /> Score
            </button>
          </div>
        </div>

        {/* Tabs */}
        <window.Tabs
          items={[
            { id: "overview", label: "Overview" },
            { id: "exam",     label: "Exam result" },
            { id: "ai",       label: "AI screen" },
            { id: "scorecards", label: "Scorecards", count: 2 },
            { id: "notes",    label: "Notes", count: 3 },
            { id: "files",    label: "Files", count: 1 },
          ]}
          active={tab}
          onChange={setTab}
        />

        {/* Tab content */}
        {tab === "overview" && <Overview candidate={candidate} navigate={navigate} />}
        {tab === "exam"     && <ExamResult candidate={candidate} />}
        {tab === "ai"       && <AIResult candidate={candidate} navigate={navigate} />}
        {tab === "scorecards" && <ScorecardsList navigate={navigate} candidate={candidate} />}
        {tab === "notes"    && <NotesPanel />}
        {tab === "files"    && <FilesPanel candidate={candidate} />}
      </div>

      {/* Right rail */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 88 }}>
        <div className="card card-pad">
          <window.Eyebrow>Stage</window.Eyebrow>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 0 }}>
            {Object.entries(STAGES).filter(([k]) => k !== "rejected").map(([k, s], i) => {
              const stages = ["applied", "screen", "interview", "offer"];
              const currentIdx = stages.indexOf(candidate.stage);
              const itemIdx = stages.indexOf(k);
              const done = itemIdx < currentIdx;
              const active = itemIdx === currentIdx;
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 3 ? "1px solid #F1F5F9" : 0 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 9999, background: done ? "#5B4FE9" : active ? "#FFF" : "#F1F5F9", border: active ? "2px solid #5B4FE9" : done ? 0 : "1px solid #E2E8F0", color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>
                    {done ? <window.Icon name="check" size={12} color="#FFF" /> : active ? <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#5B4FE9" }} /> : ""}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "#0F172A" : done ? "#374151" : "#94A3B8" }}>{s.label}</span>
                  {active && <span style={{ fontSize: 11, color: "#5B4FE9", fontWeight: 600 }}>Current</span>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}><window.Icon name="arrow-left" size={12} /> Back</button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>Pass to next <window.Icon name="arrow-right" size={12} /></button>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 8, color: "#B53618" }}>
            <window.Icon name="x" size={12} /> Reject candidate
          </button>
        </div>

        <div className="card card-pad">
          <window.Eyebrow>Next action</window.Eyebrow>
          <div style={{ marginTop: 12, padding: 14, background: "#FFFBEB", borderRadius: 8, border: "1px solid #FEF3C7" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <window.Icon name="clock" size={14} color="#B45309" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>Today, 4:30 PM</span>
            </div>
            <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600 }}>{candidate.next}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Interviewer: Screeno AI · 25 min</div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: "100%" }}>
              <window.Icon name="calendar" size={12} /> Reschedule
            </button>
          </div>
        </div>

        <div className="card card-pad">
          <window.Eyebrow>Recent activity</window.Eyebrow>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            {ACTIVITY.slice(0, 5).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 9999, background: a.tone === "success" ? "#ECFDF5" : a.tone === "brand" ? "#EFEDFD" : a.tone === "info" ? "#EFF6FF" : "#F1F5F9", color: a.tone === "success" ? "#047857" : a.tone === "brand" ? "#5B4FE9" : a.tone === "info" ? "#1D4ED8" : "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <window.Icon name={a.icon} size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 500 }}>{a.what}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{a.t} · {a.who}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Overview = ({ candidate, navigate }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    {/* Score summary */}
    <div className="card card-pad">
      <window.Eyebrow>Overall fit</window.Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center", marginTop: 14 }}>
        <div style={{ width: 120, height: 120, borderRadius: 9999, background: "conic-gradient(#5B4FE9 0% 84%, #F1F5F9 84% 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 8, background: "#FFF", borderRadius: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>{candidate.score?.toFixed(1) ?? "—"}</span>
            <span style={{ fontSize: 11, color: "#6B7280", letterSpacing: "0.05em" }}>/ 5.0</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Technical depth",        v: 4.4 },
            { label: "Problem solving",         v: 4.2 },
            { label: "Communication",           v: 4.6 },
            { label: "Collaboration & culture", v: 4.0 },
          ].map(r => (
            <div key={r.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151", marginBottom: 4 }}>
                <span style={{ fontWeight: 500 }}>{r.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#0F172A" }}>{r.v.toFixed(1)}</span>
              </div>
              <div style={{ height: 6, background: "#F1F5F9", borderRadius: 9999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(r.v / 5) * 100}%`, background: "#5B4FE9", borderRadius: 9999 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Highlights */}
    <div className="card card-pad">
      <window.Eyebrow>AI highlights</window.Eyebrow>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { icon: "thumbs-up", tone: "success", text: "Strong .NET fundamentals; described idempotency tradeoffs with confidence." },
          { icon: "thumbs-up", tone: "success", text: "Communicated decisions clearly with concrete numbers (200 writes/sec)." },
          { icon: "alert-triangle", tone: "warning", text: "Limited exposure to event sourcing — may need ramp-up on our payment service." },
          { icon: "info", tone: "info", text: "Notice period: 60 days. Open to relocation to Hyderabad." },
        ].map((h, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: 12, background: h.tone === "success" ? "#ECFDF5" : h.tone === "warning" ? "#FFFBEB" : "#EFF6FF", borderRadius: 8 }}>
            <window.Icon name={h.icon} size={16} color={h.tone === "success" ? "#047857" : h.tone === "warning" ? "#B45309" : "#1D4ED8"} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: "#0F172A", lineHeight: 1.5 }}>{h.text}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Quick stats */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      <window.Stat label="Coding exam" value="92%" delta="42 / 45 correct" deltaDir="up" />
      <window.Stat label="AI screen"   value="4.4" delta="14 min · clean" deltaDir="up" />
      <window.Stat label="Days in pipeline" value="6" deltaDir="flat" delta="vs 9 avg" />
      <window.Stat label="Notice period" value="60d" deltaDir="flat" delta="negotiable" />
    </div>
  </div>
);

const ExamResult = ({ candidate }) => (
  <div className="card card-pad">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <div>
        <window.Eyebrow>Coding exam · submitted 2 days ago</window.Eyebrow>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "#0F172A", marginTop: 6 }}>92% — Passed</div>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#6B7280" }}>
        <div><strong style={{ color: "#0F172A", fontFamily: "var(--font-mono)" }}>42</strong> / 45 correct</div>
        <div><strong style={{ color: "#0F172A", fontFamily: "var(--font-mono)" }}>38m</strong> / 45m used</div>
        <div><strong style={{ color: "#0F172A", fontFamily: "var(--font-mono)" }}>0</strong> tab switches</div>
      </div>
    </div>
    <table className="tbl tbl--compact" style={{ boxShadow: "none" }}>
      <thead>
        <tr>
          <th>#</th><th>Question</th><th>Type</th><th>Time</th><th>Score</th>
        </tr>
      </thead>
      <tbody>
        {[
          { n: 1, q: "Two-sum (return indices)",        type: "Coding", time: "06:22", s: 5, max: 5 },
          { n: 2, q: "HTTP status for rate limit",       type: "MCQ",    time: "00:18", s: 1, max: 1 },
          { n: 3, q: "useSyncExternalStore",             type: "MCQ",    time: "00:24", s: 1, max: 1 },
          { n: 4, q: "Primary key vs candidate key",     type: "MCQ",    time: "00:31", s: 0, max: 1 },
          { n: 5, q: "Reverse linked list (iterative)",  type: "Coding", time: "11:09", s: 5, max: 5 },
          { n: 6, q: "Promise semantics",                type: "MCQ",    time: "00:22", s: 1, max: 1 },
        ].map(r => (
          <tr key={r.n}>
            <td style={{ color: "#94A3B8", fontFamily: "var(--font-mono)", width: 30 }}>{r.n}</td>
            <td style={{ color: "#0F172A", fontWeight: 500 }}>{r.q}</td>
            <td><span style={{ fontSize: 12, color: "#6B7280" }}>{r.type}</span></td>
            <td style={{ fontFamily: "var(--font-mono)", color: "#6B7280", fontSize: 12 }}>{r.time}</td>
            <td>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {r.s === r.max ? <window.Icon name="check-circle-2" size={14} color="#059669" /> : <window.Icon name="x-circle" size={14} color="#B53618" />}
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: r.s === r.max ? "#047857" : "#B53618" }}>{r.s}/{r.max}</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AIResult = ({ candidate, navigate }) => {
  const { AI_TRANSCRIPT } = window.SCREENO_DATA;
  return (
    <div className="card card-pad">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <window.Eyebrow>AI voice screen · today 9:15 AM</window.Eyebrow>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "#0F172A", marginTop: 6 }}>Score 4.4 / 5.0</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Duration 14 min · 6 questions · sentiment positive</div>
        </div>
        <button className="btn btn-secondary"><window.Icon name="play" size={14} /> Play recording</button>
      </div>
      <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {AI_TRANSCRIPT.slice(0, 6).map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#94A3B8", paddingTop: 4, width: 40 }}>{t.t}</span>
            {t.who === "ai" ? (
              <div style={{ width: 28, height: 28, borderRadius: 9999, background: "#EFEDFD", color: "#5B4FE9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <window.Icon name="sparkles" size={14} />
              </div>
            ) : (
              <window.Avatar name={candidate.name} size={28} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.who === "ai" ? "#5B4FE9" : "#0F172A", marginBottom: 3 }}>{t.who === "ai" ? "Screeno AI" : candidate.name}</div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{t.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ScorecardsList = ({ navigate, candidate }) => (
  <div className="card card-pad">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <window.Eyebrow>Scorecards</window.Eyebrow>
      <button className="btn btn-primary btn-sm" onClick={() => navigate("scorecard", candidate)}>
        <window.Icon name="plus" size={12} /> New scorecard
      </button>
    </div>
    {[
      { who: "Anand Raman", role: "Engineering Manager", round: "Round 2 · Tech",   when: "Yesterday", score: 4.3 },
      { who: "Sara Mehta",  role: "Senior Engineer",     round: "Round 1 · Tech",   when: "3 days ago", score: 4.1 },
    ].map((s, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: i === 0 ? 0 : "1px solid #F1F5F9" }}>
        <window.Avatar name={s.who} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: "#0F172A", fontSize: 13 }}>{s.who}</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>{s.role} · {s.round}</div>
        </div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>{s.when}</div>
        <window.Score value={s.score} />
        <button className="btn btn-ghost btn-sm"><window.Icon name="chevron-right" size={14} /></button>
      </div>
    ))}
  </div>
);

const NotesPanel = () => (
  <div className="card card-pad">
    {[
      { who: "Alex Morgan", when: "2h ago", text: "Strong cultural fit — referred by Rohit (current Sr. eng). Wants remote-first but flexible." },
      { who: "Sara Mehta",  when: "Yesterday", text: "Pair-coding round was solid. Asked the right clarifying questions before writing code." },
      { who: "Anand Raman", when: "3 days ago", text: "Notice period 60 days. Move quickly — competing offer rumored from a fintech." },
    ].map((n, i) => (
      <div key={i} style={{ padding: "16px 0", borderTop: i === 0 ? 0 : "1px solid #F1F5F9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <window.Avatar name={n.who} size={26} fontSize={11} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{n.who}</span>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>· {n.when}</span>
        </div>
        <p style={{ fontSize: 13, color: "#374151", margin: "0 0 0 36px", lineHeight: 1.6 }}>{n.text}</p>
      </div>
    ))}
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
      <textarea className="input" rows="3" placeholder="Add a note for the hiring team…" style={{ resize: "vertical" }}></textarea>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button className="btn btn-primary btn-sm">Post note</button>
      </div>
    </div>
  </div>
);

const FilesPanel = ({ candidate }) => (
  <div className="card card-pad">
    {[
      { name: "Rahul_Sharma_Resume.pdf", size: "248 KB", when: "Uploaded 3 days ago", icon: "file-text" },
    ].map((f, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: "1px solid #E2E8F0", borderRadius: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: "#FFEDE6", color: "#B53618", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <window.Icon name={f.icon} size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{f.name}</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>{f.size} · {f.when}</div>
        </div>
        <button className="btn btn-secondary btn-sm"><window.Icon name="download" size={12} /> Download</button>
      </div>
    ))}
  </div>
);

window.CandidateDetailScreen = CandidateDetailScreen;
