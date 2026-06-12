/* Screeno v2 — Manager screens */

/* ── shared button styles ── */
const Btn = ({children, variant="primary", size="md", onClick, disabled, style:sty, title}) => {
  const base = {display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"inherit",cursor:disabled?"not-allowed":"pointer",border:0,borderRadius:8,fontWeight:600,transition:"all 120ms cubic-bezier(0.2,0,0,1)",whiteSpace:"nowrap",...sty};
  const sizes = {sm:{fontSize:12,padding:"5px 10px"},md:{fontSize:13,padding:"8px 14px"},lg:{fontSize:14,padding:"11px 20px"}};
  const variants = {
    primary:  {background:disabled?"var(--slate-200)":"var(--brand-500)", color:disabled?"var(--slate-400)":"var(--bg-surface)", boxShadow:disabled?"none":"0 4px 12px rgba(91,79,233,0.2)"},
    secondary:{background:"var(--bg-surface)", color:"var(--slate-900)", border:"1px solid var(--slate-300)"},
    ghost:    {background:"transparent", color:"var(--slate-700)"},
    danger:   {background:"var(--bg-surface)", color:"var(--danger-700)", border:"1px solid var(--danger-100)"},
    success:  {background:"var(--success-500)", color:"var(--bg-surface)"},
  };
  return <button onClick={onClick} disabled={disabled} title={title} style={{...base,...sizes[size],...variants[variant]}}>{children}</button>;
};

const Card = ({children, style:sty, pad=20}) => (
  <div style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:12,padding:pad,boxShadow:"0 1px 3px rgba(15,23,42,0.04)",...sty}}>{children}</div>
);

const Eyebrow = ({children, color="var(--brand-500)"}) => (
  <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color}}>{children}</div>
);

