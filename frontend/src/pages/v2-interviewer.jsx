/* Screeno v2 — Interviewer screens */

/* ══════════════════════════════════════════
   INTERVIEWER DASHBOARD
══════════════════════════════════════════ */
const IVDashboard = ({onNavigate}) => {
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  const interviews = [
    {time:"10:30 AM",name:"Rahul Sharma", role:"Senior .NET Developer", stage:"Tech Round 1", minsAway:4,  state:"starting-soon"},
    {time:"2:00 PM", name:"Priya Patel",  role:"React Frontend Dev",    stage:"Tech Round 2", minsAway:240,state:"upcoming"},
    {time:"4:30 PM", name:"Ankit Verma",  role:"Full Stack Engineer",   stage:"Final Round",  minsAway:390,state:"upcoming"},
  ];
  const pending = [
    {name:"Divya Singh",   role:"React Frontend", round:"Tech Round 1",days:1},
    {name:"Karthik Reddy", role:"DevOps Engineer", round:"Tech Round 2",days:2},
  ];
  const week = [
    {d:"Mon",n:25,dots:1,today:false},{d:"Tue",n:26,dots:2,today:false},
    {d:"Wed",n:27,dots:3,today:true}, {d:"Thu",n:28,dots:2,today:false},
    {d:"Fri",n:29,dots:1,today:false},{d:"Sat",n:30,dots:0,today:false},
    {d:"Sun",n:31,dots:0,today:false},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {[
          {label:"INTERVIEWS THIS MONTH", value:"12", delta:"+3 vs last month",   spark:[6,8,7,9,11,10,12]},
          {label:"PASS RATE",             value:"67%",delta:"14 of 21 passed",    donut:true},
          {label:"AVG DECISION TIME",     value:"4.2 h",delta:"↓ 1.1 h vs last month",icon:"clock"},
        ].map((s,i)=>(
          <div key={i} style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:20,boxShadow:"0 1px 3px rgba(15,23,42,0.04)",display:"flex",flexDirection:"column",gap:4}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#94A3B8"}}>{s.label}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>
              <div>
                <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:30,fontWeight:700,color:"#0F172A",letterSpacing:"-0.02em",lineHeight:1}}>{s.value}</div>
                <div style={{fontSize:12,color:"#059669",fontWeight:500,marginTop:3}}>{s.delta}</div>
              </div>
              {s.spark && (
                <svg width="72" height="28" style={{display:"block"}}>
                  <polyline points={s.spark.map((v,j)=>`${j*(72/6)},${28-2-((v-6)/(12-6))*(28-4)}`).join(" ")} fill="none" stroke="#5B4FE9" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                  {(()=>{const lx=(s.spark.length-1)*(72/6);const ly=28-2-((s.spark[s.spark.length-1]-6)/(12-6))*(28-4);return <circle cx={lx} cy={ly} r="3" fill="#5B4FE9"/>;})()}
                </svg>
              )}
              {s.donut && (
                <div style={{position:"relative",width:52,height:52,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="52" height="52" style={{transform:"rotate(-90deg)"}}>
                    <circle cx="26" cy="26" r="21" stroke="#F1F5F9" strokeWidth="5" fill="none"/>
                    <circle cx="26" cy="26" r="21" stroke="#5B4FE9" strokeWidth="5" fill="none" strokeDasharray={`${2*Math.PI*21*0.67} ${2*Math.PI*21*0.33}`} strokeLinecap="round"/>
                  </svg>
                  <span style={{position:"absolute",fontFamily:"monospace",fontSize:11,fontWeight:700,color:"#0F172A"}}>67%</span>
                </div>
              )}
              {s.icon && <i data-lucide={s.icon} style={{width:18,height:18,color:"#94A3B8"}}/>}
            </div>
          </div>
        ))}
      </div>

      {/* Today */}
      <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:24,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontFamily:"var(--font-display,'Inter')",fontSize:16,fontWeight:700,color:"#0F172A"}}>Today — Thursday, 28 May</span>
            <span style={{fontSize:12,fontWeight:600,padding:"2px 8px",borderRadius:9999,background:"#EFEDFD",color:"#5B4FE9"}}>{interviews.length} interviews</span>
          </div>
          <a style={{fontSize:12,color:"#5B4FE9",fontWeight:500,cursor:"pointer"}}>View all</a>
        </div>
        {interviews.map((iv,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 0",borderTop:i===0?"0":"1px solid #F9FAFB"}}>
            <div style={{width:90,flexShrink:0}}>
              <div style={{fontSize:13,fontFamily:"monospace",fontWeight:700,color:"#0F172A"}}>{iv.time}</div>
              {iv.state==="starting-soon"&&<div style={{fontSize:11,color:"#059669",fontWeight:600,marginTop:2}}>in {iv.minsAway} min</div>}
            </div>
            <window.V2Av name={iv.name} size={40}/>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:"#0F172A"}}>{iv.name}</div>
              <div style={{fontSize:12,color:"#6B7280",marginTop:1}}>{iv.role}</div>
            </div>
            <span style={{fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:9999,background:"#EFEDFD",color:"#3A31A3"}}>{iv.stage}</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>onNavigate("iv-prep")} style={{padding:"7px 14px",borderRadius:8,background:"#FFF",border:"1px solid #CBD5E1",color:"#0F172A",fontWeight:600,fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}>
                <i data-lucide="book-open" style={{width:13,height:13}}/> Prep
              </button>
              <button onClick={()=>onNavigate("iv-liveroom")} disabled={iv.state!=="starting-soon"} style={{
                padding:"7px 16px",borderRadius:8,border:0,
                background:iv.state==="starting-soon"?"#059669":"#E2E8F0",
                color:iv.state==="starting-soon"?"#FFF":"#94A3B8",
                fontWeight:600,fontSize:13,cursor:iv.state==="starting-soon"?"pointer":"not-allowed",
                display:"inline-flex",alignItems:"center",gap:5,
                animation:iv.state==="starting-soon"?"v2joinpulse 1.8s ease-in-out infinite":"none",
              }}>
                <i data-lucide="video" style={{width:13,height:13}}/> Join
                {iv.state!=="starting-soon"&&<span style={{fontSize:11,opacity:0.7}}>· {Math.floor(iv.minsAway/60)}h away</span>}
              </button>
            </div>
          </div>
        ))}
        <style>{`@keyframes v2joinpulse{0%,100%{box-shadow:0 4px 12px rgba(5,150,105,0.25)}50%{box-shadow:0 4px 18px rgba(5,150,105,0.45)}}`}</style>
      </div>

      {/* Pending scorecards */}
      <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:24,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontFamily:"var(--font-display,'Inter')",fontSize:16,fontWeight:700,color:"#0F172A"}}>Pending scorecards</span>
          <span style={{fontSize:12,fontWeight:600,padding:"2px 8px",borderRadius:9999,background:"#FEF2F2",color:"#B53618",display:"inline-flex",alignItems:"center",gap:4}}>
            <i data-lucide="alert-circle" style={{width:12,height:12}}/> {pending.length} overdue
          </span>
        </div>
        {pending.map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 0",borderTop:i===0?"0":"1px solid #F9FAFB"}}>
            <window.V2Av name={p.name} size={36}/>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:"#0F172A"}}>{p.name}</div>
              <div style={{fontSize:12,color:"#6B7280"}}>{p.role} · {p.round}</div>
            </div>
            <span style={{fontSize:12,fontWeight:600,color:"#B45309"}}>Overdue by {p.days} day{p.days>1?"s":""}</span>
            <button onClick={()=>onNavigate("iv-scorecard")} style={{padding:"7px 14px",borderRadius:8,background:"#5B4FE9",color:"#FFF",border:0,fontWeight:600,fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}>
              <i data-lucide="check-square" style={{width:13,height:13}}/> Fill scorecard
            </button>
          </div>
        ))}
      </div>

      {/* This week mini calendar */}
      <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:24,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontFamily:"var(--font-display,'Inter')",fontSize:16,fontWeight:700,color:"#0F172A"}}>This week</span>
          <a style={{fontSize:12,color:"#5B4FE9",fontWeight:500,cursor:"pointer"}}>Open calendar</a>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
          {week.map((d,i)=>(
            <div key={i} style={{padding:"12px 4px",textAlign:"center",borderRadius:10,background:d.today?"#EFEDFD":"#F8FAFC",border:`1px solid ${d.today?"#5B4FE9":"#F1F5F9"}`}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:d.today?"#5B4FE9":"#94A3B8"}}>{d.d}</div>
              <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:20,fontWeight:700,color:d.today?"#5B4FE9":"#0F172A",marginTop:2}}>{d.n}</div>
              <div style={{display:"flex",justifyContent:"center",gap:3,marginTop:7,height:5}}>
                {[...Array(d.dots)].map((_,j)=><span key={j} style={{width:5,height:5,borderRadius:9999,background:d.today?"#5B4FE9":"#7B69ED"}}/>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   LIVE ROOM
══════════════════════════════════════════ */
const IVLiveRoom = ({onEnd}) => {
  const {QUESTIONS} = window.V2;
  const [muted,setMuted] = React.useState(false);
  const [camOn,setCamOn] = React.useState(true);
  const [panel,setPanel] = React.useState("scorecard"); // scorecard|questions|notes
  const [scores,setScores] = React.useState({tech:4,problem:3,comm:5,collab:4});
  const [notes,setNotes] = React.useState("Strong on idempotency tradeoffs. Ask about scaling reads — Postgres replica strategy.");
  const [elapsed,setElapsed] = React.useState(1132);
  React.useEffect(()=>{window.lucide?.createIcons();},[muted,camOn,panel]);
  React.useEffect(()=>{ const t=setInterval(()=>setElapsed(e=>e+1),1000); return ()=>clearInterval(t); },[]);
  const mm=String(Math.floor(elapsed/60)).padStart(2,"0");
  const ss=String(elapsed%60).padStart(2,"0");
  const rubric = [
    {id:"tech",    label:"Technical depth",    desc:"Language/runtime knowledge, system design."},
    {id:"problem", label:"Problem solving",     desc:"Decomposition, edge cases, debugging approach."},
    {id:"comm",    label:"Communication",       desc:"Clarity, signal-to-noise, active listening."},
    {id:"collab",  label:"Collaboration",       desc:"How they'd fit into the team day-to-day."},
  ];
  const overall = (Object.values(scores).reduce((a,b)=>a+b,0)/Object.keys(scores).length).toFixed(1);

  return (
    <div style={{minHeight:"calc(100vh - 76px)",background:"#0F172A",display:"flex",flexDirection:"column",color:"#E2E8F0"}}>
      {/* Top bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderBottom:"1px solid #1E293B",background:"#0F172A",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#5B4FE9,#4A3FCE)",position:"relative"}}>
            <div style={{position:"absolute",left:5,top:8,width:16,height:2.5,background:"#FFF",borderRadius:2,opacity:0.95}}/>
            <div style={{position:"absolute",left:5,top:14,width:16,height:2.5,background:"#FFF",borderRadius:2,opacity:0.6}}/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:"#FFF"}}>Round 2 · Rahul Sharma</div>
            <div style={{fontSize:11,color:"#94A3B8"}}>Senior .NET Developer · 60 min</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"#FF5C35",fontWeight:600,letterSpacing:"0.05em"}}>
            <span style={{width:6,height:6,borderRadius:9999,background:"#FF5C35",animation:"v2pulse 1.4s ease-in-out infinite"}}/>
            LIVE
          </span>
          <span style={{fontFamily:"monospace",fontSize:14,color:"#E2E8F0",padding:"4px 10px",background:"#1E293B",borderRadius:6,fontVariantNumeric:"tabular-nums"}}>{mm}:{ss}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 380px",minHeight:0}}>
        {/* Video stage */}
        <div style={{display:"flex",flexDirection:"column",padding:20,gap:14}}>
          <div style={{flex:1,background:"#1E293B",borderRadius:14,position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",minHeight:320}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 30% 40%,#334155 0%,#0F172A 70%)"}}/>
            <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
              <window.V2Av name="Rahul Sharma" size={120} style={{fontSize:40}}/>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:600,color:"#FFF"}}>Rahul Sharma</div>
                <div style={{fontSize:12,color:"#94A3B8",marginTop:3}}>Bangalore · Senior .NET Developer</div>
              </div>
            </div>
            {/* Labels */}
            <div style={{position:"absolute",left:14,bottom:14,padding:"5px 10px",background:"rgba(15,23,42,0.7)",backdropFilter:"blur(8px)",borderRadius:7,fontSize:12,color:"#FFF",display:"inline-flex",alignItems:"center",gap:6}}>
              <i data-lucide="mic" style={{width:12,height:12,color:"#10B981"}}/>Rahul Sharma
            </div>
            <div style={{position:"absolute",right:14,top:14,padding:"4px 10px",background:"rgba(15,23,42,0.6)",borderRadius:6,fontSize:11,color:"#FFF",display:"inline-flex",alignItems:"center",gap:6}}>
              <span style={{width:5,height:5,borderRadius:9999,background:"#FF5C35",animation:"v2pulse 1.4s ease-in-out infinite"}}/>
              REC · {mm}:{ss}
            </div>
            {/* PiP */}
            <div style={{position:"absolute",right:14,bottom:14,width:160,height:108,background:camOn?"linear-gradient(135deg,#475569,#334155)":"#1E293B",borderRadius:10,border:"2px solid #334155",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
              {camOn?<window.V2Av name="Anand Rao" size={52} style={{fontSize:18}}/>:<div style={{color:"#64748B",display:"flex",flexDirection:"column",alignItems:"center",gap:4,fontSize:11}}><i data-lucide="video-off" style={{width:18,height:18}}/>Camera off</div>}
              <div style={{position:"absolute",left:6,bottom:5,fontSize:10,color:"#FFF",padding:"1px 5px",background:"rgba(15,23,42,0.6)",borderRadius:3}}>You</div>
            </div>
          </div>
          {/* Controls */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {[
              {icon:muted?"mic-off":"mic", active:muted, cb:()=>setMuted(m=>!m), danger:muted},
              {icon:camOn?"video":"video-off", active:!camOn, cb:()=>setCamOn(c=>!c), danger:!camOn},
              {icon:"monitor-up", cb:()=>{}},
              {icon:"pen-tool",   cb:()=>{}},
            ].map((b,i)=>(
              <button key={i} onClick={b.cb} style={{width:44,height:44,borderRadius:9999,background:b.danger?"#FF5C35":b.active?"#1E293B":"#1E293B",color:"#FFF",border:0,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 120ms"}}>
                <i data-lucide={b.icon} style={{width:17,height:17}}/>
              </button>
            ))}
            <button onClick={onEnd} style={{height:44,padding:"0 22px",borderRadius:9999,background:"#FF5C35",color:"#FFF",border:0,fontWeight:600,fontSize:14,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,marginLeft:8}}>
              <i data-lucide="phone-off" style={{width:15,height:15}}/> End call
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div style={{background:"#FFF",color:"#0F172A",display:"flex",flexDirection:"column",borderLeft:"1px solid #1E293B"}}>
          <div style={{display:"flex",borderBottom:"1px solid #E2E8F0"}}>
            {[{id:"scorecard",icon:"check-square",label:"Score"},{id:"questions",icon:"list-checks",label:"Questions"},{id:"notes",icon:"edit-3",label:"Notes"}].map(t=>(
              <button key={t.id} onClick={()=>setPanel(t.id)} style={{
                flex:1,padding:"13px 0",background:"transparent",border:0,
                fontSize:12,fontWeight:panel===t.id?600:500,
                color:panel===t.id?"#5B4FE9":"#6B7280",
                borderBottom:panel===t.id?"2px solid #5B4FE9":"2px solid transparent",
                marginBottom:-1,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5,
              }}>
                <i data-lucide={t.icon} style={{width:13,height:13}}/>{t.label}
              </button>
            ))}
          </div>

          {panel==="scorecard"&&(
            <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#5B4FE9"}}>Live scorecard</div>
                <div style={{fontSize:12,color:"#6B7280",marginTop:2}}>Score as you go · auto-saved</div>
              </div>
              {rubric.map(r=>(
                <div key={r.id}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#0F172A"}}>{r.label}</div>
                      <div style={{fontSize:11,color:"#6B7280",lineHeight:1.4,marginTop:1}}>{r.desc}</div>
                    </div>
                    <span style={{fontFamily:"monospace",fontWeight:700,fontSize:16,color:scores[r.id]>=4?"#047857":scores[r.id]>=3?"#B45309":"#B53618"}}>{scores[r.id]}</span>
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>setScores(s=>({...s,[r.id]:n}))} style={{
                        flex:1,padding:"8px 0",borderRadius:6,fontFamily:"inherit",
                        border:`1px solid ${scores[r.id]===n?"#5B4FE9":"#E2E8F0"}`,
                        background:scores[r.id]===n?"#EFEDFD":"#FFF",
                        color:scores[r.id]===n?"#3A31A3":"#6B7280",
                        fontWeight:600,fontSize:13,cursor:"pointer",transition:"all 120ms",
                      }}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{marginTop:"auto",paddingTop:14,borderTop:"1px solid #F1F5F9"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:13,color:"#374151"}}>
                  <span>Overall</span>
                  <span style={{fontFamily:"monospace",fontWeight:700,color:"#0F172A"}}>{overall} / 5.0</span>
                </div>
                <button onClick={()=>onEnd()} style={{width:"100%",padding:"10px 0",background:"#5B4FE9",color:"#FFF",border:0,borderRadius:9,fontWeight:600,fontSize:13,cursor:"pointer",transition:"all 120ms"}}>Submit at call end</button>
              </div>
            </div>
          )}

          {panel==="questions"&&(
            <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:4}}>Suggested questions</div>
              {[
                {q:"Walk me through a complex .NET service you designed.", asked:true},
                {q:"How do you handle distributed transactions across microservices?", asked:true},
                {q:"Tell me about a production incident you debugged under pressure.", asked:false},
                {q:"How do you decide when to add an index in a high-write Postgres table?", asked:false},
                {q:"How would you deprecate a legacy endpoint with active customers?", asked:false},
              ].map((q,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:12,border:"1px solid #E2E8F0",borderRadius:8,background:q.asked?"#F8FAFC":"#FFF",opacity:q.asked?0.6:1}}>
                  <span style={{width:20,height:20,borderRadius:9999,background:q.asked?"#5B4FE9":"#F1F5F9",color:q.asked?"#FFF":"#94A3B8",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700}}>
                    {q.asked?<i data-lucide="check" style={{width:11,height:11}}/>:(i+1)}
                  </span>
                  <span style={{fontSize:13,color:q.asked?"#94A3B8":"#0F172A",lineHeight:1.5,textDecoration:q.asked?"line-through":"none"}}>{q.q}</span>
                </div>
              ))}
            </div>
          )}

          {panel==="notes"&&(
            <div style={{flex:1,padding:20,display:"flex",flexDirection:"column"}}>
              <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:4}}>Private notes</div>
              <div style={{fontSize:12,color:"#6B7280",marginBottom:10}}>Visible only to you and the hiring panel.</div>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} style={{flex:1,resize:"none",border:"1px solid #E2E8F0",borderRadius:8,padding:12,fontSize:13,fontFamily:"inherit",lineHeight:1.6,color:"#0F172A",outline:"none"}}
                onFocus={e=>{e.target.style.borderColor="#5B4FE9";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
                onBlur={e=>{e.target.style.borderColor="#E2E8F0";e.target.style.boxShadow="none";}}
              />
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11,color:"#94A3B8"}}>
                <span>Auto-saved</span><span>{notes.length} chars</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   SCORECARD
══════════════════════════════════════════ */
const IVScorecard = ({}) => {
  const [scores,setScores] = React.useState({tech:4,arch:3,azure:2,problem:4,comm:5});
  const [decision,setDecision] = React.useState("pass");
  const [reason,setReason] = React.useState("");
  React.useEffect(()=>{window.lucide?.createIcons();},[decision]);
  const competencies = [
    {id:"tech",    label:".NET Core & C# expertise",  weight:"Core",  ev:"Candidate demonstrated strong async/await understanding and explained middleware pipeline clearly."},
    {id:"arch",    label:"System architecture",       weight:"Core",  ev:"Decent understanding of monolith→microservices migration but lacked specifics on decomposition."},
    {id:"azure",   label:"Azure / Cloud",              weight:"Core",  ev:"Limited hands-on experience. Mentioned Azure Functions but couldn't explain cold-start tradeoffs."},
    {id:"problem", label:"Problem solving",           weight:"Core",  ev:"Strong debugging approach. Walked through production incident methodically."},
    {id:"comm",    label:"Communication",              weight:"Bonus", ev:"Exceptionally clear communicator. Structured answers well, confirmed understanding before answering."},
  ];
  const dotLabels = ["Poor","Weak","Good","Strong","Excellent"];
  const decisions = [
    {id:"pass",  label:"Pass",  icon:"thumbs-up",   color:"#047857",bg:"#ECFDF5",bd:"#A7F3D0"},
    {id:"maybe", label:"Maybe", icon:"help-circle", color:"#B45309",bg:"#FFFBEB",bd:"#FEF3C7"},
    {id:"reject",label:"Reject",icon:"thumbs-down", color:"#B53618",bg:"#FEF2F2",bd:"#FECACA"},
  ];
  const overall = (Object.values(scores).reduce((a,b)=>a+b,0)/Object.keys(scores).length).toFixed(1);

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* AI prefill notice */}
        <div style={{padding:"12px 14px",background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:10,display:"flex",gap:10,fontSize:13,color:"#6B7280"}}>
          <i data-lucide="sparkles" style={{width:14,height:14,color:"#5B4FE9",marginTop:1}}/>
          AI has pre-filled this scorecard based on the interview transcript. Review, edit, and submit.
        </div>

        {competencies.map((c,i)=>(
          <div key={c.id} style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:20,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:14,fontWeight:600,color:"#0F172A"}}>{c.label}</span>
                <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:9999,background:c.weight==="Core"?"#EFEDFD":"#F1F5F9",color:c.weight==="Core"?"#3A31A3":"#475569"}}>{c.weight}</span>
              </div>
              <span style={{fontFamily:"monospace",fontWeight:700,fontSize:15,color:scores[c.id]>=4?"#047857":scores[c.id]>=3?"#B45309":"#B53618"}}>{scores[c.id]}/5</span>
            </div>
            {/* Dot scorer */}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
              <div style={{display:"flex",gap:6}}>
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setScores(s=>({...s,[c.id]:n}))} style={{
                    flex:1,padding:"10px 0",borderRadius:8,border:`1px solid ${scores[c.id]===n?"#5B4FE9":"#E2E8F0"}`,
                    background:scores[c.id]===n?"#EFEDFD":"#FFF",
                    color:scores[c.id]===n?"#3A31A3":"#374151",
                    fontWeight:600,fontSize:13,cursor:"pointer",transition:"all 120ms",fontFamily:"inherit",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                  }}>
                    <span style={{fontFamily:"monospace",fontSize:14,fontWeight:700}}>{n}</span>
                    <span style={{fontSize:9,opacity:0.7,fontWeight:500,letterSpacing:"0.03em"}}>{dotLabels[n-1]}</span>
                  </button>
                ))}
              </div>
            </div>
            <EvidenceField defaultText={c.ev}/>
          </div>
        ))}

        {/* Decision */}
        <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:20,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0F172A",marginBottom:12}}>Final decision</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
            {decisions.map(d=>(
              <button key={d.id} onClick={()=>setDecision(d.id)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:7,padding:"16px 12px",
                border:`${decision===d.id?2:1}px solid ${decision===d.id?d.bd:"#E2E8F0"}`,
                background:decision===d.id?d.bg:"#FFF",borderRadius:10,
                color:decision===d.id?d.color:"#6B7280",fontWeight:600,fontSize:14,cursor:"pointer",
                transition:"all 160ms",transform:decision===d.id?"translateY(-1px)":"translateY(0)",
                fontFamily:"inherit",
              }}>
                <i data-lucide={d.icon} style={{width:20,height:20}}/>{d.label}
              </button>
            ))}
          </div>
          <div>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>
              Why? <span style={{color:"#EF4444"}}>*</span>
            </label>
            <textarea value={reason} onChange={e=>setReason(e.target.value.slice(0,200))} rows={3} placeholder="Brief rationale for the hiring panel…" style={{width:"100%",padding:10,border:"1px solid #CBD5E1",borderRadius:8,fontSize:13,fontFamily:"inherit",lineHeight:1.55,outline:"none",resize:"vertical"}}
              onFocus={e=>{e.target.style.borderColor="#5B4FE9";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
              onBlur={e=>{e.target.style.borderColor="#CBD5E1";e.target.style.boxShadow="none";}}
            />
            <div style={{display:"flex",justifyContent:"flex-end",fontSize:11,color:"#94A3B8",marginTop:3,fontFamily:"monospace"}}>{reason.length}/200</div>
          </div>
          <button style={{width:"100%",marginTop:14,padding:"12px 0",background:"#5B4FE9",color:"#FFF",border:0,borderRadius:10,fontWeight:600,fontSize:14,cursor:"pointer",boxShadow:"0 6px 18px rgba(91,79,233,0.25)",transition:"all 120ms"}}
            onMouseEnter={e=>e.currentTarget.style.background="#4A3FCE"}
            onMouseLeave={e=>e.currentTarget.style.background="#5B4FE9"}
          >Submit scorecard</button>
          <div style={{textAlign:"center",fontSize:11,color:"#94A3B8",marginTop:8}}>Last auto-saved 1 minute ago</div>
        </div>
      </div>

      {/* Right */}
      <div style={{display:"flex",flexDirection:"column",gap:14,position:"sticky",top:80}}>
        <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:20,textAlign:"center",boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:8}}>Overall score</div>
          <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:56,fontWeight:700,color:"#0F172A",letterSpacing:"-0.03em",lineHeight:1}}>{overall}</div>
          <div style={{fontSize:12,color:"#6B7280",marginTop:2}}>/ 5.0</div>
          <div style={{height:6,background:"#F1F5F9",borderRadius:9999,overflow:"hidden",margin:"14px 0 0"}}>
            <div style={{height:"100%",width:`${(overall/5)*100}%`,background:"#5B4FE9",borderRadius:9999,transition:"width 240ms"}}/>
          </div>
        </div>
        <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:20,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:12}}>AI insights</div>
          {[
            {icon:"lightbulb",color:"#5B4FE9",text:"Candidate contradicted Azure claim — 2 years experience stated but couldn't explain cold start."},
            {icon:"bar-chart-3",color:"#5B4FE9",text:"Score aligns with AI screening: previous round gave 3.8/5."},
            {icon:"alert-triangle",color:"#B45309",text:"Azure is a core requirement — consider if score of 2 is acceptable."},
          ].map((it,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:`${i===0?0:12}px 0 ${i===2?0:12}px`,borderTop:i===0?"0":"1px solid #F1F5F9"}}>
              <div style={{width:26,height:26,borderRadius:7,background:"#EFEDFD",color:it.color,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <i data-lucide={it.icon} style={{width:13,height:13}}/>
              </div>
              <div style={{fontSize:13,color:"#374151",lineHeight:1.55}}>{it.text}</div>
            </div>
          ))}
        </div>
        <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:18,display:"flex",flexDirection:"column",gap:12,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
          {[{icon:"file-text",label:"Jump to transcript"},{icon:"play-circle",label:"Play recording · 52:14"}].map((l,i)=>(
            <a key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#5B4FE9",fontWeight:500,cursor:"pointer",padding:"6px 0",borderTop:i>0?"1px solid #F1F5F9":"0"}}>
              <i data-lucide={l.icon} style={{width:14,height:14}}/>{l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

const EvidenceField = ({defaultText}) => {
  const [text,setText] = React.useState(defaultText);
  const [edited,setEdited] = React.useState(false);
  return (
    <textarea value={text} onChange={e=>{setText(e.target.value);setEdited(true);}} rows={2} style={{width:"100%",padding:10,border:"1px solid #E2E8F0",borderRadius:8,fontSize:13,fontFamily:"inherit",lineHeight:1.55,color:edited?"#0F172A":"#94A3B8",fontStyle:edited?"normal":"italic",background:edited?"#FFF":"#FAFAFE",outline:"none",resize:"vertical",transition:"all 120ms"}}
      onFocus={e=>{e.target.style.borderColor="#5B4FE9";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";setEdited(true);}}
      onBlur={e=>{e.target.style.borderColor="#E2E8F0";e.target.style.boxShadow="none";}}
    />
  );
};

Object.assign(window, { IVDashboard, IVLiveRoom, IVScorecard });
