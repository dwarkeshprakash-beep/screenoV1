/* HR Schedule — week calendar */

const ScheduleScreen = ({ tweaks }) => {
  const { SCHEDULE } = window.SCREENO_DATA;
  const [weekOffset, setWeekOffset] = React.useState(0);
  window.useLucide([weekOffset]);

  const days = [
    { name: "Mon", num: 13, today: false },
    { name: "Tue", num: 14, today: true },
    { name: "Wed", num: 15, today: false },
    { name: "Thu", num: 16, today: false },
    { name: "Fri", num: 17, today: false },
  ];
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
  const HOUR_PX = 60;

  return (
    <div className="fadeup" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <h2 className="display" style={{ fontSize: 22, margin: 0 }}>May 13 – 17, 2026</h2>
          <div className="seg">
            <button onClick={() => setWeekOffset(w => w - 1)}><window.Icon name="chevron-left" size={14} /></button>
            <button onClick={() => setWeekOffset(0)}>Today</button>
            <button onClick={() => setWeekOffset(w => w + 1)}><window.Icon name="chevron-right" size={14} /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="seg">
            <button className="on">Week</button>
            <button>Day</button>
            <button>Month</button>
          </div>
          <button className="btn btn-secondary"><window.Icon name="filter" size={14} /> Filters</button>
          <button className="btn btn-primary"><window.Icon name="plus" size={14} /> Schedule interview</button>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <window.Stat label="This week" value="11" delta="interviews scheduled" deltaDir="flat" icon="calendar" />
        <window.Stat label="Today" value="2" delta="next at 4:30 PM" deltaDir="flat" icon="clock" />
        <window.Stat label="Conflicts" value="0" delta="all clear" deltaDir="up" icon="check-circle-2" />
        <window.Stat label="Awaiting confirm" value="3" delta="follow up by Fri" deltaDir="flat" icon="mail" />
      </div>

      {/* Calendar */}
      <div className="cal">
        <div className="cal-head">
          <div></div>
          {days.map((d, i) => (
            <div key={i} className={`cal-day ${d.today ? "today" : ""}`}>
              <div className="cal-day-name">{d.name}</div>
              <div className="cal-day-num">{d.num}</div>
            </div>
          ))}
        </div>

        <div className="cal-grid">
          <div className="cal-time-col">
            {hours.map(h => (
              <div key={h} className="cal-time">{h <= 12 ? `${h}:00` : `${h - 12}:00`}{h < 12 ? " AM" : " PM"}</div>
            ))}
          </div>
          {days.map((d, di) => (
            <div key={di} className="cal-col">
              {hours.map(h => <div key={h} className="cal-slot" />)}
              {/* now line */}
              {d.today && (
                <div style={{ position: "absolute", left: 0, right: 0, top: (15.25 - 9) * HOUR_PX, height: 1, background: "var(--danger-500)", zIndex: 5 }}>
                  <span style={{ position: "absolute", left: -6, top: -5, width: 11, height: 11, borderRadius: 9999, background: "var(--danger-500)" }} />
                  <span style={{ position: "absolute", right: 6, top: -16, fontSize: 10, color: "var(--danger-500)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>3:15 PM</span>
                </div>
              )}
              {SCHEDULE.filter(e => e.day === di).map((e, ei) => (
                <div
                  key={ei}
                  className={`cal-event cal-event--${e.type}`}
                  style={{ top: (e.start - 9) * HOUR_PX + 2, height: e.dur * HOUR_PX - 4 }}
                  title={e.title}
                >
                  <div style={{ fontWeight: 600, color: "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: "inherit", opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.sub}</div>
                  {e.dur >= 1 && <div style={{ fontSize: 11, color: "inherit", opacity: 0.7, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <window.Icon name="user" size={10} /> {e.who}
                  </div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 18, fontSize: 12, color: "var(--slate-500)", padding: "0 4px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--brand-50)", border: "1px solid var(--brand-500)" }} /> Live interview
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--warning-50)", border: "1px solid var(--warning-500)" }} /> AI screen
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--info-50)", border: "1px solid var(--info-500)" }} /> Coding exam window
        </span>
      </div>
    </div>
  );
};

window.ScheduleScreen = ScheduleScreen;