/* ══════════════════════════════════════════
   TEAM OVERVIEW
══════════════════════════════════════════ */
const TeamOverviewScreen = ({onNavigate}) => {
  const {JOBS, ACTIVITY} = window.V2;
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20,animation:"v2fade 280ms"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <Eyebrow color="var(--brand-500)">MANAGER · TEAM</Eyebrow>
          <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:28,fontWeight:700,color:"var(--slate-900)",margin:"6px 0 4px",letterSpacing:"-0.02em"}}>Team Hiring</h1>
          <p style={{color:"var(--slate-500)",fontSize:14,margin:0}}>Manage your team's active openings, review candidate scorecards, and make final decisions.</p>
        </div>
        <Btn onClick={()=>onNavigate("add-job")}><i data-lucide="plus" style={{width:14,height:14}}/> Post New Job</Btn>
      </div>

      {/* 3 stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        {[
          {icon:"briefcase", value:"3 open roles",   sub:"Active Jobs",            link:"Engineering team",    n:3},
          {icon:"users",     value:"42 candidates",  sub:"Candidates Evaluated",   link:"This quarter",        n:42},
          {icon:"check-square",value:"2 pending",   sub:"Awaiting My Scorecard",  link:"Divya & Karthik",    n:2},
        ].map((s,i) => (
          <Card key={i} sty={{cursor:"pointer"}} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(15,23,42,0.06)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(15,23,42,0.04)"}>
            <div style={{width:36,height:36,borderRadius:9,background:"var(--brand-50)",color:"var(--brand-500)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
              <i data-lucide={s.icon} style={{width:18,height:18}}/>
            </div>
            <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:32,fontWeight:700,color:"var(--slate-900)",letterSpacing:"-0.025em",lineHeight:1}}>{s.value}</div>
            <div style={{color:"var(--slate-500)",fontSize:13,marginTop:4}}>{s.sub}</div>
            <a style={{color:"var(--brand-500)",fontSize:12,fontWeight:500,cursor:"pointer",marginTop:8,display:"block"}}>{s.link}</a>
          </Card>
        ))}
      </div>

      {/* Bottom 2-col */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16}}>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700,color:"var(--slate-900)"}}>My Team's Openings</div>
            <a style={{fontSize:12,color:"var(--brand-500)",fontWeight:500,cursor:"pointer"}}>View All</a>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {["ROLE","CANDIDATES","STATUS"].map(h=>(
                  <th key={h} style={{textAlign:"left",fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--slate-400)",padding:"0 0 10px",borderBottom:"1px solid var(--slate-100)"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {JOBS.map((j,i) => (
                <tr key={j.id} onClick={()=>onNavigate("job-candidates",j)} style={{cursor:"pointer"}}>
                  <td style={{padding:"14px 0",borderBottom:"1px solid #F9FAFB"}}>
                    <div style={{fontSize:14,fontWeight:500,color:"var(--slate-900)"}}>{j.title}</div>
                    <div style={{fontSize:12,color:"var(--slate-400)",marginTop:2}}>{j.loc}</div>
                  </td>
                  <td style={{padding:"14px 0",borderBottom:"1px solid #F9FAFB"}}>
                    <span style={{fontSize:14,fontWeight:600,color:"var(--brand-500)"}}>{j.candidates} active</span>
                  </td>
                  <td style={{padding:"14px 0",borderBottom:"1px solid #F9FAFB"}}>
                    <span style={{fontSize:12,fontWeight:600,color:"var(--success-500)"}}>{j.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div style={{fontSize:15,fontWeight:700,color:"var(--slate-900)",marginBottom:14}}>Hiring Activity</div>
          {ACTIVITY.map((a,i) => (
            <div key={i} style={{borderTop:i===0?"0":"1px solid #F9FAFB",padding:"12px 0"}}>
              <div style={{fontSize:13,fontWeight:500,color:"var(--slate-900)"}}>{a.what}</div>
              <div style={{fontSize:12,color:"var(--brand-500)",marginTop:2}}>{a.sub}</div>
              <div style={{fontSize:11,color:"var(--slate-400)",marginTop:2}}>{a.when}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MY TEAM
══════════════════════════════════════════ */
const MyTeamScreen = ({onNavigate, onSchedule}) => {
  const store = window.useV2Store();
  const TEAM = store.get().team;
  const [tab, setTab] = React.useState("all");
  const [selected, setSelected] = React.useState(new Set());
  const [compareOpen, setCompareOpen] = React.useState(false);
  React.useEffect(()=>{window.lucide?.createIcons();},[tab,selected.size,compareOpen]);

  const overdue = TEAM.filter(m=>m.assess.s!=="up-to-date").length;
  const rows = tab==="all" ? TEAM : TEAM.filter(m=>m.assess.s!=="up-to-date");

  const toggleSelect = id => setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  const allSel = selected.size===rows.length && rows.length>0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <Eyebrow>MANAGER · TEAM</Eyebrow>
          <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:26,fontWeight:700,color:"var(--slate-900)",margin:"6px 0 4px",letterSpacing:"-0.02em"}}>My Team</h1>
          <p style={{color:"var(--slate-500)",fontSize:13,margin:0}}>Track your team's skills, schedule assessments, and monitor development.</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {overdue>0 && (
            <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 12px",background:"var(--warning-50)",border:"1px solid var(--warning-100)",borderRadius:8,fontSize:12,fontWeight:600,color:"var(--warning-600)"}}>
              <i data-lucide="alert-triangle" style={{width:14,height:14}}/> {overdue} members overdue for assessment
            </div>
          )}
          <Btn onClick={()=>onNavigate("add-member")} variant="secondary"><i data-lucide="user-plus" style={{width:13,height:13}}/> Add member</Btn>
          <Btn onClick={()=>onNavigate("csv-import")}><i data-lucide="upload" style={{width:13,height:13}}/> Import CSV</Btn>
        </div>
      </div>

      {/* 3 summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {[
          {icon:"users",       color:"var(--brand-500)", bg:"var(--brand-50)", value:TEAM.length, label:"Total team members"},
          {icon:"check-circle-2",color:"var(--success-500)",bg:"var(--success-50)", value:TEAM.filter(m=>m.assess.s==="up-to-date").length, label:"Assessed last 90 days"},
          {icon:"clock",       color:"var(--warning-500)", bg:"var(--warning-50)", value:TEAM.filter(m=>m.assess.s!=="up-to-date").length, label:"Need assessment"},
        ].map((s,i) => (
          <Card key={i} style={{display:"flex",alignItems:"center",gap:14,padding:18}}>
            <div style={{width:44,height:44,borderRadius:10,background:s.bg,color:s.color,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <i data-lucide={s.icon} style={{width:20,height:20}}/>
            </div>
            <div>
              <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:28,fontWeight:700,color:"var(--slate-900)",letterSpacing:"-0.02em",lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:12,color:"var(--slate-500)",marginTop:3}}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setTab("all")} style={{padding:"7px 16px",borderRadius:7,border:`1px solid ${tab==="all"?"var(--brand-500)":"var(--slate-200)"}`,background:tab==="all"?"var(--bg-surface)":"var(--bg-surface)",color:tab==="all"?"var(--brand-500)":"var(--slate-700)",fontWeight:tab==="all"?600:500,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>All members</button>
        <button onClick={()=>setTab("attention")} style={{padding:"7px 16px",borderRadius:7,border:`1px solid ${tab==="attention"?"var(--brand-500)":"var(--slate-200)"}`,background:"var(--bg-surface)",color:tab==="attention"?"var(--brand-500)":"var(--slate-700)",fontWeight:tab==="attention"?600:500,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
          Need attention ({TEAM.filter(m=>m.assess.s!=="up-to-date").length})
        </button>
      </div>

      {/* Table */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"var(--slate-50)"}}>
              <th style={{padding:"12px 16px",width:36}}>
                <input type="checkbox" checked={allSel} onChange={()=>setSelected(allSel?new Set():new Set(rows.map(r=>r.id)))} style={{accentColor:"var(--brand-500)",cursor:"pointer"}}/>
              </th>
              {["TEAM MEMBER","LAST ASSESSMENT","SKILLS","UPCOMING","ACTIONS"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"12px 16px",fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--slate-400)",borderBottom:"1px solid var(--slate-200)"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m,i) => (
              <tr key={m.id} onClick={()=>onNavigate("member-profile",m)} style={{cursor:"pointer",background:selected.has(m.id)?"#F3F0FF":"var(--bg-surface)",transition:"background 120ms"}}
                onMouseEnter={e=>{if(!selected.has(m.id)) e.currentTarget.style.background="var(--slate-50)";}}
                onMouseLeave={e=>{if(!selected.has(m.id)) e.currentTarget.style.background="var(--bg-surface)";}}>
                <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}} onClick={e=>e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(m.id)} onChange={()=>toggleSelect(m.id)} style={{accentColor:"var(--brand-500)",cursor:"pointer"}}/>
                </td>
                <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <window.V2Av name={m.name} size={36}/>
                    <div>
                      <div style={{fontWeight:600,color:"var(--slate-900)"}}>{m.name}</div>
                      <div style={{fontSize:12,color:"var(--slate-500)",marginTop:1}}>{m.role}</div>
                    </div>
                  </div>
                </td>
                <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>
                  <window.AssessBadge s={m.assess.s} ago={m.assess.ago}/>
                </td>
                <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {m.skills.length>0 ? m.skills.map(sk=><window.SkillTag key={sk} label={sk}/>) : <span style={{fontSize:12,color:"var(--slate-400)",fontStyle:"italic"}}>No skills tagged yet</span>}
                  </div>
                </td>
                <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>
                  <span style={{fontSize:13,color:m.upcoming==="—"?"var(--slate-400)":"var(--brand-500)",fontWeight:m.upcoming==="—"?400:500}}>{m.upcoming}</span>
                </td>
                <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}} onClick={e=>e.stopPropagation()}>
                  <Btn size="sm" variant="secondary" onClick={()=>onSchedule(m)}>
                    <i data-lucide="calendar-plus" style={{width:12,height:12}}/> Schedule
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Bulk action bar */}
      {selected.size>0 && (
        <div style={{
          position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",
          background:"var(--slate-900)",color:"var(--bg-surface)",borderRadius:14,
          padding:"10px 14px",display:"inline-flex",alignItems:"center",gap:14,
          boxShadow:"0 16px 40px rgba(15,23,42,0.32)",zIndex:30,
          animation:"v2slide 240ms cubic-bezier(0.2,0,0,1)",
        }}>
          <span style={{fontSize:13,fontWeight:600}}>{selected.size} selected</span>
          {selected.size>=2 && (
            <Btn size="sm" onClick={()=>setCompareOpen(true)} style={{background:"var(--brand-500)",color:"var(--bg-surface)",border:0}}>
              <i data-lucide="git-compare" style={{width:12,height:12}}/> Compare {selected.size>2?"(first 2)":""}
            </Btn>
          )}
          <Btn size="sm" onClick={()=>onSchedule(null,Array.from(selected))} style={{background:selected.size>=2?"rgba(255,255,255,0.1)":"var(--brand-500)",color:"var(--bg-surface)",border:0}}>
            <i data-lucide="calendar-plus" style={{width:12,height:12}}/> Schedule all
          </Btn>
          <Btn size="sm" style={{background:"rgba(255,255,255,0.1)",color:"var(--bg-surface)",border:0}}>
            <i data-lucide="mail" style={{width:12,height:12}}/> Send reminder
          </Btn>
          <button onClick={()=>setSelected(new Set())} style={{background:"transparent",border:0,color:"#64748B",cursor:"pointer",fontSize:13}}>Deselect</button>
        </div>
      )}
      <window.CompareModal open={compareOpen} onClose={()=>setCompareOpen(false)} members={TEAM.filter(m=>selected.has(m.id)).slice(0,2)}/>
    </div>
  );
};

