/* Screeno v2 — Schedule modal + CSV import + Add candidate */

const INTERVIEW_TYPES = [
  { id:"ai-voice", label:"AI Voice Interview", icon:"mic", desc:"AI conducts the interview, generates transcript + scorecard", color:"#5B4FE9", bg:"#EFEDFD" },
  { id:"ai-exam",  label:"AI Coding Exam",     icon:"code-2", desc:"MCQ, coding challenges, scenario-based questions",     color:"#2563EB", bg:"#EFF6FF" },
  { id:"human",    label:"Human Interview",    icon:"video",  desc:"Schedule via Meet, Teams, or Zoom with an interviewer", color:"#059669", bg:"#ECFDF5" },
];

const ATTEMPT_OPTS = [
  {id:"3",       label:"3 attempts"},
  {id:"5",       label:"5 attempts"},
  {id:"custom",  label:"Custom…"},
  {id:"infinite",label:"Unlimited"},
];

/* ══════════════════════════════════════════
   SCHEDULE MODAL (4-step wizard)
══════════════════════════════════════════ */
const ScheduleModalV3 = ({open, onClose, candidate}) => {
  const [step, setStep]     = React.useState(1);
  const [stages, setStages] = React.useState([{id:"ai-voice"}]);
  const [attempts, setAttempts] = React.useState("3");
  const [customAttempts, setCustomAttempts] = React.useState("7");
  const [reportMode, setReportMode] = React.useState("all"); // per|all
  const [jdFile, setJdFile] = React.useState(null);
  const [focusArea, setFocusArea] = React.useState("");
  const [interviewType, setInterviewType] = React.useState("client");
  const [date, setDate]   = React.useState(3);
  const [time, setTime]   = React.useState("14:00");
  const [duration, setDuration] = React.useState(45);
  const [expiry, setExpiry]   = React.useState("24h");
  const [recipientMail, setRecipientMail] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const [provider, setProvider] = React.useState("meet");
  React.useEffect(()=>{window.lucide?.createIcons();},[step,stages,attempts,reportMode,provider]);

  const addStage = (typeId) => { if(stages.length<3) setStages(s=>[...s,{id:typeId}]); };
  const removeStage = (i) => setStages(s=>s.filter((_,idx)=>idx!==i));

  const steps = ["Interview type","Configure","Timing","Confirm"];
  const DAYS = [{d:"Mon",n:26},{d:"Tue",n:27},{d:"Wed",n:28},{d:"Thu",n:29},{d:"Fri",n:30},{d:"Sat",n:31}];
  const TIMES = [{t:"10:00",ok:true},{t:"10:30",ok:true},{t:"11:00",ok:false},{t:"14:00",ok:true},{t:"14:30",ok:true},{t:"15:00",ok:false},{t:"16:00",ok:true},{t:"16:30",ok:true}];

  const candidateName = candidate?.name || "Rahul Sharma";

  return (
    <window.V2Modal open={open} onClose={onClose} width={600}>
      {/* Header */}
      <div style={{padding:"20px 24px",borderBottom:"1px solid #F1F5F9",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,#FAFAFE,#FFF)"}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:"#0F172A",letterSpacing:"-0.01em"}}>Schedule Interview</div>
          <div style={{fontSize:12,color:"#6B7280",marginTop:2}}>for {candidateName}</div>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:0,padding:6,cursor:"pointer",borderRadius:6,color:"#6B7280"}}
          onMouseEnter={e=>e.currentTarget.style.background="#F1F5F9"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <i data-lucide="x" style={{width:18,height:18}}/>
        </button>
      </div>

      {/* Stepper */}
      <div style={{display:"flex",alignItems:"center",padding:"14px 24px",borderBottom:"1px solid #F1F5F9"}}>
        {steps.map((s,i) => {
          const idx=i+1, done=idx<step, active=idx===step;
          return (
            <React.Fragment key={s}>
              <div style={{display:"inline-flex",alignItems:"center",gap:7}}>
                <span style={{
                  width:22,height:22,borderRadius:9999,
                  background:done?"#5B4FE9":active?"#FFF":"#FFF",
                  border:active?"2px solid #5B4FE9":done?"0":"1px solid #CBD5E1",
                  color:done?"#FFF":active?"#5B4FE9":"#94A3B8",
                  display:"inline-flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,fontWeight:700,
                }}>{done?<i data-lucide="check" style={{width:11,height:11}}/>:idx}</span>
                <span style={{fontSize:12.5,fontWeight:active?600:500,color:active?"#5B4FE9":done?"#0F172A":"#94A3B8"}}>{s}</span>
              </div>
              {i<steps.length-1 && <div style={{flex:1,height:2,background:idx<step?"#5B4FE9":"#E2E8F0",margin:"0 10px",borderRadius:9999}}/>}
            </React.Fragment>
          );
        })}
      </div>

      {/* Body */}
      <div style={{padding:24,overflowY:"auto",maxHeight:"60vh"}}>
        {/* STEP 1 — Interview type */}
        {step===1 && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:6}}>Interview mode</div>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              <button onClick={()=>setInterviewType("client")} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${interviewType==="client"?"#5B4FE9":"#E2E8F0"}`,background:interviewType==="client"?"#EFEDFD":"#FFF",color:interviewType==="client"?"#3A31A3":"#374151",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Client mock interview</button>
              <button onClick={()=>setInterviewType("internal")} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${interviewType==="internal"?"#5B4FE9":"#E2E8F0"}`,background:interviewType==="internal"?"#EFEDFD":"#FFF",color:interviewType==="internal"?"#3A31A3":"#374151",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Internal monthly mock</button>
            </div>

            <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:10}}>Interview stages <span style={{fontSize:11,color:"#94A3B8",fontWeight:400}}>(drag to reorder · max 3)</span></div>

            {/* Selected stages */}
            {stages.map((st,i) => {
              const t = INTERVIEW_TYPES.find(x=>x.id===st.id);
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:14,border:"1px solid #DEDAFB",background:"#FAFAFE",borderRadius:10,marginBottom:10}}>
                  <span style={{width:6,height:24,borderRadius:3,background:t.color}}/>
                  <div style={{width:32,height:32,borderRadius:8,background:t.bg,color:t.color,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                    <i data-lucide={t.icon} style={{width:15,height:15}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#0F172A"}}>{`Stage ${i+1}: ${t.label}`}</div>
                    <div style={{fontSize:11,color:"#6B7280"}}>{t.desc}</div>
                  </div>
                  {stages.length>1 && (
                    <button onClick={()=>removeStage(i)} style={{background:"transparent",border:0,color:"#94A3B8",cursor:"pointer",padding:4}}>
                      <i data-lucide="x" style={{width:14,height:14}}/>
                    </button>
                  )}
                </div>
              );
            })}

            {stages.length<3 && (
              <div>
                <div style={{fontSize:12,color:"#6B7280",marginBottom:8}}>Add another stage:</div>
                <div style={{display:"flex",gap:8}}>
                  {INTERVIEW_TYPES.filter(t=>!stages.find(s=>s.id===t.id)).map(t => (
                    <button key={t.id} onClick={()=>addStage(t.id)} style={{
                      display:"inline-flex",alignItems:"center",gap:6,
                      padding:"7px 12px",borderRadius:8,
                      border:"1px dashed #CBD5E1",background:"#FFF",
                      color:"#374151",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",
                      transition:"all 120ms",
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#5B4FE9";e.currentTarget.style.color="#5B4FE9";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="#CBD5E1";e.currentTarget.style.color="#374151";}}
                    >
                      <i data-lucide="plus" style={{width:12,height:12}}/> {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Configure */}
        {step===2 && (
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {/* JD upload */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:6}}>Job description <span style={{fontSize:11,color:"#94A3B8",fontWeight:400}}>(optional — helps AI generate role-specific questions)</span></div>
              <div style={{border:"2px dashed #CBD5E1",borderRadius:10,padding:"18px 16px",textAlign:"center",cursor:"pointer",background:jdFile?"#ECFDF5":"#FFF",transition:"all 120ms"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="#5B4FE9"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="#CBD5E1"}
                onClick={()=>setJdFile(jdFile?null:"Senior .NET Developer — TechCorp India.pdf")}>
                {jdFile ? (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:"#047857",fontSize:13,fontWeight:500}}>
                    <i data-lucide="file-check-2" style={{width:16,height:16}}/> {jdFile}
                    <span style={{fontSize:11,color:"#6B7280",fontWeight:400}}>(click to remove)</span>
                  </div>
                ) : (
                  <>
                    <i data-lucide="upload-cloud" style={{width:22,height:22,color:"#94A3B8",margin:"0 auto 8px"}}/>
                    <div style={{fontSize:13,color:"#374151",fontWeight:500}}>Upload JD (PDF / DOCX)</div>
                    <div style={{fontSize:11,color:"#94A3B8",marginTop:3}}>Or describe the role below</div>
                  </>
                )}
              </div>
              {!jdFile && (
                <textarea value={focusArea} onChange={e=>setFocusArea(e.target.value)} placeholder="E.g. 'Senior .NET role at Acme, focus on microservices, Azure, team leadership'" rows={2}
                  style={{width:"100%",marginTop:8,padding:10,border:"1px solid #CBD5E1",borderRadius:8,fontSize:13,fontFamily:"inherit",lineHeight:1.5,outline:"none",resize:"none"}}
                  onFocus={e=>{e.target.style.borderColor="#5B4FE9";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
                  onBlur={e=>{e.target.style.borderColor="#CBD5E1";e.target.style.boxShadow="none";}}
                />
              )}
            </div>

            {/* Custom focus area */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:4}}>Custom AI focus area</div>
              <div style={{fontSize:11,color:"#6B7280",marginBottom:6}}>AI will prioritise these topics when generating questions</div>
              <textarea value={focusArea} onChange={e=>setFocusArea(e.target.value)} placeholder="E.g. 'Ask about distributed systems, Azure Functions cold-start, and leadership scenarios'" rows={3}
                style={{width:"100%",padding:10,border:"1px solid #CBD5E1",borderRadius:8,fontSize:13,fontFamily:"inherit",lineHeight:1.55,outline:"none",resize:"vertical"}}
                onFocus={e=>{e.target.style.borderColor="#5B4FE9";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
                onBlur={e=>{e.target.style.borderColor="#CBD5E1";e.target.style.boxShadow="none";}}
              />
            </div>

            {/* Attempts */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:8}}>Number of attempts</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {ATTEMPT_OPTS.map(o => (
                  <button key={o.id} onClick={()=>setAttempts(o.id)} style={{
                    padding:"10px 8px",borderRadius:8,textAlign:"center",fontFamily:"inherit",
                    border:`1px solid ${attempts===o.id?"#5B4FE9":"#E2E8F0"}`,
                    background:attempts===o.id?"#EFEDFD":"#FFF",
                    color:attempts===o.id?"#3A31A3":"#374151",
                    fontWeight:600,fontSize:13,cursor:"pointer",transition:"all 120ms",
                  }}>{o.label}</button>
                ))}
              </div>
              {attempts==="custom" && (
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                  <input type="number" min="1" max="20" value={customAttempts} onChange={e=>setCustomAttempts(e.target.value)}
                    style={{width:80,padding:"7px 10px",border:"1px solid #CBD5E1",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"center"}}
                    onFocus={e=>e.target.style.borderColor="#5B4FE9"}
                    onBlur={e=>e.target.style.borderColor="#CBD5E1"}
                  />
                  <span style={{fontSize:13,color:"#6B7280"}}>attempts</span>
                </div>
              )}
              {attempts==="infinite" && (
                <div style={{marginTop:8,padding:"10px 12px",background:"#FFFBEB",border:"1px solid #FEF3C7",borderRadius:8,fontSize:12,color:"#B45309"}}>
                  <i data-lucide="info" style={{width:13,height:13}}/> A combined report will be generated every 3 attempts automatically.
                </div>
              )}
            </div>

            {/* Report delivery */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:8}}>When to receive the report</div>
              <div style={{display:"flex",gap:8}}>
                {[{id:"per",label:"After every attempt"},{id:"all",label:"After all attempts done"}].map(o=>(
                  <button key={o.id} onClick={()=>setReportMode(o.id)} style={{
                    flex:1,padding:"9px 12px",borderRadius:8,fontFamily:"inherit",
                    border:`1px solid ${reportMode===o.id?"#5B4FE9":"#E2E8F0"}`,
                    background:reportMode===o.id?"#EFEDFD":"#FFF",
                    color:reportMode===o.id?"#3A31A3":"#374151",
                    fontWeight:600,fontSize:13,cursor:"pointer",transition:"all 120ms",
                  }}>{o.label}</button>
                ))}
              </div>
            </div>

            {/* Meeting provider — only when a human interview stage is included */}
            {stages.some(s=>s.id==="human") && (
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:4}}>Human interview platform</div>
                <div style={{fontSize:11,color:"#6B7280",marginBottom:8}}>A meeting link is generated and emailed to both sides</div>
                <div style={{display:"flex",gap:8}}>
                  {[{id:"meet",l:"Google Meet",ic:"video"},{id:"teams",l:"Microsoft Teams",ic:"users"},{id:"screeno",l:"Screeno Room",ic:"monitor"}].map(o=>(
                    <button key={o.id} onClick={()=>setProvider(o.id)} style={{
                      flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 8px",borderRadius:8,fontFamily:"inherit",
                      border:`1px solid ${provider===o.id?"#5B4FE9":"#E2E8F0"}`,background:provider===o.id?"#EFEDFD":"#FFF",
                      color:provider===o.id?"#3A31A3":"#374151",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all 120ms",
                    }}>
                      <i data-lucide={o.ic} style={{width:16,height:16}}/>{o.l}
                    </button>
                  ))}
                </div>
                <div style={{marginTop:8,padding:"9px 12px",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:8,fontSize:12,color:"#1D4ED8",display:"flex",gap:7,alignItems:"center"}}>
                  <i data-lucide="link" style={{width:13,height:13}}/>
                  {provider==="meet"?"Connect Google Workspace to auto-create Meet links.":provider==="teams"?"Connect Microsoft 365 to auto-create Teams links.":"Uses Screeno's built-in video room — no setup needed."}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Timing */}
        {step===3 && (
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {/* Date */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:8}}>Preferred date</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
                {DAYS.map((d,i)=>(
                  <button key={i} onClick={()=>setDate(i)} style={{padding:"10px 4px",borderRadius:8,border:`1px solid ${date===i?"#5B4FE9":"#E2E8F0"}`,background:date===i?"#5B4FE9":"#FFF",color:date===i?"#FFF":"#0F172A",cursor:"pointer",textAlign:"center",transition:"all 120ms",fontFamily:"inherit"}}>
                    <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",opacity:0.8}}>{d.d}</div>
                    <div style={{fontFamily:"monospace",fontSize:17,fontWeight:700,marginTop:2}}>{d.n}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:8}}>Available slots</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {TIMES.map(t=>(
                  <button key={t.t} disabled={!t.ok} onClick={()=>setTime(t.t)} style={{
                    padding:"9px 0",borderRadius:8,fontFamily:"monospace",fontSize:13,fontWeight:600,cursor:t.ok?"pointer":"not-allowed",
                    border:`1px solid ${time===t.t?"#5B4FE9":"#E2E8F0"}`,
                    background:time===t.t?"#5B4FE9":"#FFF",
                    color:!t.ok?"#CBD5E1":time===t.t?"#FFF":"#374151",
                    textDecoration:!t.ok?"line-through":"none",
                    transition:"all 120ms",
                  }}>{t.t}</button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:8}}>Duration</div>
              <div style={{display:"inline-flex",gap:2,padding:3,background:"#F1F5F9",borderRadius:8}}>
                {[30,45,60,90].map(d=>(
                  <button key={d} onClick={()=>setDuration(d)} style={{padding:"7px 16px",borderRadius:6,border:0,background:duration===d?"#FFF":"transparent",color:duration===d?"#5B4FE9":"#6B7280",fontWeight:600,fontSize:13,cursor:"pointer",boxShadow:duration===d?"0 1px 3px rgba(15,23,42,0.08)":"none",transition:"all 120ms",fontFamily:"inherit"}}>{d} min</button>
                ))}
              </div>
            </div>

            {/* Link expiry */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:4}}>Interview link validity</div>
              <div style={{fontSize:11,color:"#6B7280",marginBottom:8}}>The link will only be accessible during this window</div>
              <div style={{display:"flex",gap:8}}>
                {[{id:"6h",l:"6 hours"},{id:"24h",l:"24 hours"},{id:"48h",l:"48 hours"},{id:"7d",l:"7 days"}].map(o=>(
                  <button key={o.id} onClick={()=>setExpiry(o.id)} style={{flex:1,padding:"8px 6px",borderRadius:8,fontFamily:"inherit",border:`1px solid ${expiry===o.id?"#5B4FE9":"#E2E8F0"}`,background:expiry===o.id?"#EFEDFD":"#FFF",color:expiry===o.id?"#3A31A3":"#374151",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all 120ms"}}>{o.l}</button>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:6}}>Report recipients <span style={{fontSize:11,color:"#94A3B8",fontWeight:400}}>(besides you)</span></div>
              <input value={recipientMail} onChange={e=>setRecipientMail(e.target.value)} placeholder="cc@company.com, hiring@acme.co" style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E1",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}
                onFocus={e=>{e.target.style.borderColor="#5B4FE9";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
                onBlur={e=>{e.target.style.borderColor="#CBD5E1";e.target.style.boxShadow="none";}}
              />
            </div>
          </div>
        )}

        {/* STEP 4 — Confirm */}
        {step===4 && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{padding:18,background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:12}}>
              <div style={{fontSize:14,fontWeight:700,color:"#0F172A",marginBottom:12}}>Summary</div>
              {[
                {label:"Candidate",   value:candidateName},
                {label:"Mode",        value:interviewType==="client"?"Client mock":"Internal monthly"},
                {label:"Stages",      value:stages.map(s=>INTERVIEW_TYPES.find(t=>t.id===s.id)?.label).join(" → ")},
                {label:"Attempts",    value:attempts==="custom"?`${customAttempts} attempts`:attempts==="infinite"?"Unlimited":attempts+" attempts"},
                {label:"Date & time", value:`${DAYS[date]?.d} May ${DAYS[date]?.n}, ${time} IST`},
                {label:"Duration",    value:`${duration} minutes per stage`},
                ...(stages.some(s=>s.id==="human") ? [{label:"Platform", value:provider==="meet"?"Google Meet":provider==="teams"?"Microsoft Teams":"Screeno Room"}] : []),
                {label:"Link valid",  value:`${expiry} from sending`},
                {label:"Report",      value:reportMode==="per"?"After every attempt":"After all attempts"},
              ].map((it,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:i===0?"0":"1px solid #F1F5F9",fontSize:13}}>
                  <span style={{color:"#6B7280"}}>{it.label}</span>
                  <span style={{color:"#0F172A",fontWeight:600,textAlign:"right",maxWidth:"60%"}}>{it.value}</span>
                </div>
              ))}
            </div>

            <label style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#374151",cursor:"pointer"}}>
              <input type="checkbox" checked={notify} onChange={e=>setNotify(e.target.checked)} style={{accentColor:"#5B4FE9",width:16,height:16}}/>
              Send interview invite email to {candidateName}
            </label>

            <div style={{padding:12,background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:10,display:"flex",gap:8,fontSize:13,color:"#047857"}}>
              <i data-lucide="link" style={{width:14,height:14,marginTop:1}}/>
              <div>
                <div style={{fontWeight:600}}>A time-limited interview link will be generated</div>
                <div style={{fontSize:12,opacity:0.85,marginTop:2}}>Link expires {expiry} after sending. Candidate can't access it outside the window.</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{display:"flex",justifyContent:"space-between",padding:"14px 24px",borderTop:"1px solid #F1F5F9"}}>
        <window.Btn variant="ghost" onClick={step===1?onClose:()=>setStep(s=>s-1)}>
          <i data-lucide={step===1?"x":"arrow-left"} style={{width:13,height:13}}/> {step===1?"Cancel":"Back"}
        </window.Btn>
        <window.Btn onClick={step===4?onClose:()=>setStep(s=>s+1)}>
          {step===4?"Send invite":"Next"} <i data-lucide={step===4?"send":"arrow-right"} style={{width:13,height:13}}/>
        </window.Btn>
      </div>
    </window.V2Modal>
  );
};

/* ══════════════════════════════════════════
   CSV IMPORT MODAL
══════════════════════════════════════════ */
const CSVImportModal = ({open, onClose}) => {
  const [stage, setStage] = React.useState("upload"); // upload|mapping|preview|done
  const [fileName, setFileName] = React.useState(null);
  const [dupeMode, setDupeMode] = React.useState("skip"); // skip|update|ask
  React.useEffect(()=>{window.lucide?.createIcons();},[stage]);

  const previewRows = [
    {name:"Rohit Kulkarni",  email:"rohit.k@gmail.com",    role:"Senior .NET Developer", manager:"Kiran Patel",    dup:false},
    {name:"Tanvi Desai",     email:"tanvi.d@gmail.com",    role:"React Developer",       manager:"Kiran Patel",    dup:false},
    {name:"Arjun Kulkarni",  email:"arjun.k@acme.co",      role:".NET Developer",        manager:"Kiran Patel",    dup:true},
    {name:"Harish Menon",    email:"harish.m@gmail.com",   role:"Backend Engineer",      manager:"",               dup:false},
    {name:"Pooja Krishnan",  email:"pooja.k@gmail.com",    role:"QA Automation",         manager:"Kiran Patel",    dup:false},
  ];

  return (
    <window.V2Modal open={open} onClose={onClose} width={560}>
      <div style={{padding:"20px 24px",borderBottom:"1px solid #F1F5F9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:16,fontWeight:700,color:"#0F172A"}}>Import candidates · CSV</div>
        <button onClick={onClose} style={{background:"transparent",border:0,cursor:"pointer",color:"#6B7280",padding:6}}><i data-lucide="x" style={{width:18,height:18}}/></button>
      </div>
      <div style={{padding:24}}>
        {stage==="upload" && (
          <div>
            <div style={{textAlign:"center",border:"2px dashed #CBD5E1",borderRadius:12,padding:"32px 24px",marginBottom:16,cursor:"pointer",transition:"all 120ms"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#5B4FE9";e.currentTarget.style.background="#FAFAFE";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#CBD5E1";e.currentTarget.style.background="transparent";}}
              onClick={()=>{ setFileName("candidates-batch-2.csv"); }}>
              <i data-lucide="upload-cloud" style={{width:32,height:32,color:"#94A3B8",margin:"0 auto 10px"}}/>
              <div style={{fontSize:14,fontWeight:600,color:"#0F172A"}}>{fileName || "Click to upload or drag a CSV"}</div>
              <div style={{fontSize:12,color:"#94A3B8",marginTop:4}}>Columns: Name, Email, Role, Manager (optional), Resume URL (optional)</div>
            </div>
            <a href="#" style={{fontSize:12,color:"#5B4FE9",fontWeight:500}}>Download sample CSV template</a>
            <div style={{marginTop:16}}>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:8}}>Duplicate handling</div>
              {[{id:"skip",l:"Skip duplicates (recommended)"},{id:"update",l:"Update existing records"},{id:"ask",l:"Ask me for each duplicate"}].map(o=>(
                <label key={o.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer",fontSize:13,color:"#374151"}}>
                  <input type="radio" checked={dupeMode===o.id} onChange={()=>setDupeMode(o.id)} name="dupemode" style={{accentColor:"#5B4FE9"}}/>
                  {o.l}
                </label>
              ))}
            </div>
          </div>
        )}
        {stage==="preview" && (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:600,color:"#0F172A"}}>Preview ({previewRows.length} rows)</div>
              {previewRows.filter(r=>r.dup).length>0 && (
                <span style={{fontSize:12,fontWeight:600,padding:"2px 8px",borderRadius:9999,background:"#FEF3C7",color:"#B45309"}}>
                  {previewRows.filter(r=>r.dup).length} duplicate{previewRows.filter(r=>r.dup).length>1?"s":""} detected
                </span>
              )}
            </div>
            <div style={{border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#F8FAFC"}}>
                    {["Name","Email","Role","Manager",""].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:10.5,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:"#94A3B8",borderBottom:"1px solid #E2E8F0"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r,i)=>(
                    <tr key={i} style={{background:r.dup?"#FFFBEB":"#FFF"}}>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #F1F5F9",fontWeight:500,color:"#0F172A"}}>{r.name}</td>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #F1F5F9",color:"#6B7280"}}>{r.email}</td>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #F1F5F9",color:"#374151"}}>{r.role}</td>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #F1F5F9",color:"#374151"}}>{r.manager||<span style={{color:"#94A3B8",fontStyle:"italic"}}>unassigned</span>}</td>
                      <td style={{padding:"10px 12px",borderBottom:"1px solid #F1F5F9"}}>
                        {r.dup && <span style={{fontSize:11,fontWeight:600,color:"#B45309",padding:"2px 7px",borderRadius:9999,background:"#FEF3C7"}}>Duplicate · will {dupeMode}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {stage==="done" && (
          <div style={{textAlign:"center",padding:"24px 0"}}>
            <div style={{width:56,height:56,borderRadius:9999,background:"#ECFDF5",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
              <i data-lucide="check-circle-2" style={{width:28,height:28,color:"#059669"}}/>
            </div>
            <div style={{fontSize:18,fontWeight:700,color:"#0F172A"}}>Import complete</div>
            <div style={{fontSize:13,color:"#6B7280",marginTop:6}}>{previewRows.filter(r=>!r.dup).length} candidates added · {previewRows.filter(r=>r.dup).length} skipped as duplicates</div>
          </div>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"14px 24px",borderTop:"1px solid #F1F5F9"}}>
        <window.Btn variant="ghost" onClick={stage==="upload"?onClose:()=>setStage(stage==="preview"?"upload":"preview")}>
          {stage==="upload"?"Cancel":"Back"}
        </window.Btn>
        <window.Btn disabled={stage==="upload"&&!fileName} onClick={()=>{
          if(stage==="upload") setStage("preview");
          else if(stage==="preview") setStage("done");
          else onClose();
        }}>
          {stage==="upload"?"Preview →":stage==="preview"?"Import now":stage==="done"?"Done":""}
        </window.Btn>
      </div>
    </window.V2Modal>
  );
};

/* Add candidate modal */
const AddCandidateModal = ({open, onClose}) => {
  const store = window.useV2Store();
  const [form, setForm] = React.useState({name:"",email:"",role:"",manager:""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const valid = form.name.trim() && form.email.includes("@") && form.role.trim();
  React.useEffect(()=>{ if(open) setForm({name:"",email:"",role:"",manager:""}); window.lucide?.createIcons();},[open]);
  const add = () => {
    if(!valid) return;
    store.update(s=>{
      s.team.unshift({
        id: window.V2Store.nextId(), name:form.name, role:form.role,
        skills:[], assess:{s:"never",ago:"Never"}, upcoming:"—",
        email:form.email, phone:"", resumeUpdated:null, loc:"\u2014", exp:"\u2014",
        manager: form.manager || "Kiran Patel",
      });
    });
    onClose();
  };
  return (
    <window.V2Modal open={open} onClose={onClose} width={480}>
      <div style={{padding:"20px 24px",borderBottom:"1px solid #F1F5F9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:16,fontWeight:700,color:"#0F172A"}}>Add candidate</div>
        <button onClick={onClose} style={{background:"transparent",border:0,cursor:"pointer",color:"#6B7280",padding:6}}><i data-lucide="x" style={{width:18,height:18}}/></button>
      </div>
      <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
        {[
          {label:"Full name",    key:"name",    placeholder:"Rahul Sharma",         required:true},
          {label:"Email",        key:"email",   placeholder:"rahul@gmail.com",       required:true},
          {label:"Role applied", key:"role",    placeholder:"Senior .NET Developer", required:true},
          {label:"Manager",      key:"manager", placeholder:"Kiran Patel (optional)", required:false},
        ].map(f=>(
          <div key={f.key}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>{f.label}{f.required&&<span style={{color:"#EF4444",marginLeft:3}}>*</span>}</label>
            <input value={form[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder}
              style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E1",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}
              onFocus={e=>{e.target.style.borderColor="#5B4FE9";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
              onBlur={e=>{e.target.style.borderColor="#CBD5E1";e.target.style.boxShadow="none";}}
            />
          </div>
        ))}
        <div>
          <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Resume</label>
          <div style={{border:"1px dashed #CBD5E1",borderRadius:8,padding:"14px 12px",textAlign:"center",cursor:"pointer",fontSize:13,color:"#94A3B8"}}>
            <i data-lucide="paperclip" style={{width:14,height:14}}/> Attach PDF or DOCX
          </div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,padding:"14px 24px",borderTop:"1px solid #F1F5F9"}}>
        <window.Btn variant="secondary" onClick={onClose}>Cancel</window.Btn>
        <window.Btn disabled={!valid} onClick={add}>Add member</window.Btn>
      </div>
    </window.V2Modal>
  );
};

Object.assign(window, { ScheduleModalV3, CSVImportModal, AddCandidateModal });
