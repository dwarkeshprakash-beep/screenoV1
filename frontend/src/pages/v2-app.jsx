/* Screeno v2 — App router + all screens */

const MANAGER_PAGES   = ["team-overview","my-team","schedule","reports","referrals"];
const INTERVIEWER_PAGES = ["iv-dashboard","iv-prep","iv-liveroom","iv-scorecard"];
const CANDIDATE_PAGES   = ["c-landing","c-device","c-consent","c-status","c-exam","c-ai","c-livevideo","c-completion"];

/* ── DATA ── */
const QUESTION_BANK_DATA = [
  {id:"q1",kind:"mcq",  diff:"Hard",  text:"Which SOLID principle does dependency injection primarily implement?", mandatory:true,  tags:[".NET","Architecture"]},
  {id:"q2",kind:"code", diff:"Hard",  text:"Write a generic repository pattern in C# using async/await.",          mandatory:false, tags:[".NET","C#"]},
  {id:"q3",kind:"mcq",  diff:"Medium",text:"What is the difference between IEnumerable and IQueryable in LINQ?",   mandatory:false, tags:[".NET","SQL"]},
  {id:"q4",kind:"text", diff:"Medium",text:"Explain authentication vs authorization with real examples.",            mandatory:false, tags:["General"]},
  {id:"q5",kind:"mcq",  diff:"Easy",  text:"Which HTTP method should be used for a fully idempotent update?",       mandatory:false, tags:["HTTP","REST"]},
];

const INTERVIEW_TEMPLATES = [
  {id:"t1",name:"Standard 3-Attempt",      desc:"3 AI voice rounds, candidate self-schedules within a date window", attempts:3, type:"AI Voice",    reportAfter:"all",   prompt:"Focus on .NET backend, system design, and communication"},
  {id:"t2",name:"Quick 1-Round",           desc:"Single AI voice + coding exam in one 90-min session",              attempts:1, type:"AI + Coding",  reportAfter:"each",  prompt:"General technical and communication assessment"},
];

const COMPARE_METRICS = [
  {key:"overall",      label:"Overall Score",        max:5},
  {key:"confidence",   label:"Confidence",           max:5},
  {key:"knowledge",    label:"Technical Knowledge",  max:5},
  {key:"techStack",    label:"Tech Stack Match",      max:5},
  {key:"communication",label:"Communication",        max:5},
  {key:"jdMatch",      label:"JD Match %",           max:100},
  {key:"problemSolving",label:"Problem Solving",     max:5},
  {key:"clarity",      label:"Clarity",              max:5},
  {key:"speed",        label:"Response Speed",       max:5},
  {key:"cultureFit",   label:"Culture Fit",          max:5},
  {key:"integrity",    label:"Integrity Score %",    max:100},
];
const COMPARE_C1 = {name:"Ankit Verma",  role:"Full Stack Engineer",   skills:[".NET","React","MongoDB","Docker"],  bg:"5 yrs · Bangalore", decision:"PASS",    scores:{overall:4.7,confidence:4.8,knowledge:4.7,techStack:4.6,communication:4.9,jdMatch:87,problemSolving:4.8,clarity:4.7,speed:4.5,cultureFit:4.6,integrity:94}};
const COMPARE_C2 = {name:"Meera Pillai", role:"Senior .NET Developer", skills:[".NET","C#","Azure","SQL","Docker"], bg:"4 yrs · Hyderabad",  decision:"PENDING", scores:{overall:4.1,confidence:4.0,knowledge:4.3,techStack:4.0,communication:4.2,jdMatch:72,problemSolving:4.2,clarity:4.1,speed:3.9,cultureFit:4.0,integrity:88}};

const CAND_UPCOMING = [
  {id:1, role:"Senior .NET Developer", company:"Acme Technologies",type:"AI Voice",  date:"May 30",time:"10:00 AM",duration:"45 min",attempt:"1 of 3",hasDate:true, status:"scheduled"},
  {id:2, role:"Senior .NET Developer", company:"Acme Technologies",type:"AI Voice",  date:null,    time:null,      duration:"45 min",attempt:"2 of 3",hasDate:false,status:"pending"},
  {id:3, role:"Senior .NET Developer", company:"Acme Technologies",type:"Coding Exam",date:null,   time:null,      duration:"60 min",attempt:"3 of 3",hasDate:false,status:"pending"},
];
const CAND_COMPLETED = [
  {type:"AI Screening", date:"May 22", score:4.2, feedback:"Strong backend knowledge. Improve cloud architecture depth."},
];
const INTERVIEW_SLOTS = [
  {date:"May 30",day:"Thu", slots:[{t:"09:00",avail:true},{t:"10:00",avail:true},{t:"14:00",avail:false},{t:"16:00",avail:true}]},
  {date:"May 31",day:"Fri", slots:[{t:"09:00",avail:true},{t:"11:00",avail:true},{t:"15:00",avail:false}]},
  {date:"Jun 01",day:"Sat", slots:[{t:"10:00",avail:true},{t:"14:00",avail:true}]},
  {date:"Jun 02",day:"Sun", slots:[{t:"11:00",avail:true}]},
];

