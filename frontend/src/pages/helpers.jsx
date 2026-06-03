/* v2 — Shared helpers for the spec'd screens (icons, animation variants, motion shims) */

/* Lightweight Framer-Motion-ish wrappers using CSS keyframes.
   Real FM isn't available here; these mimic the same easing/spring feel. */

/* Pop-in (spring) wrapper — used on badges, checkmarks. */
const Pop = ({ children, delay = 0, style }) => (
  <span style={{
    display: "inline-flex",
    animation: `popIn 320ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms both`,
    ...style,
  }}>
    {children}
    <style>{`
      @keyframes popIn {
        from { opacity: 0; transform: scale(0.5); }
        to   { opacity: 1; transform: scale(1); }
      }
    `}</style>
  </span>
);

/* Fade-up reveal with optional stagger */
const Reveal = ({ children, delay = 0, y = 8, duration = 260, style, as = "div" }) => {
  const Tag = as;
  return (
    <Tag style={{
      animation: `revealUp ${duration}ms cubic-bezier(0.2, 0, 0, 1) ${delay}ms both`,
      ...style,
    }}>
      {children}
      <style>{`
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(${y}px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Tag>
  );
};

/* Modal/dialog scale-in */
const ModalIn = ({ children, style }) => (
  <div style={{ animation: "modalIn 220ms cubic-bezier(0.2, 0, 0, 1) both", ...style }}>
    {children}
    <style>{`
      @keyframes modalIn {
        from { opacity: 0; transform: scale(0.96); }
        to   { opacity: 1; transform: scale(1); }
      }
    `}</style>
  </div>
);

/* Brand chip — small label used inline */
const Chip = ({ children, tone = "neutral", icon }) => {
  const tones = {
    neutral:  { bg: "#F1F5F9", fg: "#475569" },
    brand:    { bg: "#EFEDFD", fg: "#3A31A3" },
    info:     { bg: "#EFF6FF", fg: "#1D4ED8" },
    success:  { bg: "#ECFDF5", fg: "#047857" },
    warning:  { bg: "#FFFBEB", fg: "#B45309" },
    danger:   { bg: "#FFEDE6", fg: "#B53618" },
    purple:   { bg: "#EDE9FE", fg: "#5B21B6" },
    amber:    { bg: "#FEF3C7", fg: "#92400E" },
    cyan:     { bg: "#CFFAFE", fg: "#155E75" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 9999,
      fontSize: 11.5, fontWeight: 600, lineHeight: 1.4,
      background: t.bg, color: t.fg,
    }}>
      {icon && <window.Icon name={icon} size={11} />}
      {children}
    </span>
  );
};

/* Score dots — a horizontal row of N filled-or-empty dots */
const ScoreDots = ({ value, max = 5, size = 20, gap = 6, color = "#5B4FE9", emptyColor = "#E2E8F0", interactive = false, onChange, labels }) => {
  const [hover, setHover] = React.useState(null);
  const labelFor = hover != null ? hover : value;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "inline-flex", gap, alignItems: "center" }} onMouseLeave={() => setHover(null)}>
        {[...Array(max)].map((_, i) => {
          const filled = i < value;
          const hovering = interactive && hover != null && i < hover;
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onMouseEnter={() => interactive && setHover(i + 1)}
              onClick={() => interactive && onChange?.(i + 1)}
              style={{
                width: size, height: size, borderRadius: 9999,
                background: filled || hovering ? color : emptyColor,
                border: 0, padding: 0, cursor: interactive ? "pointer" : "default",
                transition: "all 160ms cubic-bezier(0.2, 0, 0, 1)",
                transform: interactive && (i === hover - 1 || i === value - 1) ? "scale(1.12)" : "scale(1)",
                boxShadow: (filled || hovering) ? `0 2px 6px ${color}40` : "none",
              }}
            />
          );
        })}
      </div>
      {labels && (
        <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 500, height: 14 }}>
          {labelFor ? labels[labelFor - 1] : "\u00A0"}
        </div>
      )}
    </div>
  );
};

/* Bar score (used in radar-like layouts) */
const ScoreBar = ({ label, value, max = 5, color = "#5B4FE9" }) => (
  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 32px", alignItems: "center", gap: 12 }}>
    <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{label}</span>
    <span style={{ height: 8, background: "#F1F5F9", borderRadius: 9999, overflow: "hidden" }}>
      <span style={{
        display: "block", height: "100%",
        width: `${(value / max) * 100}%`,
        background: color, borderRadius: 9999,
        transition: "width 400ms cubic-bezier(0.2, 0, 0, 1)",
      }} />
    </span>
    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#0F172A", fontSize: 12, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}/{max}</span>
  </div>
);

/* Simple modal scrim + dialog wrapper */
const Modal = ({ open, onClose, children, width = 560 }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "scrimIn 180ms cubic-bezier(0.2,0,0,1) both",
        padding: 20,
      }}
    >
      <ModalIn style={{
        background: "#FFF", borderRadius: 16, width: "100%", maxWidth: width,
        boxShadow: "0 24px 48px rgba(15,23,42,0.24)",
        overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column",
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
          {children}
        </div>
      </ModalIn>
      <style>{`@keyframes scrimIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
};

/* Stat sparkline (tiny inline SVG line for trend) */
const Sparkline = ({ values, color = "#5B4FE9", width = 80, height = 26 }) => {
  if (!values?.length) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const rng = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - 2 - ((v - min) / rng) * (height - 4),
  ]);
  const d = "M" + pts.map(p => p.join(",")).join(" L");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={color} />
    </svg>
  );
};

/* Donut (very small inline progress donut for the dashboard pass-rate stat) */
const Donut = ({ value, size = 56, stroke = 6, color = "#5B4FE9", track = "#F1F5F9", showLabel = true }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (value / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
                strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
      </svg>
      {showLabel && (
        <span style={{ position: "absolute", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#0F172A", fontVariantNumeric: "tabular-nums" }}>
          {value}%
        </span>
      )}
    </div>
  );
};

/* Initials avatar — copy of shared.jsx helpers (kept local to v2 to make this file self-contained when needed) */
const INITIALS_COLORS_V2 = [
  { bg: "#DEDAFB", fg: "#3A31A3" }, { bg: "#FED7AA", fg: "#9A3412" },
  { bg: "#A7F3D0", fg: "#065F46" }, { bg: "#BFDBFE", fg: "#1E40AF" },
  { bg: "#FBCFE8", fg: "#9D174D" }, { bg: "#FDE68A", fg: "#854D0E" },
  { bg: "#C7D2FE", fg: "#3730A3" }, { bg: "#FCA5A5", fg: "#7F1D1D" },
];
const hashV2 = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); };
const initialsV2 = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const AvatarV2 = ({ name = "?", size = 36, ring }) => {
  const c = INITIALS_COLORS_V2[hashV2(name) % INITIALS_COLORS_V2.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: 9999,
      background: c.bg, color: c.fg,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontWeight: 600, fontSize: Math.round(size * 0.38),
      flexShrink: 0,
      boxShadow: ring ? `0 0 0 2px #FFF, 0 0 0 4px ${ring}` : undefined,
    }}>
      {initialsV2(name)}
    </div>
  );
};

Object.assign(window, {
  Pop, Reveal, ModalIn, Modal, Chip, ScoreDots, ScoreBar, Sparkline, Donut, AvatarV2,
});
