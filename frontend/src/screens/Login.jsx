/* Login — sign-in screen with role picker */

const LoginScreen = ({ navigate }) => {
  const [email, setEmail] = React.useState("alex.morgan@acme.co");
  const [password, setPassword] = React.useState("••••••••");
  const [role, setRole] = React.useState("hr");
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  window.useLucide();

  const submit = (e) => {
    e?.preventDefault?.();
    const err = {};
    if (!email.includes("@")) err.email = "Enter a valid email address";
    if (password.length < 4) err.password = "Password is too short";
    setErrors(err);
    if (Object.keys(err).length) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      navigate(role === "candidate" ? "candidate-status" : "pipeline");
    }, 700);
  };

  return (
    <div className="brand-glow" style={{ minHeight: "calc(100vh - 52px)", display: "grid", gridTemplateColumns: "1fr 540px" }}>
      {/* Left panel — pitch */}
      <div style={{ padding: "48px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", borderRight: "1px solid rgba(226,232,240,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="sb-brand-mark" />
          <span style={{ fontSize: 19, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>Screeno</span>
        </div>

        <div style={{ maxWidth: 480 }}>
          <window.Eyebrow>Hire engineers, faster and fairer</window.Eyebrow>
          <h1 className="display" style={{ fontSize: 48, lineHeight: 1.1, margin: "14px 0 18px", letterSpacing: "-0.03em" }}>
            One pipeline.<br />Three interviewers.
          </h1>
          <p style={{ fontSize: 15, color: "var(--slate-700)", lineHeight: 1.7, margin: 0 }}>
            Coding exams, AI voice screens, and live video interviews — all in one place, with consistent scorecards your hiring panel can trust.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 34 }}>
            {[
              { icon: "file-text", title: "Proctored coding exam",  body: "Tab-switch detection, code playback, multi-language." },
              { icon: "phone",     title: "AI voice screen",         body: "Conducts the first round with transcript and rubric scoring." },
              { icon: "video",     title: "Live video interview",    body: "Built-in scorecard, suggested questions, and recording." },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--slate-200)", color: "var(--brand-500)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <window.Icon name={f.icon} size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--slate-900)", fontSize: 14 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "var(--slate-500)", marginTop: 2 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--slate-500)" }}>
          <window.Avatar name="Rohit K" size={28} />
          <div style={{ flex: 1, lineHeight: 1.5 }}>
            "We cut time-to-hire from 32 days to 14 in one quarter. The AI screen is shockingly good."
            <div style={{ marginTop: 4, color: "var(--slate-900)", fontWeight: 600 }}>Rohit Kapoor — Head of Engineering, Razorpe</div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ background: "var(--bg-surface)", padding: "48px 56px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ maxWidth: 380, width: "100%", margin: "0 auto" }}>
          <h2 className="display" style={{ fontSize: 28, margin: 0, marginBottom: 6, letterSpacing: "-0.02em" }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: "var(--slate-500)", margin: "0 0 28px" }}>Sign in to your Screeno workspace.</p>

          {/* Role tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: 4, background: "var(--slate-100)", borderRadius: 10, marginBottom: 24 }}>
            {[
              { id: "hr", label: "HR / Recruiter", icon: "user-cog" },
              { id: "interviewer", label: "Interviewer", icon: "users" },
              { id: "candidate", label: "Candidate", icon: "user" },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  padding: "10px 6px", borderRadius: 6, border: 0,
                  background: role === r.id ? "var(--bg-surface)" : "transparent",
                  color: role === r.id ? "var(--brand-500)" : "var(--slate-500)",
                  fontWeight: role === r.id ? 600 : 500, fontSize: 12,
                  boxShadow: role === r.id ? "0 1px 3px rgba(15,23,42,0.06)" : "none",
                  cursor: "pointer", transition: "all 120ms",
                }}
              >
                <window.Icon name={r.icon} size={16} />
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="label">Work email</label>
              <input
                type="email"
                className={`input ${errors.email ? "input--err" : ""}`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(s => ({ ...s, email: undefined })); }}
                placeholder="you@company.com"
                autoFocus
              />
              {errors.email && <div className="field-err"><window.Icon name="alert-circle" size={12} /> {errors.email}</div>}
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="label">Password</label>
                <a style={{ fontSize: 12, color: "var(--brand-500)", fontWeight: 500, cursor: "pointer" }}>Forgot?</a>
              </div>
              <input
                type="password"
                className={`input ${errors.password ? "input--err" : ""}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(s => ({ ...s, password: undefined })); }}
                placeholder="••••••••"
              />
              {errors.password && <div className="field-err"><window.Icon name="alert-circle" size={12} /> {errors.password}</div>}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--slate-700)", cursor: "pointer", marginTop: 4 }}>
              <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: "var(--brand-500)" }} />
              Keep me signed in
            </label>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
              {submitting ? <><window.Icon name="loader-2" size={14} style={{ animation: "spin 1s linear infinite" }} /> Signing in…</> : <>Sign in <window.Icon name="arrow-right" size={14} /></>}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "6px 0", color: "var(--slate-400)", fontSize: 11, fontWeight: 500 }}>
              <div style={{ flex: 1, height: 1, background: "var(--slate-200)" }} /> OR <div style={{ flex: 1, height: 1, background: "var(--slate-200)" }} />
            </div>

            <button type="button" className="btn btn-secondary btn-lg" style={{ width: "100%" }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              Continue with Google
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--slate-500)" }}>
            New to Screeno? <a style={{ color: "var(--brand-500)", fontWeight: 500, cursor: "pointer" }}>Request access</a>
          </div>
        </div>
      </div>
    </div>
  );
};

window.LoginScreen = LoginScreen;