/* ── LOGIN SCREEN ── */
const LoginScreen = ({onLogin}) => {
  const accounts = [
    {role:"manager",     label:"Manager",     name:"Kiran Patel",    sub:"Manager · Acme Corp",      initials:"KP", color:"#EDE9FE", fg:"#5B21B6"},
    {role:"candidate",   label:"Candidate",   name:"Rahul Sharma",   sub:"Senior .NET Developer",    initials:"RS", color:"#DCFCE7", fg:"#166534"},
    {role:"interviewer", label:"Interviewer", name:"Anand Rao",      sub:"Tech Interviewer · Acme",  initials:"AR", color:"#DBEAFE", fg:"#1E40AF"},
  ];
  return (
    <div style={{minHeight:"100vh", background:"var(--slate-900)", display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div style={{width:"100%", maxWidth:440}}>
        <div style={{textAlign:"center", marginBottom:40}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:16}}>
            <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,var(--brand-500),var(--brand-600))",position:"relative"}}>
              <div style={{position:"absolute",left:11,top:14,width:22,height:3,background:"var(--bg-surface)",borderRadius:2,opacity:0.95}}/>
              <div style={{position:"absolute",left:11,top:21,width:22,height:3,background:"var(--bg-surface)",borderRadius:2,opacity:0.6}}/>
            </div>
            <span style={{fontSize:28,fontWeight:700,color:"var(--bg-surface)",letterSpacing:"-0.025em"}}>Screeno</span>
          </div>
          <p style={{fontSize:14,color:"#64748B"}}>AI-powered hiring platform</p>
        </div>
        <div style={{background:"#1E293B", borderRadius:16, padding:28, border:"1px solid #334155"}}>
          <p style={{fontSize:13,fontWeight:600,color:"var(--slate-400)",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:18}}>Demo Accounts</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {accounts.map(a=>(
              <button key={a.role} onClick={()=>onLogin(a.role)} style={{
                display:"flex", alignItems:"center", gap:14,
                padding:"14px 16px", background:"var(--slate-900)",
                border:"1px solid #334155", borderRadius:10,
                cursor:"pointer", textAlign:"left", transition:"all 150ms",
                width:"100%",
              }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--brand-500)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#334155"}
              >
                <div style={{width:40,height:40,borderRadius:9999,background:a.color,color:a.fg,display:"inline-flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>{a.initials}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--bg-surface)"}}>{a.name}</div>
                  <div style={{fontSize:12,color:"#64748B",marginTop:1}}>{a.sub}</div>
                </div>
                <span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"#1E293B",border:"1px solid #334155",color:"var(--slate-400)"}}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── CANDIDATE DASHBOARD ── */
const CandidateDashboardScreen = ({onStart, onSelfSchedule}) => {
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  const completed = CAND_COMPLETED.length;
  const avgScore  = completed ? (CAND_COMPLETED.reduce((s,c)=>s+c.score,0)/completed).toFixed(1) : "N/A";
  return (
    <div style={{padding:"24px 28px", maxWidth:1200}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:26,fontWeight:700,color:"var(--slate-900)",letterSpacing:"-0.02em"}}>Welcome back, Rahul!</h1>
        <p style={{fontSize:14,color:"#64748B",marginTop:4}}>Here's your interview overview</p>
      </div>
      <div style={{background:"#DBEAFE",border:"1px solid #93C5FD",borderRadius:10,padding:"12px 16px",marginBottom:24,display:"flex",alignItems:"center",gap:12}}>
        <i data-lucide="info" style={{width:16,height:16,color:"#1E40AF",flexShrink:0}}/>
        <p style={{fontSize:13,color:"#1E40AF",margin:0}}>You have {CAND_UPCOMING.filter(u=>u.hasDate).length} upcoming scheduled interview. Make sure to complete the device check before starting.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28}}>
        {[
          {icon:"calendar",  label:"Upcoming Interviews", value:CAND_UPCOMING.length,       sub:"Scheduled for you"},
          {icon:"check-circle-2",label:"Completed",       value:completed,                   sub:"Interviews finished"},
          {icon:"trending-up",label:"Average Score",      value:avgScore,                    sub:"Your performance"},
          {icon:"repeat-2",  label:"Total Attempts",      value:`${completed}/${CAND_UPCOMING.length}`, sub:"Practice sessions"},
        ].map((s,i)=>(
          <div key={i} style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:10,padding:"16px 20px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <p style={{fontSize:12,fontWeight:500,color:"#64748B",margin:0,lineHeight:1.4}}>{s.label}</p>
              <i data-lucide={s.icon} style={{width:16,height:16,color:"var(--slate-400)"}}/>
            </div>
            <p style={{fontSize:28,fontWeight:700,color:"var(--slate-900)",margin:"0 0 4px",letterSpacing:"-0.02em"}}>{s.value}</p>
            <p style={{fontSize:12,color:"var(--slate-400)",margin:0}}>{s.sub}</p>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:28}}>
        {/* Upcoming */}
        <div>
          <h2 style={{fontSize:15,fontWeight:700,color:"var(--slate-900)",marginBottom:16}}>Upcoming Interviews</h2>
          {CAND_UPCOMING.map((u,i)=>(
            <div key={u.id} style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:10,padding:16,marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <p style={{fontSize:14,fontWeight:700,color:"var(--slate-900)",margin:0}}>{u.role}</p>
                  <p style={{fontSize:12,color:"#64748B",margin:"3px 0 0"}}>{u.company}</p>
                </div>
                <span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:u.hasDate?"var(--brand-50)":"var(--slate-100)",color:u.hasDate?"var(--brand-500)":"#64748B"}}>
                  {u.hasDate?"Scheduled":"Pending"}
                </span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:9999,background:"var(--brand-50)",color:"var(--brand-500)",fontWeight:600}}>{u.type}</span>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:9999,background:"var(--slate-100)",color:"#475569",fontWeight:500}}>{u.duration}</span>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:9999,background:"var(--slate-100)",color:"#475569",fontWeight:500}}>Attempt {u.attempt}</span>
              </div>
              {u.hasDate ? (
                <div style={{fontSize:12,color:"#475569",marginBottom:12,display:"flex",gap:14}}>
                  <span><i data-lucide="calendar" style={{width:12,height:12,display:"inline",marginRight:4}}/>{u.date}</span>
                  <span><i data-lucide="clock" style={{width:12,height:12,display:"inline",marginRight:4}}/>{u.time}</span>
                </div>
              ):(
                <div style={{fontSize:12,color:"var(--warning-500)",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                  <i data-lucide="calendar" style={{width:12,height:12}}/>No date set — you can choose your own slot
                </div>
              )}
              <div style={{display:"flex",gap:8}}>
                {u.hasDate && <button onClick={()=>onStart(u.id,"c-device")} style={{flex:1,padding:"8px 14px",background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:7,fontSize:12,fontWeight:600,color:"var(--slate-700)",cursor:"pointer"}}>Device Check</button>}
                {u.hasDate ? (
                  <button onClick={()=>onStart(u.id,"c-landing")} style={{flex:2,padding:"8px 14px",background:"var(--slate-900)",border:0,borderRadius:7,fontSize:12,fontWeight:600,color:"var(--bg-surface)",cursor:"pointer"}}>Start Interview →</button>
                ):(
                  <button onClick={()=>onSelfSchedule(u.id)} style={{flex:1,padding:"8px 14px",background:"var(--brand-500)",border:0,borderRadius:7,fontSize:12,fontWeight:600,color:"var(--bg-surface)",cursor:"pointer"}}>Choose my slot</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Right: Performance + Tips */}
        <div>
          <h2 style={{fontSize:15,fontWeight:700,color:"var(--slate-900)",marginBottom:16}}>Recent Performance</h2>
          <div style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:10,padding:16,marginBottom:20,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            {CAND_COMPLETED.length===0 ? (
              <p style={{fontSize:13,color:"var(--slate-400)",margin:0,textAlign:"center",padding:"20px 0"}}>No reports available yet</p>
            ) : CAND_COMPLETED.map((c,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<CAND_COMPLETED.length-1?"1px solid var(--slate-100)":"0"}}>
                <div>
                  <p style={{fontSize:13,fontWeight:600,color:"var(--slate-900)",margin:0}}>{c.type}</p>
                  <p style={{fontSize:11,color:"var(--slate-400)",margin:"2px 0 0"}}>{c.date} · {c.feedback}</p>
                </div>
                <div style={{fontSize:20,fontWeight:700,color:c.score>=4?"var(--success-500)":"var(--warning-500)"}}>{c.score}</div>
              </div>
            ))}
          </div>
          <h2 style={{fontSize:15,fontWeight:700,color:"var(--slate-900)",marginBottom:12}}>Interview Preparation Tips</h2>
          {[
            {phase:"Before Interview",    items:["Run device check","Test microphone in a quiet room","Review your resume and key projects","Research the company and role"]},
            {phase:"During Interview",    items:["Stay focused — do not switch tabs","Speak clearly and take your time","Ask for clarification if needed","Structure answers with examples"]},
            {phase:"After Interview",     items:["Review your feedback report","Work on highlighted improvement areas","Prepare for the next round"]},
          ].map((t,i)=>(
            <div key={i} style={{marginBottom:14}}>
              <p style={{fontSize:13,fontWeight:700,color:"var(--slate-900)",margin:"0 0 6px"}}>{t.phase}</p>
              <ul style={{margin:0,paddingLeft:18}}>
                {t.items.map((it,j)=><li key={j} style={{fontSize:12,color:"#475569",lineHeight:1.8}}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── SELF-SCHEDULE MODAL ── */
const SelfScheduleModal = ({open, onClose, interviewId, onConfirm}) => {
  const [selDate, setSelDate] = React.useState(0);
  const [selTime, setSelTime] = React.useState(null);
  React.useEffect(()=>{if(open){setSelDate(0);setSelTime(null);}window.lucide?.createIcons();},[open]);
  if(!open) return null;
  const ds = INTERVIEW_SLOTS;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"v2fade 160ms"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--bg-surface)",borderRadius:16,width:"100%",maxWidth:520,boxShadow:"0 24px 60px rgba(15,23,42,0.24)",animation:"v2scale 200ms cubic-bezier(0.2,0,0,1)",overflow:"hidden"}}>
        <div style={{padding:"22px 24px",borderBottom:"1px solid var(--slate-100)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h2 style={{fontSize:16,fontWeight:700,color:"var(--slate-900)",margin:0}}>Choose your interview slot</h2>
            <p style={{fontSize:12,color:"#64748B",margin:"4px 0 0"}}>Pick a date and time that works for you</p>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:0,color:"var(--slate-400)",cursor:"pointer"}}><i data-lucide="x" style={{width:18,height:18}}/></button>
        </div>
        <div style={{padding:"20px 24px"}}>
          <p style={{fontSize:12,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Select date</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
            {ds.map((d,i)=>(
              <button key={i} onClick={()=>{setSelDate(i);setSelTime(null);}} style={{padding:"10px 0",background:selDate===i?"var(--brand-500)":"var(--slate-50)",border:`1px solid ${selDate===i?"var(--brand-500)":"var(--slate-200)"}`,borderRadius:8,cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:600,color:selDate===i?"rgba(255,255,255,0.7)":"var(--slate-400)"}}>{d.day}</div>
                <div style={{fontSize:13,fontWeight:700,color:selDate===i?"var(--bg-surface)":"var(--slate-900)",marginTop:2}}>{d.date.split(" ")[1]}</div>
                <div style={{fontSize:10,color:selDate===i?"rgba(255,255,255,0.7)":"var(--slate-400)"}}>{d.date.split(" ")[0]}</div>
              </button>
            ))}
          </div>
          <p style={{fontSize:12,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Available slots — {ds[selDate]?.date}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:24}}>
            {ds[selDate]?.slots.map((s,i)=>(
              <button key={i} onClick={()=>s.avail&&setSelTime(s.t)} disabled={!s.avail} style={{padding:"10px 0",background:selTime===s.t?"var(--brand-500)":s.avail?"var(--bg-surface)":"var(--slate-50)",border:`1px solid ${selTime===s.t?"var(--brand-500)":"var(--slate-200)"}`,borderRadius:8,cursor:s.avail?"pointer":"not-allowed",opacity:s.avail?1:0.4,fontSize:13,fontWeight:600,color:selTime===s.t?"var(--bg-surface)":s.avail?"var(--slate-900)":"var(--slate-400)"}}>
                {s.t}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"10px 16px",border:"1px solid var(--slate-200)",background:"var(--bg-surface)",color:"var(--slate-900)",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
            <button onClick={()=>{onConfirm(interviewId,ds[selDate]?.date,selTime);onClose();}} disabled={!selTime} style={{flex:2,padding:"10px 16px",background:selTime?"var(--brand-500)":"var(--slate-300)",border:0,borderRadius:8,fontWeight:600,fontSize:13,color:"var(--bg-surface)",cursor:selTime?"pointer":"not-allowed"}}>
              Confirm: {selTime?`${ds[selDate]?.date} · ${selTime}`:"pick a time"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── COMPARE CANDIDATES ── */
const CompareScreen = ({onBack}) => {
  const c1=COMPARE_C1, c2=COMPARE_C2;
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  const bar = (v,max,color) => (
    <div style={{flex:1,height:6,background:"var(--slate-100)",borderRadius:9999,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${(v/max)*100}%`,background:color,borderRadius:9999,transition:"width 600ms cubic-bezier(0.2,0,0,1)"}}/>
    </div>
  );
  const winColor = (v1,v2) => v1>v2?"var(--brand-500)":v2>v1?"var(--success-500)":"var(--slate-400)";
  return (
    <div style={{padding:"24px 28px"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:0,color:"var(--brand-500)",fontWeight:500,fontSize:13,cursor:"pointer",marginBottom:24}}>
        <i data-lucide="arrow-left" style={{width:16,height:16}}/>Back
      </button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:"var(--slate-900)",letterSpacing:"-0.02em",margin:0}}>Compare Candidates</h1>
          <p style={{fontSize:13,color:"#64748B",marginTop:4}}>Side-by-side performance across all metrics</p>
        </div>
      </div>
      {/* Candidate header cards */}
      <div style={{display:"grid",gridTemplateColumns:"240px 1fr 240px",gap:24,marginBottom:28,alignItems:"start"}}>
        {[c1,c2].map((c,i)=>(
          <div key={i} style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:12,padding:18,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <V2Av name={c.name} size={40}/>
              <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,background:c.decision==="PASS"?"var(--success-50)":"var(--warning-50)",color:c.decision==="PASS"?"var(--success-500)":"var(--warning-500)"}}>{c.decision}</span>
            </div>
            <p style={{fontSize:14,fontWeight:700,color:"var(--slate-900)",margin:"0 0 2px"}}>{c.name}</p>
            <p style={{fontSize:12,color:"#64748B",margin:"0 0 10px"}}>{c.role} · {c.bg}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {c.skills.map(s=><SkillTag key={s} label={s}/>)}
            </div>
          </div>
        ))}
        <div/>
      </div>
      {/* Metrics comparison */}
      <div style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
        <div style={{display:"grid",gridTemplateColumns:"240px 1fr 1fr",background:"var(--slate-50)",padding:"10px 18px",borderBottom:"1px solid var(--slate-200)"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.06em"}}>Metric</span>
          <span style={{fontSize:12,fontWeight:700,color:"var(--slate-900)",padding:"0 16px"}}>{c1.name}</span>
          <span style={{fontSize:12,fontWeight:700,color:"var(--slate-900)",padding:"0 16px"}}>{c2.name}</span>
        </div>
        {COMPARE_METRICS.map((m,i)=>{
          const v1=c1.scores[m.key], v2=c2.scores[m.key];
          const fmtV = (v,max) => max===100?`${v}%`:v.toFixed(1);
          return (
            <div key={m.key} style={{display:"grid",gridTemplateColumns:"240px 1fr 1fr",padding:"12px 18px",borderBottom:i<COMPARE_METRICS.length-1?"1px solid #F9FAFB":"0",alignItems:"center"}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--slate-50)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:13,color:"var(--slate-700)",fontWeight:500}}>{m.label}</span>
              <div style={{padding:"0 16px",display:"flex",alignItems:"center",gap:10}}>
                {bar(v1,m.max,winColor(v1,v2))}
                <span style={{fontSize:13,fontWeight:700,minWidth:36,color:v1>v2?"var(--brand-500)":"var(--slate-700)"}}>{fmtV(v1,m.max)}</span>
              </div>
              <div style={{padding:"0 16px",display:"flex",alignItems:"center",gap:10}}>
                {bar(v2,m.max,winColor(v2,v1))}
                <span style={{fontSize:13,fontWeight:700,minWidth:36,color:v2>v1?"var(--success-500)":"var(--slate-700)"}}>{fmtV(v2,m.max)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── INTERVIEW TEMPLATES SCREEN ── */
const TemplatesScreen = ({onBack, onUse}) => {
  const [custom, setCustom] = React.useState(false);
  const [myTemplates, setMyTemplates] = React.useState(INTERVIEW_TEMPLATES);
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newAttempts, setNewAttempts] = React.useState(3);
  React.useEffect(()=>{window.lucide?.createIcons();},[custom]);
  return (
    <div style={{padding:"24px 28px"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:0,color:"var(--brand-500)",fontWeight:500,fontSize:13,cursor:"pointer",marginBottom:24}}>
        <i data-lucide="arrow-left" style={{width:16,height:16}}/>Back
      </button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:"var(--slate-900)",letterSpacing:"-0.02em",margin:0}}>Interview Templates</h1>
          <p style={{fontSize:13,color:"#64748B",marginTop:4}}>Pre-configured settings you can reuse when scheduling</p>
        </div>
        <button onClick={()=>setCustom(true)} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 16px",background:"var(--brand-500)",color:"var(--bg-surface)",border:0,borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer"}}>
          <i data-lucide="plus" style={{width:14,height:14}}/>New Template
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16,marginBottom:28}}>
        {myTemplates.map(t=>(
          <div key={t.id} style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:12,padding:20,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <h3 style={{fontSize:15,fontWeight:700,color:"var(--slate-900)",margin:0}}>{t.name}</h3>
              <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:6,background:"var(--brand-50)",color:"var(--brand-500)"}}>{t.type}</span>
            </div>
            <p style={{fontSize:13,color:"#64748B",margin:"0 0 14px",lineHeight:1.5}}>{t.desc}</p>
            <div style={{display:"flex",gap:12,fontSize:12,color:"#475569",marginBottom:16}}>
              <span style={{display:"flex",alignItems:"center",gap:4}}><i data-lucide="repeat-2" style={{width:13,height:13}}/>{t.attempts} attempt{t.attempts!==1?"s":""}</span>
              <span style={{display:"flex",alignItems:"center",gap:4}}><i data-lucide="bar-chart-3" style={{width:13,height:13}}/>Report after {t.reportAfter}</span>
            </div>
            <p style={{fontSize:11,color:"var(--slate-400)",margin:"0 0 14px",fontStyle:"italic"}}>"{t.prompt}"</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>onUse(t)} style={{flex:1,padding:"8px 12px",background:"var(--brand-500)",color:"var(--bg-surface)",border:0,borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer"}}>Use Template</button>
              <button style={{padding:"8px 12px",background:"var(--slate-50)",border:"1px solid var(--slate-200)",borderRadius:7,fontSize:12,fontWeight:600,color:"var(--slate-700)",cursor:"pointer"}}>Edit</button>
            </div>
          </div>
        ))}
      </div>
      {custom && (
        <div style={{background:"var(--slate-50)",border:"1px solid var(--slate-200)",borderRadius:12,padding:20}}>
          <h3 style={{fontSize:15,fontWeight:700,color:"var(--slate-900)",margin:"0 0 16px"}}>Create Custom Template</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><label style={{fontSize:12,fontWeight:600,color:"var(--slate-700)",display:"block",marginBottom:6}}>Template Name</label>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. React Frontend Standard" style={{width:"100%",padding:"8px 12px",border:"1px solid var(--slate-300)",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none"}}/></div>
            <div><label style={{fontSize:12,fontWeight:600,color:"var(--slate-700)",display:"block",marginBottom:6}}>Attempts</label>
            <select value={newAttempts} onChange={e=>setNewAttempts(+e.target.value)} style={{width:"100%",padding:"8px 12px",border:"1px solid var(--slate-300)",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",background:"var(--bg-surface)"}}>
              <option value={1}>1 attempt</option><option value={2}>2 attempts</option><option value={3}>3 attempts</option><option value={5}>5 attempts</option><option value={99}>Unlimited</option>
            </select></div>
          </div>
          <div style={{marginTop:12}}><label style={{fontSize:12,fontWeight:600,color:"var(--slate-700)",display:"block",marginBottom:6}}>Description / Prompt Focus</label>
          <textarea rows={2} value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Describe focus areas, tech stack, or special requirements…" style={{width:"100%",padding:"8px 12px",border:"1px solid var(--slate-300)",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",resize:"none"}}/></div>
          <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
            <button onClick={()=>setCustom(false)} style={{padding:"8px 16px",background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:7,fontSize:13,fontWeight:600,color:"var(--slate-700)",cursor:"pointer"}}>Cancel</button>
            <button onClick={()=>{if(newName){setMyTemplates(p=>[...p,{id:`t${p.length+1}`,name:newName,desc:newDesc||"Custom template",attempts:newAttempts,type:"AI Voice",reportAfter:"all",prompt:newDesc}]);setCustom(false);setNewName("");setNewDesc("");}}} style={{padding:"8px 16px",background:"var(--brand-500)",border:0,borderRadius:7,fontSize:13,fontWeight:600,color:"var(--bg-surface)",cursor:"pointer"}}>Save Template</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── RESUME ANALYZER — functional JD × resume ATS matcher ── */
const ResumeAnalyzerScreen = ({onBack}) => {
  const {HARD_SKILLS, SOFT_SKILLS, JD_SAMPLE, RESUME_SAMPLE} = window.V2;
  const [jd, setJd] = React.useState("");
  const [resume, setResume] = React.useState("");
  const [phase, setPhase] = React.useState("input");
  const [tab, setTab] = React.useState("hard");
  const [res, setRes] = React.useState(null);
  React.useEffect(()=>{window.lucide?.createIcons();},[phase,tab,res]);

  const analyze = () => {
    setPhase("analyzing");
    setTimeout(()=>{
      const J = jd.toLowerCase(), R = resume.toLowerCase();
      const inJd = dict => dict.filter(s=>J.includes(s));
      const jdHard = inJd(HARD_SKILLS), jdSoft = inJd(SOFT_SKILLS);
      const has = s => R.includes(s);
      const mH = jdHard.filter(has), missH = jdHard.filter(s=>!has(s));
      const mS = jdSoft.filter(has), missS = jdSoft.filter(s=>!has(s));
      const score = (jdHard.length+jdSoft.length) ? Math.round(((mH.length*1.4 + mS.length)/(jdHard.length*1.4 + jdSoft.length))*100) : 0;
      const yJd  = (jd.match(/(\d+)\s*\+?\s*(?:years|yrs|year)/i)||[])[1];
      const yRes = (resume.match(/(\d+)\s*\+?\s*(?:years|yrs|year)/i)||[])[1];
      const search = [
        {label:"Contact email present",     ok:/[\w.+-]+@[\w-]+\.[\w.-]+/.test(resume)},
        {label:"Phone number present",      ok:/(\+?\d[\d\s-]{7,})/.test(resume)},
        {label:"Skills section detected",   ok:/skills?/i.test(resume)},
        {label:"Experience section detected",ok:/experien/i.test(resume)},
      ];
      setRes({score, jdHard, jdSoft, mH, missH, mS, missS, yJd, yRes, search});
      setPhase("results");
    }, 1400);
  };

  const verdict = (s) => s>=85 ? {label:"Strong match — likely passes ATS", c:"var(--success-600)", bg:"var(--success-50)", bd:"#A7F3D0", icon:"check-circle-2", note:"Strongly aligned. Most ATS filters will pass this resume through."}
    : s>=65 ? {label:"Good shape — passes most filters", c:"var(--success-600)", bg:"var(--success-50)", bd:"#A7F3D0", icon:"thumbs-up", note:"In good shape. Close the remaining gaps for competitive, high-volume roles."}
    : s>=50 ? {label:"Borderline — may be filtered in large pools", c:"var(--warning-600)", bg:"var(--warning-50)", bd:"var(--warning-100)", icon:"alert-triangle", note:"Might pass in a small applicant pool, but likely filtered when volume is high."}
    : {label:"Major mismatch — likely rejected", c:"var(--danger-700)", bg:"#FEF2F2", bd:"#FECACA", icon:"circle-x", note:"Significant skills gap for this JD. Add the missing required skills first."};

  const chip = (label, tone) => (
    <span key={label} style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:9999,
      background:tone==="ok"?"var(--success-50)":tone==="miss"?"#FEF2F2":"var(--slate-100)",
      color:tone==="ok"?"var(--success-600)":tone==="miss"?"var(--danger-700)":"#475569"}}>{label}</span>
  );

  return (
    <div style={{padding:"24px 28px",maxWidth:940}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:0,color:"var(--brand-500)",fontWeight:500,fontSize:13,cursor:"pointer",marginBottom:20}}>
        <i data-lucide="arrow-left" style={{width:16,height:16}}/>Back to Reports
      </button>
      <h1 style={{fontSize:24,fontWeight:700,color:"var(--slate-900)",letterSpacing:"-0.02em",margin:"0 0 4px"}}>Resume Analyzer</h1>
      <p style={{fontSize:13,color:"#64748B",marginBottom:24}}>Paste a job description and a resume to get a JD-match score, missing keywords, and what to focus on.</p>

      {(phase==="input" || phase==="analyzing") && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            {[{t:"Job description",v:jd,set:setJd,ph:"Paste the full JD here…",sample:JD_SAMPLE},
              {t:"Candidate resume",v:resume,set:setResume,ph:"Paste the resume text here…",sample:RESUME_SAMPLE}].map((c,i)=>(
              <div key={i} style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:600,color:"var(--slate-900)"}}>{c.t}</span>
                  <button onClick={()=>c.set(c.sample)} style={{fontSize:12,color:"var(--brand-500)",fontWeight:600,background:"transparent",border:0,cursor:"pointer"}}>Load sample</button>
                </div>
                <textarea value={c.v} onChange={e=>c.set(e.target.value)} placeholder={c.ph} rows={12}
                  style={{width:"100%",padding:12,border:"1px solid var(--slate-300)",borderRadius:8,fontSize:13,fontFamily:"inherit",lineHeight:1.55,outline:"none",resize:"vertical"}}
                  onFocus={e=>{e.target.style.borderColor="var(--brand-500)";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
                  onBlur={e=>{e.target.style.borderColor="var(--slate-300)";e.target.style.boxShadow="none";}}/>
              </div>
            ))}
          </div>
          <button onClick={analyze} disabled={phase==="analyzing"||!jd.trim()||!resume.trim()} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"11px 20px",background:(!jd.trim()||!resume.trim())?"var(--slate-300)":"var(--brand-500)",color:"var(--bg-surface)",border:0,borderRadius:8,fontWeight:600,fontSize:13,cursor:(!jd.trim()||!resume.trim())?"not-allowed":"pointer"}}>
            {phase==="analyzing" ? <><i data-lucide="loader-2" style={{width:14,height:14,animation:"v2spin 1s linear infinite"}}/>Analyzing…</> : <><i data-lucide="zap" style={{width:14,height:14}}/>Analyze match</>}
          </button>
        </div>
      )}

      {phase==="results" && res && (()=>{
        const v = verdict(res.score), C = 2*Math.PI*34;
        return (
          <div>
            <button onClick={()=>setPhase("input")} style={{fontSize:12,color:"var(--brand-500)",fontWeight:600,background:"transparent",border:0,cursor:"pointer",marginBottom:14,display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="rotate-ccw" style={{width:13,height:13}}/>Edit inputs &amp; re-scan</button>
            <div style={{display:"grid",gridTemplateColumns:"190px 1fr",gap:20,marginBottom:20,alignItems:"center"}}>
              <div style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:12,padding:18,textAlign:"center",boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
                <div style={{position:"relative",width:96,height:96,margin:"0 auto"}}>
                  <svg width="96" height="96" style={{transform:"rotate(-90deg)"}}>
                    <circle cx="48" cy="48" r="34" stroke="var(--slate-100)" strokeWidth="9" fill="none"/>
                    <circle cx="48" cy="48" r="34" stroke={v.c} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={(C*res.score/100)+" "+C} style={{transition:"stroke-dasharray 700ms cubic-bezier(0.2,0,0,1)"}}/>
                  </svg>
                  <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display,'Inter')",fontSize:26,fontWeight:700,color:"var(--slate-900)"}}>{res.score}%</span>
                </div>
                <div style={{fontSize:12,color:"#64748B",marginTop:8}}>JD match rate</div>
                <div style={{fontSize:11,color:"var(--slate-400)",marginTop:2}}>Target: 75%+</div>
              </div>
              <div style={{background:v.bg,border:"1px solid "+v.bd,borderRadius:12,padding:18}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <i data-lucide={v.icon} style={{width:20,height:20,color:v.c}}/>
                  <span style={{fontSize:16,fontWeight:700,color:v.c}}>{v.label}</span>
                </div>
                <p style={{fontSize:13,color:"var(--slate-700)",lineHeight:1.6,margin:0}}>{v.note}</p>
                {res.yJd && (
                  <div style={{marginTop:10,fontSize:12,color:"#475569",display:"inline-flex",alignItems:"center",gap:6}}>
                    <i data-lucide="briefcase" style={{width:13,height:13}}/>
                    JD wants {res.yJd}+ yrs · resume shows {res.yRes||"—"} yrs {res.yRes&&Number(res.yRes)>=Number(res.yJd)?"✓":""}
                  </div>
                )}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
              <div style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:10,padding:16,textAlign:"center"}}>
                <p style={{fontSize:26,fontWeight:700,color:"var(--success-600)",margin:0}}>{res.mH.length+res.mS.length}</p>
                <p style={{fontSize:12,color:"#64748B",marginTop:4}}>Matched keywords</p>
              </div>
              <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,padding:16,textAlign:"center"}}>
                <p style={{fontSize:26,fontWeight:700,color:"#DC2626",margin:0}}>{res.missH.length+res.missS.length}</p>
                <p style={{fontSize:12,color:"#7F1D1D",marginTop:4}}>Missing keywords</p>
              </div>
              <div style={{background:"var(--warning-50)",border:"1px solid #FCD34D",borderRadius:10,padding:16,textAlign:"center"}}>
                <p style={{fontSize:26,fontWeight:700,color:"var(--warning-600)",margin:0}}>{res.missH.length}</p>
                <p style={{fontSize:12,color:"var(--warning-700)",marginTop:4}}>Hard skills to focus on</p>
              </div>
            </div>

            {res.missH.length>0 && (
              <div style={{background:"var(--warning-50)",border:"1px solid #FCD34D",borderRadius:10,padding:"14px 16px",marginBottom:20}}>
                <p style={{fontSize:13,color:"var(--warning-700)",fontWeight:700,margin:"0 0 6px",display:"flex",alignItems:"center",gap:6}}><i data-lucide="target" style={{width:14,height:14}}/>Focus the interview here</p>
                <p style={{fontSize:13,color:"#78350F",margin:"0 0 8px"}}>These required skills are in the JD but missing from the resume — probe them directly:</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{res.missH.map(s=>chip(s,"miss"))}</div>
              </div>
            )}

            <div style={{display:"flex",gap:4,marginBottom:14,borderBottom:"1px solid var(--slate-200)"}}>
              {[["hard","Hard skills"],["soft","Soft skills"],["search","Searchability"]].map(([id,l])=>(
                <button key={id} onClick={()=>setTab(id)} style={{padding:"10px 16px",border:0,background:"transparent",fontSize:13,fontWeight:600,color:tab===id?"var(--brand-500)":"var(--slate-400)",borderBottom:tab===id?"2px solid var(--brand-500)":"2px solid transparent",cursor:"pointer"}}>{l}</button>
              ))}
            </div>

            {tab==="hard" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div><div style={{fontSize:12,fontWeight:600,color:"var(--success-600)",marginBottom:8}}>Matched ({res.mH.length})</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{res.mH.length?res.mH.map(s=>chip(s,"ok")):<span style={{fontSize:13,color:"var(--slate-400)"}}>None matched</span>}</div></div>
                <div><div style={{fontSize:12,fontWeight:600,color:"var(--danger-700)",marginBottom:8}}>Missing ({res.missH.length})</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{res.missH.length?res.missH.map(s=>chip(s,"miss")):<span style={{fontSize:13,color:"var(--slate-400)"}}>Nothing missing — great</span>}</div></div>
              </div>
            )}
            {tab==="soft" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div><div style={{fontSize:12,fontWeight:600,color:"var(--success-600)",marginBottom:8}}>Matched ({res.mS.length})</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{res.mS.length?res.mS.map(s=>chip(s,"ok")):<span style={{fontSize:13,color:"var(--slate-400)"}}>None matched</span>}</div></div>
                <div><div style={{fontSize:12,fontWeight:600,color:"var(--danger-700)",marginBottom:8}}>Missing ({res.missS.length})</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{res.missS.length?res.missS.map(s=>chip(s,"miss")):<span style={{fontSize:13,color:"var(--slate-400)"}}>Nothing missing</span>}</div></div>
              </div>
            )}
            {tab==="search" && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {res.search.map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:s.ok?"var(--success-50)":"#FEF2F2",border:"1px solid "+(s.ok?"#A7F3D0":"#FECACA"),borderRadius:8}}>
                    <i data-lucide={s.ok?"check-circle-2":"circle-x"} style={{width:16,height:16,color:s.ok?"var(--success-500)":"#DC2626"}}/>
                    <span style={{fontSize:13,color:"var(--slate-900)"}}>{s.label}</span>
                  </div>
                ))}
                <p style={{fontSize:12,color:"var(--slate-400)",marginTop:4}}>ATS systems must be able to parse contact details and standard sections to rank a resume.</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};


/* ── PLACEHOLDER ── */
const PlaceholderPage = ({title,icon,body}) => {
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  return (
    <div style={{background:"var(--bg-surface)",border:"1px solid var(--slate-200)",borderRadius:12,padding:"80px 32px",textAlign:"center",color:"var(--slate-500)"}}>
      <i data-lucide={icon||"layers"} style={{width:36,height:36,color:"var(--slate-400)",margin:"0 auto 14px"}}/>
      <div style={{fontWeight:600,fontSize:18,color:"var(--slate-900)",marginBottom:6}}>{title}</div>
      <div style={{fontSize:13}}>{body||"This screen is in scope — coming soon."}</div>
    </div>
  );
};
const CandidateExamPlaceholder = ({onNext}) => {
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  return (
    <div style={{maxWidth:680,margin:"0 auto",padding:"48px 24px",textAlign:"center"}}>
      <div style={{width:56,height:56,borderRadius:14,background:"var(--info-50)",color:"var(--info-500)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
        <i data-lucide="code-2" style={{width:26,height:26}}/>
      </div>
      <h1 style={{fontSize:26,fontWeight:700,color:"var(--slate-900)",margin:"0 0 8px",letterSpacing:"-0.02em"}}>Coding exam</h1>
      <p style={{fontSize:14,color:"var(--slate-500)",marginBottom:24}}>45 minutes · 10 questions</p>
      <button onClick={onNext} style={{padding:"12px 28px",borderRadius:10,background:"var(--brand-500)",color:"var(--bg-surface)",border:0,fontWeight:600,fontSize:14,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8}}>
        Start exam <i data-lucide="arrow-right" style={{width:14,height:14}}/>
      </button>
    </div>
  );
};

/* ── CANDIDATE LIVE VIDEO JOIN (human round via Meet / Teams / Screeno) ── */
const CandidateLiveVideoJoin = ({onJoin}) => {
  const [provider, setProvider] = React.useState("meet");
  const [camOn, setCamOn] = React.useState(true);
  const [micOn, setMicOn] = React.useState(true);
  React.useEffect(()=>{window.lucide?.createIcons();},[provider,camOn,micOn]);
  const providers = [
    {id:"meet", label:"Google Meet",     icon:"video",   sub:"meet.google.com/xyz-abcd-efg"},
    {id:"teams",label:"Microsoft Teams",  icon:"users",   sub:"teams.microsoft.com/l/meetup…"},
    {id:"screeno",label:"Screeno Room",   icon:"monitor", sub:"screeno.io/room/rahul-r2"},
  ];
  const p = providers.find(x=>x.id===provider);
  return (
    <div style={{minHeight:"calc(100vh - 132px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 24px"}}>
      <div style={{maxWidth:560,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--brand-500)"}}>Tech Round 1 · with Anand Rao</div>
          <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:26,fontWeight:700,color:"var(--slate-900)",letterSpacing:"-0.02em",margin:"8px 0 4px"}}>You're ready to join</h1>
          <p style={{fontSize:14,color:"var(--slate-500)",margin:0}}>Senior .NET Developer · 60 minutes · today 2:00 PM IST</p>
        </div>
        {/* preview */}
        <div style={{position:"relative",height:220,borderRadius:14,overflow:"hidden",background:camOn?"linear-gradient(135deg,#475569,#1E293B)":"var(--slate-900)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
          {camOn ? <window.V2Av name="Rahul Sharma" size={90} style={{fontSize:32}}/> : <div style={{color:"#64748B",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}><i data-lucide="video-off" style={{width:26,height:26}}/><span style={{fontSize:12}}>Camera off</span></div>}
          <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:10}}>
            <button onClick={()=>setMicOn(m=>!m)} style={{width:44,height:44,borderRadius:9999,border:0,cursor:"pointer",background:micOn?"rgba(255,255,255,0.15)":"#EF4444",color:"var(--bg-surface)",display:"inline-flex",alignItems:"center",justifyContent:"center"}}><i data-lucide={micOn?"mic":"mic-off"} style={{width:18,height:18}}/></button>
            <button onClick={()=>setCamOn(c=>!c)} style={{width:44,height:44,borderRadius:9999,border:0,cursor:"pointer",background:camOn?"rgba(255,255,255,0.15)":"#EF4444",color:"var(--bg-surface)",display:"inline-flex",alignItems:"center",justifyContent:"center"}}><i data-lucide={camOn?"video":"video-off"} style={{width:18,height:18}}/></button>
          </div>
        </div>
        {/* provider */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {providers.map(o=>(
            <button key={o.id} onClick={()=>setProvider(o.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 8px",borderRadius:10,fontFamily:"inherit",
              border:`1px solid ${provider===o.id?"var(--brand-500)":"var(--slate-200)"}`,background:provider===o.id?"var(--brand-50)":"var(--bg-surface)",color:provider===o.id?"var(--brand-700)":"var(--slate-700)",fontWeight:600,fontSize:12,cursor:"pointer"}}>
              <i data-lucide={o.icon} style={{width:18,height:18}}/>{o.label}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--slate-500)",background:"var(--slate-50)",border:"1px solid var(--slate-200)",borderRadius:8,padding:"9px 12px",marginBottom:16}}>
          <i data-lucide="link" style={{width:13,height:13,color:"var(--slate-400)"}}/>{p.sub}
        </div>
        <button onClick={onJoin} style={{width:"100%",padding:"14px",borderRadius:12,background:"var(--success-500)",color:"var(--bg-surface)",border:0,fontSize:15,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 8px 20px rgba(5,150,105,0.25)"}}>
          <i data-lucide={p.icon} style={{width:18,height:18}}/> Join on {p.label}
        </button>
        <p style={{fontSize:12,color:"var(--slate-400)",textAlign:"center",marginTop:12}}>Your interviewer will admit you when they're ready.</p>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════ */
function V2App() {
  const [loggedIn, setLoggedIn]     = React.useState(false);
  const [role, setRole]             = React.useState("manager");
  const [page, setPage]             = React.useState("team-overview");
  const [selectedMember, setSM]     = React.useState(null);
  const [scheduleOpen, setSched]    = React.useState(false);
  const [schedCandidate, setSchedC] = React.useState(null);
  const [csvOpen, setCsvOpen]       = React.useState(false);
  const [addCandOpen, setAddCand]   = React.useState(false);
  const [selfSchedOpen, setSelfSched] = React.useState(false);
  const [selfSchedId, setSelfSchedId] = React.useState(null);
  const store = window.useV2Store();
  const [selJob, setSelJob] = React.useState(null);

  React.useEffect(()=>{ window.lucide?.createIcons(); },[role,page,selectedMember,scheduleOpen]);

  if(!loggedIn) {
    return <LoginScreen onLogin={r=>{
      setLoggedIn(true); setRole(r);
      if(r==="manager")     setPage("team-overview");
      if(r==="interviewer") setPage("iv-dashboard");
      if(r==="candidate")   setPage("c-dashboard");
    }}/>;
  }

  const handleLogout = () => { setLoggedIn(false); setPage("team-overview"); setSM(null); };

  const handleRoleChange = (r) => {
    setRole(r);
    if(r==="manager")     setPage("team-overview");
    if(r==="interviewer") setPage("iv-dashboard");
    if(r==="candidate")   setPage("c-dashboard");
    setSM(null);
  };

  const handlePageChange = (p) => {
    if(role==="candidate" && p==="c-ai")   p="c-prep-ai";
    if(role==="candidate" && p==="c-exam") p="c-prep-exam";
    setPage(p); setSM(null);
  };
  const openSchedule = (candidate) => { setSchedC(candidate); setSched(true); };
  const navigate = (target, payload) => {
    if(target==="member-profile")  { setSM({...payload, isExternal: payload?.isExternal ?? false}); setPage("member-profile"); }
    else if(target==="job-candidates") { setSelJob(payload); setPage("job-candidates"); }
    else if(target==="add-member") setAddCand(true);
    else if(target==="csv-import") setCsvOpen(true);
    else setPage(target);
  };

  const isCandidateFlow = (role==="candidate" && page!=="c-dashboard") || CANDIDATE_PAGES.includes(page);
  const isFullscreen    = page==="iv-liveroom";

  const managerTitles = {
    "team-overview":"Team Overview","my-team":"My Team","schedule":"Schedule",
    "reports":"Reports","referrals":"Referrals",
    "member-profile":selectedMember?.name||"Profile",
    "job-candidates":selJob?.title||"Candidates",
    "compare":"Compare Candidates","resume-analyze":"Resume Analyzer","templates":"Interview Templates",
    "manager-profile":"My Profile",
  };
  const ivTitles = {"iv-dashboard":"My Interviews","iv-prep":"Interview Prep","iv-liveroom":"Live Room","iv-scorecard":"Scorecard"};

  if(isFullscreen) return (
    <>
      <window.V2RoleBar role={role} onRole={handleRoleChange} onLogout={handleLogout}/>
      <window.IVLiveRoom onEnd={()=>setPage("iv-scorecard")}/>
      <window.V2HelpWidget/>
    </>
  );

  /* ── CANDIDATE DASHBOARD (pre-flow home) + PROFILE ── */
  if(role==="candidate" && (page==="c-dashboard" || page==="c-profile")) return (
    <>
      <window.V2RoleBar role={role} onRole={handleRoleChange} onLogout={handleLogout}/>
      <div style={{background:"var(--bg-surface)",borderBottom:"1px solid var(--slate-200)",padding:"0 24px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:38,zIndex:99}}>
        <h1 style={{fontSize:16,fontWeight:700,color:"var(--slate-900)",cursor:"pointer"}} onClick={()=>setPage("c-dashboard")}>My Interviews</h1>
        <button onClick={()=>setPage("c-profile")} style={{display:"inline-flex",alignItems:"center",gap:8,background:page==="c-profile"?"var(--slate-100)":"transparent",border:0,borderRadius:8,padding:"5px 8px",cursor:"pointer"}}>
          <window.V2Av name={store?.get?.().candidate?.name||"Rahul Sharma"} size={30}/>
          <span style={{fontSize:13,color:"var(--slate-700)",fontWeight:500}}>{store?.get?.().candidate?.name||"Rahul Sharma"}</span>
          <i data-lucide="chevron-down" style={{width:13,height:13,color:"var(--slate-400)"}}/>
        </button>
      </div>
      <div style={{background:"var(--slate-50)",minHeight:"calc(100vh - 92px)"}}>
        {page==="c-dashboard" && (
          <CandidateDashboardScreen
            onStart={(id,dest)=>setPage(dest||"c-landing")}
            onSelfSchedule={(id)=>{setSelfSchedId(id);setSelfSched(true);}}
          />
        )}
        {page==="c-profile" && <window.CandidateProfileScreen onBack={()=>setPage("c-dashboard")}/>}
      </div>
      <SelfScheduleModal open={selfSchedOpen} onClose={()=>setSelfSched(false)} interviewId={selfSchedId}
        onConfirm={(id,date,time)=>alert(`Scheduled attempt ${id} for ${date} at ${time}`)}/>
      <window.V2HelpWidget/>
    </>
  );

  /* ── CANDIDATE INTERVIEW FLOW ── */
  if(isCandidateFlow) return (
    <>
      <window.V2RoleBar role={role} onRole={handleRoleChange} onLogout={handleLogout}/>
      <window.V2SubBar role="candidate" page={page} onPage={handlePageChange}/>
      <window.V2CandidateShell page={page} onPage={handlePageChange}>
        {page==="c-landing"     && <window.CandidateLanding  onNext={()=>setPage("c-device")}/>}
        {page==="c-device"      && <window.DeviceCheck        onNext={()=>setPage("c-consent")}/>}
        {page==="c-consent"     && <window.ConsentScreen      onAgree={()=>setPage("c-prep-ai")} onDecline={()=>setPage("c-dashboard")}/>}
        {page==="c-prep-ai"     && <window.AIPrepLoader        target="interview" onReady={()=>setPage("c-ai")}/>}
        {page==="c-prep-exam"   && <window.AIPrepLoader        target="exam" onReady={()=>setPage("c-exam")}/>}
        {page==="c-status"      && <window.CandidateStatus    onNavigate={navigate}/>}
        {page==="c-ai"          && <window.AIScreenRoom       onEnd={()=>setPage("c-completion")}/>}
        {page==="c-completion"  && <window.CompletionScreen/>}
        {page==="c-exam"        && <window.ExamRunner          onSubmit={()=>setPage("c-completion")}/>}
        {page==="c-livevideo"   && <CandidateLiveVideoJoin     onJoin={()=>setPage("c-completion")}/>}
      </window.V2CandidateShell>
      <window.V2HelpWidget/>
    </>
  );

  /* ── MANAGER ── */
  if(role==="manager") return (
    <>
      <window.V2RoleBar role={role} onRole={handleRoleChange} onLogout={handleLogout}/>
      <window.V2SubBar role="manager" page={page} onPage={handlePageChange}/>
      <window.V2AppShell role="manager" page={page} onPage={handlePageChange} title={managerTitles[page]||"Manager"}>
        {page==="team-overview"   && <window.TeamOverviewScreen  onNavigate={navigate}/>}
        {page==="my-team"         && <window.MyTeamScreen         onNavigate={navigate} onSchedule={openSchedule}/>}
        {page==="schedule"        && <window.ManagerCalendarScreen onSchedule={()=>setSched(true)}/>}
        {page==="reports"         && <window.ReportsScreen         onViewReport={r=>console.log("view",r)}/>}
        {page==="member-profile"  && <window.MemberProfileScreen  member={selectedMember} onBack={()=>setPage(selectedMember?.isExternal?"job-candidates":"my-team")} onSchedule={openSchedule} isExternal={selectedMember?.isExternal}/>}
        {page==="job-candidates"  && <window.JobCandidatesScreen  job={selJob} onNavigate={navigate} onBack={()=>setPage("team-overview")} onSchedule={openSchedule}/>}
        {page==="compare"         && <CompareScreen onBack={()=>setPage("team-overview")}/>}
        {page==="resume-analyze"  && <ResumeAnalyzerScreen onBack={()=>setPage("reports")}/>}
        {page==="templates"       && <TemplatesScreen onBack={()=>setPage("team-overview")} onUse={t=>{setSchedC(t);setSched(true);}}/>}
        {page==="manager-profile" && <window.ManagerProfileScreen onBack={()=>setPage("team-overview")}/>}
        {page==="referrals"       && <PlaceholderPage title="Referrals" icon="share-2" body="Invite teammates to refer candidates and track referral bonuses."/>}
      </window.V2AppShell>
      <window.ScheduleModalV3 open={scheduleOpen} onClose={()=>setSched(false)} candidate={schedCandidate}/>
      <window.CSVImportModal   open={csvOpen}     onClose={()=>setCsvOpen(false)}/>
      <window.AddCandidateModal open={addCandOpen} onClose={()=>setAddCand(false)}/>
      <window.V2HelpWidget/>
    </>
  );

  /* ── INTERVIEWER ── */
  if(role==="interviewer") return (
    <>
      <window.V2RoleBar role={role} onRole={handleRoleChange} onLogout={handleLogout}/>
      <window.V2SubBar role="interviewer" page={page} onPage={handlePageChange}/>
      <window.V2AppShell role="interviewer" page={page} onPage={handlePageChange} title={ivTitles[page]||"Interviews"}>
        {page==="iv-dashboard" && <window.IVDashboard onNavigate={navigate}/>}
        {page==="iv-prep"      && <PlaceholderPage title="Interview Prep" icon="book-open" body="Candidate profile, suggested questions and skills matrix."/>}
        {page==="iv-scorecard" && <window.IVScorecard/>}
      </window.V2AppShell>
      <window.V2HelpWidget/>
    </>
  );

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(<V2App />);