/* ══════════════════════════════════════════
   MEMBER / CANDIDATE PROFILE
══════════════════════════════════════════ */
const MemberProfileScreen = ({member:memberProp, onBack, onSchedule, isExternal}) => {
  const store = window.useV2Store();
  const [tab,setTab] = React.useState("overview");
  const [editOpen,setEditOpen] = React.useState(false);
  const list = isExternal ? store.get().external : store.get().team;
  const member = list.find(x=>x.id===memberProp?.id) || memberProp;
  React.useEffect(()=>{window.lucide?.createIcons();},[tab,editOpen]);
  if(!member) return null;

  const history = isExternal ? [
    {type:"Application",       date:"May 25",  status:"Received",    icon:"user-plus",   done:true,  tone:"info"},
    {type:"Coding Exam",       date:"May 26",  status:"Score 78%",   icon:"code-2",      done:true,  tone:"success"},
    {type:"AI Voice Screen",   date:"May 27",  status:"Score 4.4/5", icon:"mic",         done:true,  tone:"success",current:false},
    {type:"Tech Round 1",      date:"May 28 · Today 2:00 PM", status:"Scheduled",  icon:"video", done:false, tone:"brand",current:true},
    {type:"Final Round",       date:"—",        status:"Pending",     icon:"flag",        done:false, tone:"neutral"},
  ] : [
    {type:"Monthly Mock",      date:"Mar 12",  status:"Score 4.2/5", icon:"mic",         done:true,  tone:"success"},
    {type:"Client Mock",       date:"Jan 8",   status:"Score 3.9/5", icon:"briefcase",   done:true,  tone:"warning"},
    {type:"Next assessment",   date:"Overdue", status:"Schedule now",icon:"alert-triangle",done:false,tone:"danger",current:true},
  ];

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20,animation:"v2fade 280ms"}}>
      {/* Left */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {/* Hero */}
        <Card>
          <div style={{display:"flex",alignItems:"flex-start",gap:18}}>
            <window.V2Av name={member.name} size={64} ring="var(--brand-100)"/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4,flexWrap:"wrap"}}>
                <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:22,fontWeight:700,color:"var(--slate-900)",margin:0,letterSpacing:"-0.02em"}}>{member.name}</h1>
                {isExternal ? (
                  <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:9999,background:"var(--info-50)",color:"var(--info-600)"}}>Candidate</span>
                ) : (
                  <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:9999,background:"var(--success-50)",color:"var(--success-600)"}}>Team Member</span>
                )}
              </div>
              <div style={{fontSize:13,color:"var(--slate-500)",marginBottom:10}}>{member.role}</div>
              <div style={{display:"flex",gap:18,fontSize:12,color:"var(--slate-400)",flexWrap:"wrap"}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="mail" style={{width:12,height:12}}/>{member.email}</span>
                {member.phone && <span style={{display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="phone" style={{width:12,height:12}}/>{member.phone}</span>}
                {member.loc && <span style={{display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="map-pin" style={{width:12,height:12}}/>{member.loc}</span>}
                {member.exp && <span style={{display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="briefcase" style={{width:12,height:12}}/>{member.exp}</span>}
              </div>
              {member.skills?.length>0 && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
                  {member.skills.map(sk=><window.SkillTag key={sk} label={sk}/>)}
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0}}>
              <Btn size="sm" variant="secondary" onClick={()=>setEditOpen(true)}><i data-lucide="pencil" style={{width:12,height:12}}/> Edit</Btn>
              <Btn size="sm" variant="secondary"><i data-lucide="file-text" style={{width:12,height:12}}/> Resume</Btn>
              <Btn size="sm" onClick={()=>onSchedule(member)}><i data-lucide="calendar-plus" style={{width:12,height:12}}/> Schedule</Btn>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,borderBottom:"1px solid var(--slate-200)",paddingBottom:0}}>
          {[
            {id:"overview",   label:"Overview"},
            {id:"analysis",   label:"Analysis"},
            {id:"history",    label:"Interview history"},
            {id:"transcript", label:"AI transcript"},
            {id:"scorecard",  label:"Scorecards"},
            {id:"notes",      label:"Notes"},
          ].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:"transparent",border:0,padding:"10px 14px",
              fontSize:13,fontWeight:tab===t.id?600:500,
              color:tab===t.id?"var(--brand-700)":"var(--slate-500)",
              borderBottom:tab===t.id?"2px solid var(--brand-500)":"2px solid transparent",
              marginBottom:-1,cursor:"pointer",fontFamily:"inherit",transition:"color 120ms",
            }}>{t.label}</button>
          ))}
        </div>

        {tab==="overview" && <ProfileOverview member={member} isExternal={isExternal}/>}
        {tab==="analysis" && <ProfileAnalysis member={member} isExternal={isExternal}/>}
        {tab==="history"  && <ProfileHistory history={history}/>}
        {tab==="transcript" && <ProfileTranscript/>}
        {tab==="scorecard"  && <ProfileScorecard/>}
        {tab==="notes"      && <ProfileNotes member={member}/>}
      </div>

      {/* Right rail */}
      <div style={{display:"flex",flexDirection:"column",gap:14,position:"sticky",top:80}}>
        {/* resume card */}
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--slate-900)"}}>Resume</div>
            <Btn size="sm" variant="secondary"><i data-lucide="download" style={{width:12,height:12}}/></Btn>
          </div>
          <div style={{background:"var(--slate-50)",border:"1px solid var(--slate-200)",borderRadius:8,padding:12}}>
            {[65,45,100,92,78,100,85,60,100,72,55].map((w,i)=>(
              <div key={i} style={{height:i%4===0?7:5,background:i%4===0?"var(--slate-400)":"var(--slate-300)",borderRadius:9999,width:`${w}%`,marginBottom:5}}/>
            ))}
          </div>
          {member.resumeUpdated && <div style={{fontSize:11,color:"var(--slate-400)",marginTop:8,textAlign:"center"}}>Updated {member.resumeUpdated}</div>}
          <a style={{display:"block",textAlign:"center",marginTop:8,fontSize:12,color:"var(--brand-500)",fontWeight:500,cursor:"pointer"}}>Open full screen</a>
        </Card>

        {/* quick stats */}
        {!isExternal && (
          <Card>
            <Eyebrow>Assessment status</Eyebrow>
            <window.AssessBadge s={member.assess.s} ago={member.assess.ago}/>
            <Btn onClick={()=>onSchedule(member)} style={{width:"100%",marginTop:12,justifyContent:"center"}} size="sm">
              <i data-lucide="calendar-plus" style={{width:12,height:12}}/> Schedule assessment
            </Btn>
          </Card>
        )}
        {isExternal && (
          <Card>
            <Eyebrow>Application info</Eyebrow>
            {[
              {label:"Source",   value:member.source},
              {label:"Applied",  value:member.applied},
              {label:"Location", value:member.loc},
              {label:"Experience",value:member.exp},
              {label:"Attempts", value:`${member.attempts?.done || 0} / ${member.attempts?.total || 3} done`},
            ].map((it,i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:i===0?"0":"1px solid var(--slate-100)",fontSize:12}}>
                <span style={{color:"var(--slate-500)"}}>{it.label}</span>
                <span style={{color:"var(--slate-900)",fontWeight:500}}>{it.value}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
      <window.EditMemberModal open={editOpen} onClose={()=>setEditOpen(false)} member={member} isExternal={isExternal}/>
    </div>
  );
};

/* ── ANALYSIS TAB — full scores + JD match + integrity + AI strengths/gaps ── */
const ProfileAnalysis = ({member, isExternal}) => {
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  const {INTEGRITY} = window.V2;
  const scores = [
    {k:"Technical knowledge", v:4.6},
    {k:"Problem solving",     v:4.4},
    {k:"Communication",       v:4.7},
    {k:"System design",       v:3.8},
    {k:"Tech stack match",    v:4.3},
    {k:"Culture fit",         v:4.5},
  ];
  const jdMatch = 78, integrity = 94;
  const ring = (val, max, label, color) => {
    const pct = val/max, C=2*Math.PI*30;
    return (
      <div style={{textAlign:"center"}}>
        <div style={{position:"relative",width:84,height:84,margin:"0 auto"}}>
          <svg width="84" height="84" style={{transform:"rotate(-90deg)"}}>
            <circle cx="42" cy="42" r="30" stroke="var(--slate-100)" strokeWidth="7" fill="none"/>
            <circle cx="42" cy="42" r="30" stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={`${C*pct} ${C}`} style={{transition:"stroke-dasharray 600ms cubic-bezier(0.2,0,0,1)"}}/>
          </svg>
          <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display,'Inter')",fontSize:18,fontWeight:700,color:"var(--slate-900)"}}>{max===100?`${val}%`:val.toFixed(1)}</span>
        </div>
        <div style={{fontSize:12,color:"var(--slate-500)",marginTop:6}}>{label}</div>
      </div>
    );
  };
  const overall = (scores.reduce((a,b)=>a+b.v,0)/scores.length).toFixed(1);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {ring(+overall,5,"Overall score","var(--brand-500)")}
          {ring(jdMatch,100,"JD match","var(--success-500)")}
          {ring(integrity,100,"Integrity score","var(--info-500)")}
        </div>
      </Card>
      <Card>
        <Eyebrow>Competency breakdown</Eyebrow>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:14}}>
          {scores.map((s,i)=>(
            <div key={i}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:13,color:"var(--slate-700)",fontWeight:500}}>{s.k}</span>
                <span style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:s.v>=4?"var(--success-600)":s.v>=3?"var(--warning-600)":"var(--danger-700)"}}>{s.v.toFixed(1)}</span>
              </div>
              <div style={{height:6,background:"var(--slate-100)",borderRadius:9999,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(s.v/5)*100}%`,background:"var(--brand-500)",borderRadius:9999,transition:"width 600ms cubic-bezier(0.2,0,0,1)"}}/>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <i data-lucide="thumbs-up" style={{width:15,height:15,color:"var(--success-600)"}}/>
            <span style={{fontSize:13,fontWeight:700,color:"var(--slate-900)"}}>Strengths</span>
          </div>
          {["Strong .NET fundamentals; clear on idempotency tradeoffs.","Quantified decisions (200 writes/sec peak).","Excellent communicator — structured answers."].map((t,i)=>(
            <div key={i} style={{display:"flex",gap:8,fontSize:13,color:"var(--slate-700)",lineHeight:1.5,padding:"7px 0",borderTop:i?"1px solid var(--slate-100)":"0"}}>
              <i data-lucide="check" style={{width:14,height:14,color:"var(--success-500)",flexShrink:0,marginTop:2}}/>{t}
            </div>
          ))}
        </Card>
        <Card>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <i data-lucide="alert-triangle" style={{width:15,height:15,color:"var(--warning-600)"}}/>
            <span style={{fontSize:13,fontWeight:700,color:"var(--slate-900)"}}>Gaps to probe</span>
          </div>
          {["Limited Azure depth — couldn't explain cold-start.","System decomposition was vague at scale.","No hands-on Kubernetes experience mentioned."].map((t,i)=>(
            <div key={i} style={{display:"flex",gap:8,fontSize:13,color:"var(--slate-700)",lineHeight:1.5,padding:"7px 0",borderTop:i?"1px solid var(--slate-100)":"0"}}>
              <i data-lucide="arrow-right" style={{width:14,height:14,color:"var(--warning-500)",flexShrink:0,marginTop:2}}/>{t}
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <Eyebrow>Proctoring &amp; integrity</Eyebrow>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:14}}>
          {[
            {label:"Tab switches", value:INTEGRITY.tabSwitches, good:INTEGRITY.tabSwitches===0},
            {label:"Look-aways",   value:INTEGRITY.lookAways,   good:INTEGRITY.lookAways<=2},
            {label:"Face coverage",value:`${INTEGRITY.faceCoverage}%`, good:INTEGRITY.faceCoverage>=90},
            {label:"Fullscreen",   value:`${INTEGRITY.fullscreen}%`,   good:INTEGRITY.fullscreen>=95},
          ].map((s,i)=>(
            <div key={i} style={{textAlign:"center",padding:"12px 8px",background:"var(--slate-50)",borderRadius:8}}>
              <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:20,fontWeight:700,color:s.good?"var(--success-600)":"var(--warning-600)"}}>{s.value}</div>
              <div style={{fontSize:11,color:"var(--slate-500)",marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const ProfileOverview = ({member, isExternal}) => (
  <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <Card>
      <Eyebrow>Performance summary</Eyebrow>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:14}}>
        {(isExternal ? [
          {label:"Exam score",    value:"78%"},
          {label:"AI screen",     value:"4.4 / 5"},
          {label:"Attempts done", value:"1 / 3"},
          {label:"Days in pipeline",value:"3"},
        ] : [
          {label:"Last score",    value:"4.2 / 5"},
          {label:"Assessments",   value:"8 total"},
          {label:"Best score",    value:"4.6"},
          {label:"Days overdue",  value:"—"},
        ]).map((s,i) => (
          <div key={i} style={{textAlign:"center",padding:"12px 8px",background:"var(--slate-50)",borderRadius:8}}>
            <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:22,fontWeight:700,color:"var(--slate-900)",letterSpacing:"-0.015em"}}>{s.value}</div>
            <div style={{fontSize:11,color:"var(--slate-500)",marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
    {isExternal && (
      <Card>
        <Eyebrow>AI highlights</Eyebrow>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
          {[
            {icon:"thumbs-up",   tone:"success", text:"Strong .NET fundamentals; explained idempotency tradeoffs with confidence."},
            {icon:"thumbs-up",   tone:"success", text:"Communicated decisions with concrete numbers (200 writes/sec)."},
            {icon:"alert-triangle",tone:"warning",text:"Limited Azure exposure — may need ramp-up on cloud-native patterns."},
            {icon:"info",        tone:"info",   text:"Notice period: 60 days. Open to hybrid arrangement."},
          ].map((h,i) => (
            <div key={i} style={{display:"flex",gap:10,padding:12,background:h.tone==="success"?"var(--success-50)":h.tone==="warning"?"var(--warning-50)":"var(--info-50)",borderRadius:8}}>
              <i data-lucide={h.icon} style={{width:15,height:15,color:h.tone==="success"?"var(--success-600)":h.tone==="warning"?"var(--warning-600)":"var(--info-600)",flexShrink:0,marginTop:2}}/>
              <span style={{fontSize:13,color:"var(--slate-900)",lineHeight:1.55}}>{h.text}</span>
            </div>
          ))}
        </div>
      </Card>
    )}
  </div>
);

const ProfileHistory = ({history}) => (
  <Card>
    <div style={{position:"relative",paddingLeft:28}}>
      <div style={{position:"absolute",left:13,top:6,bottom:6,width:2,background:"var(--slate-200)",borderRadius:9999}}/>
      {history.map((h,i) => {
        const toneColor = {success:"var(--success-500)",warning:"var(--warning-500)",danger:"#EF4444",info:"var(--info-500)",brand:"var(--brand-500)",neutral:"var(--slate-400)"};
        const toneBg    = {success:"var(--success-50)",warning:"var(--warning-50)",danger:"#FEF2F2",info:"var(--info-50)",brand:"var(--brand-50)",neutral:"var(--slate-100)"};
        return (
          <div key={i} style={{position:"relative",paddingBottom:18}}>
            <span style={{
              position:"absolute",left:-28,top:4,
              width:26,height:26,borderRadius:9999,
              background:h.done?toneBg[h.tone]:"var(--bg-surface)",
              border:h.current?"2px solid var(--brand-500)":h.done?"0":"1px solid var(--slate-200)",
              color:toneColor[h.tone],
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              boxShadow:h.current?"0 0 0 4px rgba(91,79,233,0.12)":"none",
            }}>
              <i data-lucide={h.icon} style={{width:13,height:13}}/>
            </span>
            <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:h.done||h.current?"var(--slate-900)":"var(--slate-400)"}}>{h.type}</div>
                <div style={{fontSize:12,color:"var(--slate-500)",marginTop:1}}>{h.date} · {h.status}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {h.done && <a style={{fontSize:12,color:"var(--brand-500)",fontWeight:500,cursor:"pointer"}}>View report</a>}
                {h.current && <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:9999,background:"var(--brand-50)",color:"var(--brand-500)"}}>Current</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </Card>
);

const ProfileTranscript = () => {
  const {TRANSCRIPT} = window.V2;
  return (
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <Eyebrow>AI voice screen transcript</Eyebrow>
        <Btn size="sm" variant="secondary"><i data-lucide="play" style={{width:12,height:12}}/> Play recording</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {TRANSCRIPT.map((t,i) => (
          <div key={i} style={{display:"flex",gap:12}}>
            <span style={{fontFamily:"monospace",fontSize:11,color:"var(--slate-400)",width:38,flexShrink:0,paddingTop:3}}>{t.t}</span>
            {t.who==="ai" ? (
              <div style={{width:28,height:28,borderRadius:9999,background:"var(--brand-50)",color:"var(--brand-500)",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <i data-lucide="sparkles" style={{width:13,height:13}}/>
              </div>
            ) : <window.V2Av name="Rahul Sharma" size={28}/>}
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:t.who==="ai"?"var(--brand-500)":"var(--slate-900)",marginBottom:2}}>{t.who==="ai"?"Screeno AI":"Candidate"}</div>
              <div style={{fontSize:13,color:"var(--slate-700)",lineHeight:1.6}}>{t.text}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const ProfileScorecard = () => (
  <Card>
    <Eyebrow>Scorecards</Eyebrow>
    {[
      {who:"Anand Raman",  round:"Tech Round 1", when:"Yesterday",   score:4.3},
      {who:"Screeno AI",   round:"AI Screen",     when:"2 days ago",  score:4.4},
    ].map((s,i) => (
      <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderTop:i===0?"0":"1px solid var(--slate-100)"}}>
        <window.V2Av name={s.who} size={36}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--slate-900)"}}>{s.who}</div>
          <div style={{fontSize:12,color:"var(--slate-500)"}}>{s.round} · {s.when}</div>
        </div>
        <span style={{fontFamily:"monospace",fontWeight:700,color:"var(--success-600)",fontSize:14}}>{s.score}</span>
        <Btn size="sm" variant="secondary">View</Btn>
      </div>
    ))}
  </Card>
);

const ProfileNotes = ({member}) => {
  const [note,setNote] = React.useState("");
  return (
    <Card>
      <div style={{padding:"14px 0",marginBottom:14,paddingLeft:16,borderLeft:"3px solid var(--brand-500)",background:"#FAFAFE",borderRadius:"0 8px 8px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <window.V2Av name="Kiran Patel" size={22}/>
          <span style={{fontSize:12,fontWeight:600,color:"var(--slate-900)"}}>Kiran Patel</span>
          <span style={{fontSize:11,color:"var(--slate-400)"}}>· 2 days ago</span>
        </div>
        <div style={{fontSize:13,color:"var(--slate-700)",lineHeight:1.6,paddingLeft:30}}>Strong candidate referred internally. Fast learner, good communication on AI round.</div>
      </div>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note for the hiring team…" rows={3}
        style={{width:"100%",padding:12,border:"1px solid var(--slate-300)",borderRadius:8,fontSize:13,fontFamily:"inherit",lineHeight:1.6,outline:"none",resize:"vertical"}}
        onFocus={e=>{e.target.style.borderColor="var(--brand-500)";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
        onBlur={e=>{e.target.style.borderColor="var(--slate-300)";e.target.style.boxShadow="none";}}
      />
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
        <Btn size="sm" disabled={!note.trim()}>Post note</Btn>
      </div>
    </Card>
  );
};

/* ══════════════════════════════════════════
   CALENDAR
══════════════════════════════════════════ */
const ManagerCalendarScreen = ({onSchedule}) => {
  const {SCHEDULE} = window.V2;
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  const days = [{d:"Mon",n:26},{d:"Tue",n:27},{d:"Wed",n:28},{d:"Thu",n:29},{d:"Fri",n:30}];
  const hours = [9,10,11,12,13,14,15,16,17];
  const H=60;
  const typeStyle = {
    ai:    {bg:"var(--warning-50)",border:"var(--warning-500)",color:"var(--warning-700)"},
    human: {bg:"var(--brand-50)",border:"var(--brand-500)",color:"var(--brand-700)"},
    exam:  {bg:"var(--info-50)",border:"var(--info-500)",color:"var(--info-600)"},
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <h2 style={{fontFamily:"var(--font-display,'Inter')",fontSize:22,fontWeight:700,color:"var(--slate-900)",margin:0,letterSpacing:"-0.015em"}}>May 26 – 30, 2026</h2>
          <div style={{display:"inline-flex",gap:2,background:"var(--slate-100)",padding:3,borderRadius:8,border:"1px solid var(--slate-200)"}}>
            {["‹","Today","›"].map((l,i)=>(
              <button key={i} style={{padding:"5px 10px",borderRadius:6,border:0,background:l==="Today"?"var(--bg-surface)":"transparent",fontSize:12,fontWeight:500,color:"var(--slate-700)",cursor:"pointer"}}>{l}</button>
            ))}
          </div>
        </div>
        <Btn onClick={onSchedule}><i data-lucide="calendar-plus" style={{width:13,height:13}}/> Schedule interview</Btn>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:18,fontSize:12,color:"var(--slate-500)"}}>
        {[{t:"AI screen",type:"ai"},{t:"Live interview",type:"human"},{t:"Coding exam",type:"exam"}].map(l=>(
          <span key={l.t} style={{display:"inline-flex",alignItems:"center",gap:6}}>
            <span style={{width:10,height:10,borderRadius:3,background:typeStyle[l.type].bg,border:`1px solid ${typeStyle[l.type].border}`}}/>
            {l.t}
          </span>
        ))}
      </div>

      {/* Calendar */}
      <div style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
        <div style={{display:"grid",gridTemplateColumns:"56px repeat(5,1fr)",borderBottom:"1px solid var(--slate-200)",background:"var(--bg-surface)"}}>
          <div/>
          {days.map((d,i) => (
            <div key={i} style={{padding:"12px 8px",textAlign:"center",borderLeft:"1px solid var(--slate-100)"}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--slate-400)"}}>{d.d}</div>
              <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:22,fontWeight:700,color:i===1?"var(--brand-500)":"var(--slate-900)",marginTop:2}}>{d.n}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"56px repeat(5,1fr)"}}>
          <div>
            {hours.map(h=>(
              <div key={h} style={{height:H,borderBottom:"1px solid var(--slate-100)",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:"4px 8px 0",fontSize:11,color:"var(--slate-400)",fontFamily:"monospace",fontVariantNumeric:"tabular-nums"}}>
                {h<=12?`${h}:00`:`${h-12}:00`}{h<12?" AM":" PM"}
              </div>
            ))}
          </div>
          {days.map((d,di) => (
            <div key={di} style={{position:"relative",borderLeft:"1px solid var(--slate-100)"}}>
              {hours.map(h=><div key={h} style={{height:H,borderBottom:"1px solid var(--slate-100)"}}/>)}
              {di===1 && (
                <div style={{position:"absolute",left:0,right:0,top:(14.5-9)*H,height:1,background:"var(--danger-500)",zIndex:3}}>
                  <span style={{position:"absolute",left:-5,top:-5,width:10,height:10,borderRadius:9999,background:"var(--danger-500)"}}/>
                </div>
              )}
              {SCHEDULE.filter(e=>e.day===di).map((ev,ei) => {
                const ts = typeStyle[ev.type];
                return (
                  <div key={ei} style={{
                    position:"absolute",left:4,right:4,
                    top:(ev.start-9)*H+2,height:ev.dur*H-4,
                    background:ts.bg,borderLeft:`3px solid ${ts.border}`,
                    borderRadius:6,padding:"5px 8px",cursor:"pointer",
                    overflow:"hidden",transition:"box-shadow 120ms",
                  }}>
                    <div style={{fontSize:12,fontWeight:600,color:ts.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</div>
                    {ev.dur>=0.8 && <div style={{fontSize:11,color:ts.color,opacity:0.8}}>{ev.sub}</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   REPORTS SCREEN
══════════════════════════════════════════ */
const ReportsScreen = ({onViewReport}) => {
  const {REPORTS} = window.V2;
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div>
        <Eyebrow>MANAGER · REPORTS</Eyebrow>
        <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:26,fontWeight:700,color:"var(--slate-900)",margin:"6px 0",letterSpacing:"-0.02em"}}>Reports</h1>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {[
          {label:"Total interviews",  value:"31",  sub:"This quarter"},
          {label:"Pass rate",         value:"67%", sub:"21 of 31"},
          {label:"Avg score",         value:"3.9", sub:"↑ 0.2 vs last month"},
          {label:"Reports pending",   value:"2",   sub:"Send after attempt"},
        ].map((s,i) => (
          <Card key={i} style={{padding:16}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--slate-500)"}}>{s.label}</div>
            <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:26,fontWeight:700,color:"var(--slate-900)",letterSpacing:"-0.02em",lineHeight:1.1,marginTop:4}}>{s.value}</div>
            <div style={{fontSize:12,color:"var(--success-500)",fontWeight:500,marginTop:2}}>{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Report list */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--slate-100)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:"var(--slate-900)"}}>Candidate reports</div>
          <div style={{display:"flex",gap:8}}>
            <Btn size="sm" variant="secondary"><i data-lucide="filter" style={{width:12,height:12}}/> Filter</Btn>
            <Btn size="sm" variant="secondary"><i data-lucide="download" style={{width:12,height:12}}/> Export all</Btn>
          </div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"var(--slate-50)"}}>
              {["CANDIDATE","ROLE","ATTEMPTS","DATE","OVERALL","JD MATCH","DECISION",""].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"11px 16px",fontSize:11,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:"var(--slate-400)",borderBottom:"1px solid var(--slate-200)"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REPORTS.map((r,i) => {
              const dec = {pass:{label:"Pass",bg:"var(--success-50)",fg:"var(--success-600)"},maybe:{label:"Maybe",bg:"var(--warning-50)",fg:"var(--warning-600)"},pending:{label:"Pending",bg:"var(--slate-100)",fg:"var(--slate-500)"}};
              const d = dec[r.decision] || dec.pending;
              return (
                <tr key={r.id} onClick={()=>onViewReport(r)} style={{cursor:"pointer",transition:"background 120ms"}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--slate-50)"}
                  onMouseLeave={e=>e.currentTarget.style.background="var(--bg-surface)"}>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <window.V2Av name={r.name} size={32}/>
                      <div style={{fontWeight:600,color:"var(--slate-900)"}}>{r.name}</div>
                    </div>
                  </td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)",color:"var(--slate-500)"}}>{r.role}</td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)",fontFamily:"monospace",fontWeight:600,color:"var(--slate-900)"}}>{r.attempts}</td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)",color:"var(--slate-500)"}}>{r.date}</td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontFamily:"monospace",fontWeight:700,color:r.overall>=4?"var(--success-600)":r.overall>=3?"var(--warning-600)":"var(--danger-700)"}}>{r.overall.toFixed(1)}</span>
                      <span style={{flex:1,height:4,background:"var(--slate-100)",borderRadius:9999,overflow:"hidden",display:"inline-block",width:48}}>
                        <span style={{display:"block",height:"100%",width:`${(r.overall/5)*100}%`,background:"var(--brand-500)",borderRadius:9999}}/>
                      </span>
                    </div>
                  </td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>
                    <span style={{fontFamily:"monospace",fontWeight:700,color:r.jdMatch>=75?"var(--success-600)":r.jdMatch>=60?"var(--warning-600)":"var(--danger-700)"}}>{r.jdMatch}%</span>
                  </td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>
                    <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:9999,background:d.bg,color:d.fg}}>{d.label}</span>
                  </td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>
                    <Btn size="sm" variant="secondary">View report</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

/* ══════════════════════════════════════════
   EDIT MEMBER / CANDIDATE MODAL (CRUD)
══════════════════════════════════════════ */
const EditMemberModal = ({open, onClose, member, isExternal}) => {
  const store = window.useV2Store();
  const [form, setForm] = React.useState({});
  const [skillStr, setSkillStr] = React.useState("");
  React.useEffect(()=>{
    if(open && member){
      setForm({name:member.name||"", role:member.role||"", email:member.email||"", phone:member.phone||"", loc:member.loc||"", exp:member.exp||""});
      setSkillStr((member.skills||[]).join(", "));
      window.lucide?.createIcons();
    }
  },[open,member]);
  if(!open||!member) return null;
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=()=>{
    store.update(s=>{
      const list = isExternal ? s.external : s.team;
      const rec = list.find(x=>x.id===member.id);
      if(rec){
        Object.assign(rec, {name:form.name, role:form.role, email:form.email, phone:form.phone, loc:form.loc, exp:form.exp});
        rec.skills = skillStr.split(",").map(t=>t.trim()).filter(Boolean);
      }
    });
    onClose();
  };
  const del=()=>{
    if(!window.confirm(`Remove ${member.name}? This cannot be undone.`)) return;
    store.update(s=>{ if(isExternal) s.external=s.external.filter(x=>x.id!==member.id); else s.team=s.team.filter(x=>x.id!==member.id); });
    onClose();
  };
  const fields=[
    {k:"name",label:"Full name"},{k:"role",label:"Role"},{k:"email",label:"Email"},
    {k:"phone",label:"Phone"},{k:"loc",label:"Location"},{k:"exp",label:"Experience"},
  ];
  return (
    <window.V2Modal open={open} onClose={onClose} width={520}>
      <div style={{padding:"20px 24px",borderBottom:"1px solid var(--slate-100)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:16,fontWeight:700,color:"var(--slate-900)"}}>Edit {isExternal?"candidate":"team member"}</div>
        <button onClick={onClose} style={{background:"transparent",border:0,cursor:"pointer",color:"var(--slate-500)",padding:6}}><i data-lucide="x" style={{width:18,height:18}}/></button>
      </div>
      <div style={{padding:24,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {fields.map(f=>(
          <div key={f.k}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--slate-700)",marginBottom:5}}>{f.label}</label>
            <input value={form[f.k]||""} onChange={e=>set(f.k,e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1px solid var(--slate-300)",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}
              onFocus={e=>{e.target.style.borderColor="var(--brand-500)";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
              onBlur={e=>{e.target.style.borderColor="var(--slate-300)";e.target.style.boxShadow="none";}}/>
          </div>
        ))}
        <div style={{gridColumn:"1 / -1"}}>
          <label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--slate-700)",marginBottom:5}}>Skills <span style={{color:"var(--slate-400)",fontWeight:400}}>(comma separated)</span></label>
          <input value={skillStr} onChange={e=>setSkillStr(e.target.value)} placeholder=".NET, C#, Azure" style={{width:"100%",padding:"9px 12px",border:"1px solid var(--slate-300)",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}
            onFocus={e=>{e.target.style.borderColor="var(--brand-500)";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
            onBlur={e=>{e.target.style.borderColor="var(--slate-300)";e.target.style.boxShadow="none";}}/>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,padding:"14px 24px",borderTop:"1px solid var(--slate-100)"}}>
        <Btn variant="danger" onClick={del}><i data-lucide="trash-2" style={{width:13,height:13}}/> Remove</Btn>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={!form.name?.trim()}>Save changes</Btn>
        </div>
      </div>
    </window.V2Modal>
  );
};

/* ══════════════════════════════════════════
   MANAGER PROFILE + SETTINGS (self edit)
══════════════════════════════════════════ */
const ManagerProfileScreen = ({onBack}) => {
  const store = window.useV2Store();
  const p = store.get().manager;
  const settings = store.get().settings;
  const [form, setForm] = React.useState({...p});
  const [tab, setTab] = React.useState("profile");
  const [saved, setSaved] = React.useState(false);
  React.useEffect(()=>{window.lucide?.createIcons();},[tab,saved]);
  const set=(k,v)=>{setForm(f=>({...f,[k]:v}));setSaved(false);};
  const save=()=>{ store.update(s=>{Object.assign(s.manager, form);}); setSaved(true); };
  const toggle=(k)=>store.update(s=>{s.settings[k]=!s.settings[k];});
  const fields=[
    {k:"name",label:"Full name"},{k:"title",label:"Job title"},{k:"email",label:"Email"},
    {k:"phone",label:"Phone"},{k:"department",label:"Department"},{k:"team",label:"Team"},
    {k:"loc",label:"Location"},{k:"timezone",label:"Timezone"},
  ];
  return (
    <div style={{maxWidth:760,animation:"v2fade 280ms"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:0,color:"var(--brand-500)",fontWeight:500,fontSize:13,cursor:"pointer",marginBottom:20}}>
        <i data-lucide="arrow-left" style={{width:16,height:16}}/>Back
      </button>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
        <window.V2Av name={form.name||"K"} size={64} ring="var(--brand-100)"/>
        <div>
          <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:24,fontWeight:700,color:"var(--slate-900)",margin:0,letterSpacing:"-0.02em"}}>{form.name}</h1>
          <p style={{fontSize:13,color:"var(--slate-500)",marginTop:3}}>{form.title} · {form.department}</p>
        </div>
      </div>
      <div style={{display:"flex",gap:4,borderBottom:"1px solid var(--slate-200)",marginBottom:20}}>
        {[{id:"profile",label:"Profile"},{id:"settings",label:"Account settings"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"transparent",border:0,padding:"10px 14px",fontSize:13,fontWeight:tab===t.id?600:500,color:tab===t.id?"var(--brand-700)":"var(--slate-500)",borderBottom:tab===t.id?"2px solid var(--brand-500)":"2px solid transparent",marginBottom:-1,cursor:"pointer",fontFamily:"inherit"}}>{t.label}</button>
        ))}
      </div>
      {tab==="profile" && (
        <Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {fields.map(f=>(
              <div key={f.k}>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--slate-700)",marginBottom:5}}>{f.label}</label>
                <input value={form[f.k]||""} onChange={e=>set(f.k,e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1px solid var(--slate-300)",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}
                  onFocus={e=>{e.target.style.borderColor="var(--brand-500)";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
                  onBlur={e=>{e.target.style.borderColor="var(--slate-300)";e.target.style.boxShadow="none";}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:18}}>
            <Btn onClick={save}>Save changes</Btn>
            {saved && <span style={{fontSize:13,color:"var(--success-600)",display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="check-circle-2" style={{width:14,height:14}}/>Profile saved</span>}
          </div>
        </Card>
      )}
      {tab==="settings" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card>
            <Eyebrow>Notifications</Eyebrow>
            <div style={{marginTop:8}}>
              {[
                {k:"notifyEmail",label:"Email notifications",desc:"Pipeline updates and weekly digests"},
                {k:"notifyInApp",label:"In-app notifications",desc:"Show the bell badge for new activity"},
                {k:"notifyResults",label:"Report ready alerts",desc:"Notify me when an AI report is generated"},
                {k:"notifyReminders",label:"Scorecard reminders",desc:"Nudge me about overdue scorecards"},
              ].map((o,i)=>(
                <div key={o.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderTop:i?"1px solid var(--slate-100)":"0"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--slate-900)"}}>{o.label}</div>
                    <div style={{fontSize:12,color:"var(--slate-500)",marginTop:1}}>{o.desc}</div>
                  </div>
                  <window.V2Toggle on={settings[o.k]} onClick={()=>toggle(o.k)}/>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <Eyebrow>Security</Eyebrow>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--slate-900)"}}>Two-factor authentication</div>
                <div style={{fontSize:12,color:"var(--slate-500)",marginTop:1}}>Require a code at sign-in</div>
              </div>
              <window.V2Toggle on={settings.twoFactor} onClick={()=>toggle("twoFactor")}/>
            </div>
            <div style={{paddingTop:12,borderTop:"1px solid var(--slate-100)"}}>
              <Btn variant="secondary"><i data-lucide="key-round" style={{width:13,height:13}}/> Change password</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   COMPARE MODAL — compares 2 selected members
══════════════════════════════════════════ */
const CompareModal = ({open, onClose, members=[]}) => {
  React.useEffect(()=>{window.lucide?.createIcons();},[open,members]);
  if(!open || members.length<2) return null;
  const hash = s => { let h=0; for(let i=0;i<(s||"").length;i++) h=((h<<5)-h+s.charCodeAt(i))|0; return Math.abs(h); };
  const derive = (m) => {
    const seed = hash(m.name);
    const r = (off,lo,hi) => +(lo + ((seed>>off)%100)/100*(hi-lo)).toFixed(1);
    return {
      overall:r(2,3.4,4.8), knowledge:r(5,3.3,4.9), communication:r(8,3.5,4.9),
      problemSolving:r(11,3.2,4.8), techStack:r(14,3.4,4.7), cultureFit:r(17,3.6,4.8),
      jdMatch:Math.round(58+ (seed%42)), integrity:Math.round(82+(seed%17)),
    };
  };
  const METRICS = [
    {key:"overall",label:"Overall score",max:5},
    {key:"knowledge",label:"Technical knowledge",max:5},
    {key:"communication",label:"Communication",max:5},
    {key:"problemSolving",label:"Problem solving",max:5},
    {key:"techStack",label:"Tech stack match",max:5},
    {key:"cultureFit",label:"Culture fit",max:5},
    {key:"jdMatch",label:"JD match",max:100},
    {key:"integrity",label:"Integrity score",max:100},
  ];
  const [a,b] = members;
  const sa = derive(a), sb = derive(b);
  const fmt = (v,max)=>max===100?`${v}%`:v.toFixed(1);
  const bar = (v,max,win) => (
    <div style={{flex:1,height:6,background:"var(--slate-100)",borderRadius:9999,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${(v/max)*100}%`,background:win?"var(--brand-500)":"var(--slate-300)",borderRadius:9999,transition:"width 600ms cubic-bezier(0.2,0,0,1)"}}/>
    </div>
  );
  const aWins = METRICS.filter(m=>sa[m.key]>sb[m.key]).length;
  const bWins = METRICS.filter(m=>sb[m.key]>sa[m.key]).length;
  return (
    <window.V2Modal open={open} onClose={onClose} width={720}>
      <div style={{padding:"20px 24px",borderBottom:"1px solid var(--slate-100)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:"var(--slate-900)"}}>Compare candidates</div>
          <div style={{fontSize:12,color:"var(--slate-500)",marginTop:2}}>Side-by-side across all evaluation metrics</div>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:0,cursor:"pointer",color:"var(--slate-500)",padding:6}}><i data-lucide="x" style={{width:18,height:18}}/></button>
      </div>
      <div style={{padding:24}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          {[{m:a,w:aWins},{m:b,w:bWins}].map(({m,w},i)=>(
            <div key={i} style={{background:"var(--bg-surface)",border:`1px solid ${ (i===0?aWins:bWins) >= (i===0?bWins:aWins) ? "var(--brand-100)":"var(--slate-200)"}`,borderRadius:12,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <window.V2Av name={m.name} size={42}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--slate-900)"}}>{m.name}</div>
                  <div style={{fontSize:12,color:"var(--slate-500)"}}>{m.role}</div>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:9999,background:w>=METRICS.length/2?"var(--success-50)":"var(--slate-100)",color:w>=METRICS.length/2?"var(--success-600)":"var(--slate-500)"}}>{w} wins</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {(m.skills||[]).map(s=><window.SkillTag key={s} label={s}/>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{border:"1px solid var(--slate-200)",borderRadius:12,overflow:"hidden"}}>
          {METRICS.map((mt,i)=>{
            const va=sa[mt.key], vb=sb[mt.key];
            return (
              <div key={mt.key} style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr",alignItems:"center",padding:"11px 16px",borderTop:i?"1px solid var(--slate-100)":"0",fontSize:13}}>
                <span style={{color:"var(--slate-700)",fontWeight:500}}>{mt.label}</span>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 14px 0 0"}}>
                  {bar(va,mt.max,va>=vb)}
                  <span style={{fontFamily:"monospace",fontWeight:700,minWidth:38,color:va>vb?"var(--brand-500)":"var(--slate-700)"}}>{fmt(va,mt.max)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {bar(vb,mt.max,vb>=va)}
                  <span style={{fontFamily:"monospace",fontWeight:700,minWidth:38,color:vb>va?"var(--brand-500)":"var(--slate-700)"}}>{fmt(vb,mt.max)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </window.V2Modal>
  );
};

/* ══════════════════════════════════════════
   JOB CANDIDATES — external applicants for a role (full profiles + compare)
══════════════════════════════════════════ */
const JobCandidatesScreen = ({job, onNavigate, onBack, onSchedule}) => {
  const store = window.useV2Store();
  const all = store.get().external;
  const [selected, setSelected] = React.useState(new Set());
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [stage, setStage] = React.useState("all");
  React.useEffect(()=>{window.lucide?.createIcons();},[selected.size,compareOpen,stage]);
  const STAGES = {
    applied:{bg:"var(--slate-100)",fg:"#475569",label:"Applied"},
    screening:{bg:"var(--info-50)",fg:"var(--info-600)",label:"Screening"},
    interview:{bg:"var(--brand-50)",fg:"var(--brand-500)",label:"Interview"},
    offer:{bg:"var(--success-50)",fg:"var(--success-600)",label:"Offer"},
    rejected:{bg:"#FEF2F2",fg:"var(--danger-700)",label:"Rejected"},
  };
  const rows = stage==="all" ? all : all.filter(c=>c.stage===stage);
  const toggle = id => setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:0,color:"var(--brand-500)",fontWeight:500,fontSize:13,cursor:"pointer"}}>
        <i data-lucide="arrow-left" style={{width:16,height:16}}/>Back to Team Overview
      </button>
      <div>
        <Eyebrow>MANAGER · PIPELINE</Eyebrow>
        <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:24,fontWeight:700,color:"var(--slate-900)",margin:"6px 0 4px",letterSpacing:"-0.02em"}}>{job?.title||"Candidates"}</h1>
        <p style={{color:"var(--slate-500)",fontSize:13,margin:0}}>{rows.length} candidates · click anyone to open their full profile and analysis. Select 2+ to compare.</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[["all","All"],["applied","Applied"],["screening","Screening"],["interview","Interview"],["offer","Offer"]].map(([id,l])=>(
          <button key={id} onClick={()=>setStage(id)} style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${stage===id?"var(--brand-500)":"var(--slate-200)"}`,background:"var(--bg-surface)",color:stage===id?"var(--brand-500)":"var(--slate-700)",fontWeight:stage===id?600:500,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
        ))}
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"var(--slate-50)"}}>
              <th style={{padding:"12px 16px",width:36}}></th>
              {["CANDIDATE","STAGE","SCORE","SOURCE","NEXT STEP","ACTIONS"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"12px 16px",fontSize:11,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:"var(--slate-400)",borderBottom:"1px solid var(--slate-200)"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(c=>{
              const st=STAGES[c.stage]||STAGES.applied;
              return (
                <tr key={c.id} onClick={()=>onNavigate("member-profile",{...c,isExternal:true})} style={{cursor:"pointer",background:selected.has(c.id)?"#F3F0FF":"var(--bg-surface)"}}
                  onMouseEnter={e=>{if(!selected.has(c.id))e.currentTarget.style.background="var(--slate-50)";}}
                  onMouseLeave={e=>{if(!selected.has(c.id))e.currentTarget.style.background="var(--bg-surface)";}}>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}} onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={()=>toggle(c.id)} style={{accentColor:"var(--brand-500)",cursor:"pointer"}}/>
                  </td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <window.V2Av name={c.name} size={36}/>
                      <div><div style={{fontWeight:600,color:"var(--slate-900)"}}>{c.name}</div><div style={{fontSize:12,color:"var(--slate-500)",marginTop:1}}>{c.role}</div></div>
                    </div>
                  </td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}><span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:9999,background:st.bg,color:st.fg}}>{st.label}</span></td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}}>{c.score!=null?<span style={{fontFamily:"monospace",fontWeight:700,color:c.score>=4?"var(--success-600)":"var(--warning-600)"}}>{c.score.toFixed(1)}</span>:<span style={{color:"var(--slate-400)"}}>—</span>}</td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)",color:"var(--slate-500)"}}>{c.source}</td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)",color:"var(--brand-500)",fontSize:12}}>{c.next}</td>
                  <td style={{padding:"14px 16px",borderBottom:"1px solid var(--slate-100)"}} onClick={e=>e.stopPropagation()}>
                    <Btn size="sm" variant="secondary" onClick={()=>onSchedule(c)}><i data-lucide="calendar-plus" style={{width:12,height:12}}/> Schedule</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {selected.size>0 && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"var(--slate-900)",color:"var(--bg-surface)",borderRadius:14,padding:"10px 14px",display:"inline-flex",alignItems:"center",gap:14,boxShadow:"0 16px 40px rgba(15,23,42,0.32)",zIndex:30,animation:"v2slide 240ms cubic-bezier(0.2,0,0,1)"}}>
          <span style={{fontSize:13,fontWeight:600}}>{selected.size} selected</span>
          {selected.size>=2 && <Btn size="sm" onClick={()=>setCompareOpen(true)} style={{background:"var(--brand-500)",color:"var(--bg-surface)",border:0}}><i data-lucide="git-compare" style={{width:12,height:12}}/> Compare {selected.size>2?"(first 2)":""}</Btn>}
          <button onClick={()=>setSelected(new Set())} style={{background:"transparent",border:0,color:"#64748B",cursor:"pointer",fontSize:13}}>Deselect</button>
        </div>
      )}
      <window.CompareModal open={compareOpen} onClose={()=>setCompareOpen(false)} members={all.filter(c=>selected.has(c.id)).slice(0,2)}/>
    </div>
  );
};

Object.assign(window, {
  Btn, Card, Eyebrow,
  TeamOverviewScreen, MyTeamScreen, MemberProfileScreen,
  ManagerCalendarScreen, ReportsScreen,
  ProfileAnalysis, EditMemberModal, ManagerProfileScreen, CompareModal, JobCandidatesScreen,
});
