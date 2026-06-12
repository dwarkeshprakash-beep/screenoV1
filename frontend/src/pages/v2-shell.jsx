/* Screeno v2 — Shell: role bar, sub-tabs, sidebar, topbar, layouts */

/* ─── tiny helpers ─── */
const v2hash = s => { let h=0; for(let i=0;i<s.length;i++) h=((h<<5)-h+s.charCodeAt(i))|0; return Math.abs(h); };
const v2initials = n => n.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
const V2_AV_COLORS = [
  {bg:"#EDE9FE",fg:"#5B21B6"},{bg:"#FED7AA",fg:"#9A3412"},{bg:"#A7F3D0",fg:"var(--success-700)"},
  {bg:"#BFDBFE",fg:"#1E40AF"},{bg:"#FBCFE8",fg:"#9D174D"},{bg:"#FDE68A",fg:"#854D0E"},
  {bg:"#C7D2FE",fg:"#3730A3"},{bg:"#FCA5A5",fg:"#7F1D1D"},
];
const V2Av = ({name="?", size=36, ring, style:sty}) => {
  const c = V2_AV_COLORS[v2hash(name) % V2_AV_COLORS.length];
  return (
    <div style={{
      width:size, height:size, borderRadius:9999, flexShrink:0,
      background:c.bg, color:c.fg,
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      fontWeight:700, fontSize:Math.round(size*0.38), letterSpacing:"-0.01em",
      boxShadow: ring ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${ring}` : undefined,
      ...sty,
    }}>
      {v2initials(name)}
    </div>
  );
};

/* skill tag color map */
const SKILL_COLORS = {
  ".NET":       {bg:"#EDE9FE",fg:"#5B21B6"},
  "C#":         {bg:"#EDE9FE",fg:"#5B21B6"},
  "SQL":        {bg:"#DCFCE7",fg:"#166534"},
  "Docker":     {bg:"#DBEAFE",fg:"#1E40AF"},
  "React":      {bg:"#CFFAFE",fg:"#155E75"},
  "TypeScript": {bg:"var(--info-50)",fg:"var(--info-600)"},
  "CSS":        {bg:"#FCE7F3",fg:"#9D174D"},
  "Node.js":    {bg:"#DCFCE7",fg:"#166534"},
  "MongoDB":    {bg:"var(--success-100)",fg:"var(--success-700)"},
  "Java":       {bg:"var(--warning-100)",fg:"var(--warning-700)"},
  "Spring":     {bg:"#DCFCE7",fg:"#166534"},
  "Azure":      {bg:"#DBEAFE",fg:"#1E40AF"},
  "AWS":        {bg:"var(--warning-100)",fg:"var(--warning-700)"},
  "GraphQL":    {bg:"#FCE7F3",fg:"#9D174D"},
  "Go":         {bg:"#CFFAFE",fg:"#155E75"},
};
const SkillTag = ({label}) => {
  const c = SKILL_COLORS[label] || {bg:"var(--slate-100)",fg:"#475569"};
  return (
    <span style={{
      display:"inline-flex", alignItems:"center",
      padding:"2px 9px", borderRadius:9999,
      fontSize:12, fontWeight:600, letterSpacing:"0.01em",
      background:c.bg, color:c.fg,
    }}>{label}</span>
  );
};

/* assessment badge */
const AssessBadge = ({s, ago}) => {
  const map = {
    "up-to-date": {icon:"check-circle-2", color:"var(--success-500)", bg:"var(--success-50)", label:"Up to date"},
    "overdue":    {icon:"alert-triangle", color:"var(--warning-500)", bg:"var(--warning-50)", label:"Overdue"},
    "never":      {icon:"minus-circle",  color:"#EF4444", bg:"#FEF2F2", label:"Never assessed"},
  };
  const m = map[s] || map["never"];
  return (
    <div>
      <span style={{display:"inline-flex", alignItems:"center", gap:5, padding:"3px 8px", borderRadius:9999, background:m.bg, color:m.color, fontSize:12, fontWeight:600}}>
        <i data-lucide={m.icon} style={{width:12,height:12}} /> {m.label}
      </span>
      {ago && <div style={{fontSize:11, color:"var(--slate-400)", marginTop:3}}>{ago}</div>}
    </div>
  );
};

/* V2 icon wrapper */
const V2Icon = ({name, size=16, color, style:sty}) => (
  <i data-lucide={name} style={{width:size, height:size, color, display:"inline-flex", flexShrink:0, ...sty}} />
);

/* toggle switch */
const V2Toggle = ({on, onClick}) => (
  <button onClick={onClick} style={{
    width:40, height:23, borderRadius:9999, border:0, cursor:"pointer", flexShrink:0,
    background:on?"var(--brand-500)":"var(--slate-300)", position:"relative", transition:"background 160ms", padding:0,
  }}>
    <span style={{position:"absolute",top:2,left:on?19:2,width:19,height:19,borderRadius:9999,background:"var(--bg-surface)",boxShadow:"0 1px 3px rgba(15,23,42,0.2)",transition:"left 160ms cubic-bezier(0.2,0,0,1)"}}/>
  </button>
);

/* ─── ROLE BAR ─── */
const ROLES_V2 = [
  {id:"manager",      label:"MANAGER"},
  {id:"interviewer",  label:"INTERVIEWER"},
  {id:"candidate",    label:"CANDIDATE"},
];

const V2RoleBar = ({role, onRole, onLogout}) => (
  <div style={{
    background:"var(--slate-900)", height:38,
    display:"flex", alignItems:"center",
    padding:"0 14px", gap:4,
    position:"sticky", top:0, zIndex:100,
    borderBottom:"1px solid #1E293B",
  }}>
    <div style={{display:"flex",alignItems:"center",gap:8, marginRight:12}}>
      <div style={{width:22,height:22,borderRadius:6, background:"linear-gradient(135deg,var(--brand-500),var(--brand-600))", display:"inline-flex",alignItems:"center",justifyContent:"center", position:"relative"}}>
        <div style={{position:"absolute",left:5,top:7,width:12,height:2.5,background:"var(--bg-surface)",borderRadius:2,opacity:0.95}}/>
        <div style={{position:"absolute",left:5,top:12.5,width:12,height:2.5,background:"var(--bg-surface)",borderRadius:2,opacity:0.6}}/>
      </div>
      <span style={{color:"var(--bg-surface)",fontSize:15,fontWeight:700,letterSpacing:"-0.02em"}}>Screeno</span>
    </div>
    <div style={{width:1,height:18,background:"#1E293B",margin:"0 8px"}}/>
    {ROLES_V2.map(r => (
      <button key={r.id} onClick={()=>onRole(r.id)} style={{
        padding:"4px 12px", borderRadius:5,
        border: role===r.id ? "1px solid #334155" : "1px solid transparent",
        background:"transparent",
        color: role===r.id ? "var(--bg-surface)" : "#64748B",
        fontSize:12, fontWeight: role===r.id ? 600 : 500,
        cursor:"pointer", fontFamily:"inherit",
        transition:"all 120ms", letterSpacing:"0.03em",
      }}>{r.label}</button>
    ))}
    <div style={{flex:1}}/>
    {onLogout && (
      <button onClick={onLogout} style={{
        display:"inline-flex", alignItems:"center", gap:6,
        padding:"4px 12px", borderRadius:5, border:"1px solid transparent",
        background:"transparent", color:"#64748B",
        fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit",
        transition:"all 120ms",
      }}>
        <i data-lucide="log-out" style={{width:13,height:13}}/>Logout
      </button>
    )}
  </div>
);

/* ─── SUB-TABS per role ─── */
const MANAGER_TABS = [
  {id:"team-overview",  label:"Team Overview",  icon:"layout-dashboard"},
  {id:"my-team",        label:"My Team",        icon:"users"},
  {id:"referrals",      label:"Referrals",      icon:"share-2"},
  {id:"schedule",       label:"Schedule",       icon:"calendar", divider:true},
  {id:"reports",        label:"Reports",        icon:"bar-chart-3"},
];

const INTERVIEWER_TABS = [
  {id:"iv-dashboard", label:"Dashboard",  icon:"layout-dashboard"},
  {id:"iv-prep",      label:"Prep",       icon:"book-open"},
  {id:"iv-liveroom",  label:"Live Room",  icon:"video"},
  {id:"iv-scorecard", label:"Scorecard",  icon:"check-square"},
];

const CANDIDATE_TABS = [
  {id:"c-landing",    label:"Landing",    icon:"home"},
  {id:"c-device",     label:"Device",     icon:"monitor"},
  {id:"c-consent",    label:"Consent",    icon:"file-text"},
  {id:"c-status",     label:"Status",     icon:"activity"},
  {id:"c-exam",       label:"Exam",       icon:"code-2"},
  {id:"c-ai",         label:"AI Screen",  icon:"mic"},
  {id:"c-livevideo",  label:"Live Video", icon:"video"},
  {id:"c-completion", label:"Completion", icon:"check-circle-2"},
];

const V2SubBar = ({role, page, onPage}) => {
  const tabs = role==="manager" ? MANAGER_TABS : role==="interviewer" ? INTERVIEWER_TABS : CANDIDATE_TABS;
  const withSidebar = role==="manager" || role==="interviewer";
  return (
    <div style={{
      background:"var(--slate-900)",
      display:"flex", alignItems:"center",
      paddingLeft: withSidebar ? 200 : 0,
      position:"sticky", top:38, zIndex:99,
      borderBottom:"1px solid #1E293B",
    }}>
      {tabs.map((t,i) => (
        <React.Fragment key={t.id}>
          {t.divider && <div style={{width:1,height:16,background:"#1E293B",margin:"0 4px"}}/>}
          {t.divider && <span style={{fontSize:10,color:"#334155",letterSpacing:"0.1em",textTransform:"uppercase",padding:"0 8px"}}>SHARED</span>}
          <button
            onClick={()=>onPage(t.id)}
            style={{
              display:"inline-flex", alignItems:"center", gap:6,
              padding:"10px 16px",
              border:0, background:"transparent",
              color: page===t.id ? "var(--bg-surface)" : "#64748B",
              fontWeight: page===t.id ? 600 : 500,
              fontSize:12.5,
              fontFamily:"inherit", cursor:"pointer",
              borderBottom: page===t.id ? "2px solid var(--brand-500)" : "2px solid transparent",
              transition:"all 120ms", whiteSpace:"nowrap",
            }}
          >
            <i data-lucide={t.icon} style={{width:13,height:13}}/>
            {t.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

/* ─── SIDEBAR (manager / interviewer) ─── */
const MANAGER_NAV = [
  {section:"TEAM", items:[
    {id:"team-overview",label:"Team Overview",icon:"layout-dashboard"},
    {id:"my-team",      label:"My Team",      icon:"users"},
    {id:"referrals",    label:"Referrals",    icon:"share-2"},
  ]},
  {section:"TOOLS", items:[
    {id:"templates",      label:"Templates",      icon:"layout-template"},
    {id:"resume-analyze", label:"Resume Analyzer",icon:"scan-search"},
  ]},
  {section:"SHARED", items:[
    {id:"schedule", label:"Schedule", icon:"calendar"},
    {id:"reports",  label:"Reports",  icon:"bar-chart-3"},
  ]},
];

const IV_NAV = [
  {section:"INTERVIEWS", items:[
    {id:"iv-dashboard",label:"My Dashboard",  icon:"layout-dashboard"},
    {id:"iv-prep",     label:"Interview Prep",icon:"book-open"},
    {id:"iv-liveroom", label:"Live Room",      icon:"video"},
    {id:"iv-scorecard",label:"Scorecard",      icon:"check-square"},
  ]},
];

const V2Sidebar = ({role, page, onPage}) => {
  const nav = role==="manager" ? MANAGER_NAV : IV_NAV;
  const user = role==="manager"
    ? {name:"Kiran Patel", role:"Manager · Acme", initials:"KP"}
    : {name:"Anand Rao",   role:"Interviewer · Acme", initials:"AR"};
  return (
    <aside style={{
      width:200, background:"var(--slate-900)", color:"var(--bg-surface)",
      display:"flex", flexDirection:"column",
      position:"sticky", top:76, height:"calc(100vh - 76px)",
      borderRight:"1px solid #1E293B", flexShrink:0,
    }}>
      <div style={{flex:1, padding:"8px 10px", overflowY:"auto"}}>
        {nav.map((sec,si) => (
          <div key={si}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#475569",padding:"14px 10px 6px"}}>{sec.section}</div>
            {sec.items.map(it => {
              const on = page===it.id;
              return (
                <div key={it.id} onClick={()=>onPage(it.id)} style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"9px 12px", borderRadius:7,
                  fontSize:13, fontWeight:500,
                  color: on?"var(--bg-surface)":"var(--slate-400)",
                  background: on?"var(--brand-500)":"transparent",
                  cursor:"pointer", marginBottom:2,
                  boxShadow: on?"0 4px 12px rgba(91,79,233,0.3)":"none",
                  transition:"all 120ms cubic-bezier(0.2,0,0,1)",
                }}
                onMouseEnter={e=>{if(!on){e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="var(--bg-surface)";}}}
                onMouseLeave={e=>{if(!on){e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--slate-400)";}}}
                >
                  <i data-lucide={it.icon} style={{width:15,height:15}}/>
                  {it.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div onClick={()=>role==="manager"&&onPage("manager-profile")} style={{padding:"12px 14px",borderTop:"1px solid #1E293B",display:"flex",alignItems:"center",gap:10,flexShrink:0,cursor:role==="manager"?"pointer":"default",transition:"background 120ms"}}
        onMouseEnter={e=>{if(role==="manager")e.currentTarget.style.background="rgba(255,255,255,0.05)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
        <V2Av name={user.name} size={32}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12.5,fontWeight:600,color:"var(--bg-surface)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
          <div style={{fontSize:11,color:"#64748B"}}>{user.role}</div>
        </div>
        <i data-lucide={role==="manager"?"settings":"chevron-up"} style={{width:13,height:13,color:"#64748B"}}/>
      </div>
    </aside>
  );
};

/* ─── TOPBAR ─── */
const V2TopBar = ({title, subtitle, action, notifCount=2}) => (
  <div style={{
    height:56, background:"var(--bg-surface)", borderBottom:"1px solid var(--slate-200)",
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"0 24px", flexShrink:0,
  }}>
    <div>
      <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:18,fontWeight:700,color:"var(--slate-900)",margin:0,letterSpacing:"-0.015em"}}>{title}</h1>
      {subtitle && <div style={{fontSize:11,color:"var(--slate-400)",marginTop:1}}>{subtitle}</div>}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,background:"var(--slate-100)",borderRadius:8,padding:"7px 12px",width:260}}>
        <i data-lucide="search" style={{width:13,height:13,color:"var(--slate-400)"}}/>
        <span style={{fontSize:13,color:"var(--slate-400)"}}>Search candidates, jobs…</span>
        <kbd style={{fontSize:11,color:"var(--slate-400)",border:"1px solid var(--slate-200)",borderRadius:4,padding:"1px 5px",background:"var(--bg-surface)",marginLeft:"auto"}}>⌘K</kbd>
      </div>
      <div style={{position:"relative"}}>
        <button style={{width:36,height:36,borderRadius:8,background:"var(--slate-100)",border:0,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          <i data-lucide="bell" style={{width:15,height:15,color:"var(--slate-700)"}}/>
        </button>
        {notifCount>0 && <span style={{position:"absolute",top:6,right:6,width:8,height:8,borderRadius:9999,background:"#EF4444",boxShadow:"0 0 0 2px var(--bg-surface)"}}/>}
      </div>
      {action}
    </div>
  </div>
);

/* ─── APP SHELL (manager / interviewer) ─── */
const V2AppShell = ({role, page, onPage, title, subtitle, action, children}) => {
  React.useEffect(() => { window.lucide?.createIcons(); }, [page, title]);
  return (
    <div style={{display:"flex", minHeight:"calc(100vh - 76px)"}}>
      <V2Sidebar role={role} page={page} onPage={onPage}/>
      <div style={{flex:1, display:"flex", flexDirection:"column", minWidth:0}}>
        <V2TopBar title={title} subtitle={subtitle} action={action}/>
        <div style={{flex:1, background:"var(--slate-50)", padding:"24px 28px", overflowY:"auto"}}>
          <div key={page} style={{animation:"v2fade 280ms cubic-bezier(0.2,0,0,1)"}}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── CANDIDATE SHELL ─── */
const V2CandidateShell = ({page, onPage, topRight, children}) => {
  React.useEffect(() => { window.lucide?.createIcons(); }, [page]);
  return (
    <div style={{minHeight:"calc(100vh - 76px)", display:"flex", flexDirection:"column"}}>
      {/* minimal header */}
      <div style={{background:"var(--bg-surface)", borderBottom:"1px solid var(--slate-200)", padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,borderRadius:7, background:"linear-gradient(135deg,var(--brand-500),var(--brand-600))", position:"relative"}}>
            <div style={{position:"absolute",left:6,top:9,width:16,height:2.5,background:"var(--bg-surface)",borderRadius:2,opacity:0.95}}/>
            <div style={{position:"absolute",left:6,top:15,width:16,height:2.5,background:"var(--bg-surface)",borderRadius:2,opacity:0.6}}/>
          </div>
          <span style={{fontSize:17,fontWeight:700,color:"var(--slate-900)",letterSpacing:"-0.02em"}}>Screeno</span>
        </div>
        {topRight || <span style={{fontSize:13,color:"var(--slate-400)"}}>Need help? <a style={{color:"var(--brand-500)",cursor:"pointer"}}>Support</a></span>}
      </div>
      <div style={{flex:1, background:"var(--slate-50)"}}>
        <div key={page} style={{animation:"v2fade 280ms cubic-bezier(0.2,0,0,1)"}}>
          {children}
        </div>
      </div>
    </div>
  );
};

/* ─── HELP WIDGET (floating K) ─── */
const V2HelpWidget = () => (
  <div style={{position:"fixed", bottom:24, right:24, zIndex:200, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10}}>
    <button style={{
      width:44, height:44, borderRadius:9999,
      background:"var(--slate-900)", color:"var(--bg-surface)",
      border:0, cursor:"pointer",
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      fontSize:15, fontWeight:700,
      boxShadow:"0 8px 24px rgba(15,23,42,0.24)",
    }}>K</button>
    <button style={{
      width:40, height:40, borderRadius:9999,
      background:"var(--brand-500)", color:"var(--bg-surface)",
      border:0, cursor:"pointer",
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      boxShadow:"0 6px 16px rgba(91,79,233,0.3)",
      fontSize:10,
    }}>
      <i data-lucide="bar-chart-2" style={{width:16,height:16}}/>
    </button>
  </div>
);

/* ─── NOTIFICATION PANEL ─── */
const V2NotifPanel = ({open, onClose}) => {
  if(!open) return null;
  const items = [
    {icon:"user-plus",   tone:"brand",   text:"Divya Singh applied for React Developer",             when:"5 min ago",    unread:true},
    {icon:"alert-circle",tone:"danger",  text:"Your scorecard for Rahul Sharma is overdue",          when:"2 hours ago",  unread:true},
    {icon:"calendar",    tone:"warning", text:"Tech round with Priya Mehta in 30 minutes",           when:"2 hours ago",  unread:false},
    {icon:"check-circle-2",tone:"success",text:"AI report generated for Ankit Verma's screening",   when:"Yesterday",    unread:false},
    {icon:"download",    tone:"neutral", text:"Pipeline export is ready to download",                when:"Yesterday",    unread:false},
  ];
  const toneColor = {brand:"var(--brand-500)",danger:"#EF4444",warning:"var(--warning-500)",success:"var(--success-500)",neutral:"var(--slate-400)"};
  const toneBg    = {brand:"var(--brand-50)",danger:"#FEF2F2",warning:"var(--warning-50)",success:"var(--success-50)",neutral:"var(--slate-100)"};
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:150}}/>
      <div style={{
        position:"fixed", top:76, right:16, width:340,
        background:"var(--bg-surface)", border:"1px solid var(--slate-200)",
        borderRadius:14, boxShadow:"0 20px 40px rgba(15,23,42,0.14)",
        zIndex:160, overflow:"hidden",
        animation:"v2fade 160ms cubic-bezier(0.2,0,0,1)",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:"1px solid var(--slate-100)"}}>
          <span style={{fontSize:14,fontWeight:700,color:"var(--slate-900)"}}>Notifications</span>
          <button onClick={onClose} style={{background:"transparent",border:0,fontSize:12,color:"var(--brand-500)",fontWeight:500,cursor:"pointer"}}>Mark all read</button>
        </div>
        {items.map((it,i) => (
          <div key={i} style={{display:"flex",gap:12,padding:"12px 18px",borderBottom:i<items.length-1?"1px solid #F9FAFB":"0",background:it.unread?"#FAFAFE":"var(--bg-surface)"}}>
            <div style={{width:32,height:32,borderRadius:9999,background:toneBg[it.tone],color:toneColor[it.tone],display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <i data-lucide={it.icon} style={{width:14,height:14}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:"var(--slate-900)",lineHeight:1.5}}>{it.text}</div>
              <div style={{fontSize:11,color:"var(--slate-400)",marginTop:2}}>{it.when}</div>
            </div>
            {it.unread && <span style={{width:8,height:8,borderRadius:9999,background:"var(--brand-500)",flexShrink:0,marginTop:4}}/>}
          </div>
        ))}
        <div style={{padding:"12px 18px",textAlign:"center",borderTop:"1px solid var(--slate-100)"}}>
          <a style={{fontSize:13,color:"var(--brand-500)",fontWeight:500,cursor:"pointer"}}>View all notifications</a>
        </div>
      </div>
    </>
  );
};

/* mini modal */
const V2Modal = ({open, onClose, width=540, children}) => {
  React.useEffect(()=>{
    if(!open) return;
    const fn = e=>{ if(e.key==="Escape") onClose?.(); };
    window.addEventListener("keydown",fn);
    return ()=>window.removeEventListener("keydown",fn);
  },[open,onClose]);
  if(!open) return null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"v2fade 160ms"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--bg-surface)",borderRadius:16,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(15,23,42,0.24)",animation:"v2scale 200ms cubic-bezier(0.2,0,0,1)"}}>
        {children}
      </div>
    </div>
  );
};

Object.assign(window, {
  V2Av, SkillTag, AssessBadge, V2Icon, V2Toggle,
  V2RoleBar, V2SubBar, V2Sidebar, V2TopBar,
  V2AppShell, V2CandidateShell, V2HelpWidget,
  V2NotifPanel, V2Modal,
  MANAGER_TABS, INTERVIEWER_TABS, CANDIDATE_TABS,
});
