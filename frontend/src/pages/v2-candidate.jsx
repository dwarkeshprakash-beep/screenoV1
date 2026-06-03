/* Screeno v2 — Candidate screens */

/* ══════════════════════════════════════════
   LANDING
══════════════════════════════════════════ */
const CandidateLanding = ({onNext}) => {
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  return (
    <div style={{minHeight:"calc(100vh - 132px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 24px"}}>
      <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:16,padding:"40px 32px",maxWidth:480,width:"100%",boxShadow:"0 8px 28px rgba(15,23,42,0.06)",textAlign:"center"}}>
        <div style={{width:64,height:64,borderRadius:16,background:"#EFEDFD",color:"#5B4FE9",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>
          <i data-lucide="briefcase" style={{width:28,height:28}}/>
        </div>
        <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:26,fontWeight:700,color:"#0F172A",letterSpacing:"-0.02em",margin:"0 0 8px"}}>Senior .NET Developer</h1>
        <p style={{fontSize:14,color:"#6B7280",margin:"0 0 28px"}}>Acme Corp is inviting you to the next step.</p>

        <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:12,padding:20,marginBottom:24,textAlign:"left"}}>
          {[
            {icon:"video",   label:"Live Video Interview", sub:"With Ankit Joshi · 60 minutes"},
            {icon:"calendar",label:"Scheduled for Today",  sub:"2:00 PM (IST)"},
          ].map((it,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,padding:i===0?"0 0 14px":"14px 0 0",borderTop:i>0?"1px solid #E2E8F0":"0"}}>
              <div style={{width:30,height:30,borderRadius:8,background:"#EFEDFD",color:"#5B4FE9",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <i data-lucide={it.icon} style={{width:14,height:14}}/>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#0F172A"}}>{it.label}</div>
                <div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{it.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onNext} style={{
          width:"100%",padding:"14px 24px",borderRadius:12,
          background:"linear-gradient(135deg,#5B4FE9,#4A3FCE)",color:"#FFF",border:0,
          fontSize:15,fontWeight:600,cursor:"pointer",
          display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,
          boxShadow:"0 8px 24px rgba(91,79,233,0.3)",transition:"all 120ms",
        }}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
          onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}
        >
          Check your device and start <i data-lucide="arrow-right" style={{width:16,height:16}}/>
        </button>
        <p style={{fontSize:12,color:"#94A3B8",margin:"12px 0 0"}}>This takes about 30 seconds. Make sure you are in a quiet place.</p>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   DEVICE CHECK
══════════════════════════════════════════ */
const DeviceCheck = ({onNext}) => {
  const checks = [
    {id:"camera",  label:"Camera",       icon:"camera",   detail:"Detected: FaceTime HD Camera",     extraType:"preview"},
    {id:"mic",     label:"Microphone",   icon:"mic",      detail:"Detected: Built-in Microphone",    extraType:"level"},
    {id:"speaker", label:"Speaker",      icon:"volume-2", detail:"System default",                   extraType:"test"},
    {id:"network", label:"Network",      icon:"wifi",     detail:"Stable · 18 Mbps",                 extraType:"speed"},
    {id:"screen",  label:"Single screen",icon:"monitor",  detail:"1 display detected",               extraType:"badge"},
  ];
  const [status, setStatus] = React.useState(Object.fromEntries(checks.map(c=>[c.id,"idle"])));
  const [speakerTest, setSpeakerTest] = React.useState(false);
  const [bars, setBars] = React.useState([0.4,0.7,0.5,0.8,0.6,0.4,0.9]);
  React.useEffect(()=>{window.lucide?.createIcons();},[status,speakerTest]);

  React.useEffect(()=>{
    let cancelled=false;
    const run=async()=>{
      const order=["camera","mic","network","screen"];
      for(const id of order){
        if(cancelled) return;
        setStatus(s=>({...s,[id]:"checking"}));
        await new Promise(r=>setTimeout(r,900));
        if(cancelled) return;
        setStatus(s=>({...s,[id]:"passed"}));
        await new Promise(r=>setTimeout(r,200));
      }
    };
    run();
    return ()=>{cancelled=true;};
  },[]);

  React.useEffect(()=>{
    if(status.mic!=="passed") return;
    const t=setInterval(()=>setBars(b=>b.map(()=>0.2+Math.random()*0.8)),200);
    return ()=>clearInterval(t);
  },[status.mic]);

  const allPassed = checks.every(c=>status[c.id]==="passed"||(c.id==="speaker"&&speakerTest));

  return (
    <div style={{padding:"40px 24px",maxWidth:540,margin:"0 auto"}}>
      <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:24,fontWeight:700,color:"#0F172A",margin:"0 0 4px",letterSpacing:"-0.02em"}}>Let's check your device</h1>
      <p style={{fontSize:14,color:"#6B7280",margin:"0 0 24px"}}>This takes about 30 seconds.</p>

      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        {checks.map((c,i)=>{
          const st = c.id==="speaker" ? (speakerTest?"passed":status.camera==="passed"?"idle":"idle") : status[c.id];
          const iconBg  = st==="passed"?"#ECFDF5":st==="checking"?"#EFEDFD":st==="failed"?"#FEF2F2":"#F1F5F9";
          const iconClr = st==="passed"?"#059669":st==="checking"?"#5B4FE9":st==="failed"?"#EF4444":"#94A3B8";
          return (
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,transition:"all 220ms"}}>
              <div style={{width:40,height:40,borderRadius:10,background:iconBg,color:iconClr,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 220ms"}}>
                <i data-lucide={c.icon} style={{width:18,height:18}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:"#0F172A"}}>{c.label}</div>
                <div style={{fontSize:12,color:"#6B7280",marginTop:1}}>
                  {st==="idle"&&"Waiting…"}
                  {st==="checking"&&<span style={{display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="loader-2" style={{width:12,height:12,animation:"v2spin 1s linear infinite"}}/>Checking…</span>}
                  {st==="passed"&&c.detail}
                  {st==="failed"&&<span style={{color:"#EF4444"}}>Failed — check permissions</span>}
                </div>
              </div>
              {/* right detail */}
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                {st==="passed"&&c.extraType==="level"&&(
                  <div style={{display:"flex",alignItems:"center",gap:2,height:24}}>
                    {bars.map((v,j)=><span key={j} style={{width:3,height:`${Math.max(6,v*22)}px`,background:"#5B4FE9",borderRadius:9999,transition:"height 180ms"}}/>)}
                  </div>
                )}
                {c.id==="speaker"&&st!=="passed"&&(
                  <button onClick={()=>{setSpeakerTest(true);setStatus(s=>({...s,speaker:"passed"}));}} style={{padding:"5px 10px",border:"1px solid #CBD5E1",borderRadius:7,background:"#FFF",fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}>
                    <i data-lucide="play" style={{width:11,height:11}}/> Test
                  </button>
                )}
                {st==="passed"&&<i data-lucide="check-circle-2" style={{width:20,height:20,color:"#10B981"}}/>}
                {st==="checking"&&<i data-lucide="loader-2" style={{width:20,height:20,color:"#94A3B8",animation:"v2spin 1s linear infinite"}}/>}
                {st==="failed"&&<i data-lucide="x-circle" style={{width:20,height:20,color:"#EF4444"}}/>}
              </div>
            </div>
          );
        })}
      </div>

      {allPassed&&(
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:10,marginBottom:14,color:"#047857",fontSize:13,fontWeight:600}}>
          <i data-lucide="check-circle-2" style={{width:15,height:15}}/> All checks passed — you're good to go!
        </div>
      )}

      <button onClick={onNext} disabled={!allPassed} style={{
        width:"100%",padding:"13px 20px",borderRadius:10,
        background:allPassed?"#5B4FE9":"#E2E8F0",color:allPassed?"#FFF":"#94A3B8",
        border:0,fontSize:14,fontWeight:600,cursor:allPassed?"pointer":"not-allowed",
        display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,
        boxShadow:allPassed?"0 8px 20px rgba(91,79,233,0.25)":"none",
        transition:"all 160ms",
      }}>
        Continue <i data-lucide="arrow-right" style={{width:14,height:14}}/>
      </button>
    </div>
  );
};

/* ══════════════════════════════════════════
   CONSENT
══════════════════════════════════════════ */
const ConsentScreen = ({onAgree, onDecline}) => {
  const [agreed, setAgreed] = React.useState(false);
  React.useEffect(()=>{window.lucide?.createIcons();},[agreed]);
  const items = [
    {icon:"video",      title:"Video recording",      body:"Your face and voice will be recorded for this session."},
    {icon:"camera",     title:"Periodic snapshots",   body:"Screenshots taken every 30 seconds during the interview."},
    {icon:"monitor",    title:"Tab & screen activity", body:"We detect tab switches, minimising, or external searches. Violations are logged."},
    {icon:"sparkles",   title:"AI processing",        body:"Your responses are analysed by AI to generate a performance report."},
    {icon:"database",   title:"Data retention",       body:"Data stored for 6 months, then permanently deleted. Request deletion anytime."},
  ];
  return (
    <div style={{padding:"40px 24px",maxWidth:600,margin:"0 auto"}}>
      <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:26,fontWeight:700,color:"#0F172A",letterSpacing:"-0.02em",margin:"0 0 6px"}}>Before you begin</h1>
      <p style={{fontSize:14,color:"#6B7280",margin:"0 0 24px"}}>Please review what will be recorded during your interview.</p>

      <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:14,padding:24,marginBottom:18,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
        {items.map((it,i)=>(
          <div key={it.title} style={{display:"flex",gap:14,padding:`${i===0?0:14}px 0 ${i===items.length-1?0:14}px`,borderTop:i===0?"0":"1px solid #F1F5F9"}}>
            <div style={{width:34,height:34,borderRadius:9,background:"#EFEDFD",color:"#5B4FE9",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <i data-lucide={it.icon} style={{width:16,height:16}}/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"#0F172A"}}>{it.title}</div>
              <div style={{fontSize:13,color:"#6B7280",marginTop:2,lineHeight:1.55}}>{it.body}</div>
            </div>
          </div>
        ))}
      </div>

      <label onClick={()=>setAgreed(!agreed)} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",background:agreed?"#F3F0FF":"#F8FAFC",border:`1px solid ${agreed?"#5B4FE9":"#E2E8F0"}`,borderRadius:10,cursor:"pointer",marginBottom:14,transition:"all 160ms"}}>
        <span style={{width:20,height:20,borderRadius:5,background:agreed?"#5B4FE9":"#FFF",border:`1.5px solid ${agreed?"#5B4FE9":"#CBD5E1"}`,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 160ms"}}>
          {agreed&&<i data-lucide="check" style={{width:13,height:13,color:"#FFF"}}/>}
        </span>
        <span style={{fontSize:13,color:"#0F172A",fontWeight:500}}>I have read and understand the above</span>
      </label>

      <button onClick={onAgree} disabled={!agreed} style={{
        width:"100%",padding:"13px 20px",borderRadius:10,border:0,
        background:agreed?"#5B4FE9":"#E2E8F0",color:agreed?"#FFF":"#94A3B8",
        fontSize:14,fontWeight:600,cursor:agreed?"pointer":"not-allowed",
        display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,
        boxShadow:agreed?"0 8px 20px rgba(91,79,233,0.25)":"none",transition:"all 160ms",
      }}>
        Start interview <i data-lucide="arrow-right" style={{width:14,height:14}}/>
      </button>

      <div style={{textAlign:"center",marginTop:12}}>
        <button onClick={onDecline} style={{background:"transparent",border:0,color:"#94A3B8",fontSize:13,cursor:"pointer",textDecoration:"underline",fontFamily:"inherit"}}>
          I do not consent
        </button>
      </div>
      <p style={{fontSize:11,color:"#94A3B8",textAlign:"center",margin:"16px 0 0",lineHeight:1.6}}>
        Request data deletion anytime: <a style={{color:"#5B4FE9"}}>privacy@screeno.io</a>
      </p>
    </div>
  );
};

/* ══════════════════════════════════════════
   AI SCREEN (the main interview room)
══════════════════════════════════════════ */
const AIScreenRoom = ({onEnd}) => {
  const QS = window.V2.AI_QUESTIONS;
  const ANSWERS = [
    "Sure — I'm a backend engineer with about 6 years in .NET. Most recently I built event-driven services on Postgres and Kafka.",
    "I'm looking for ownership of a meaningful backend domain, and a team that cares about reliability and clean design.",
    "I built an order-reconciliation service. The key tradeoff was a DB idempotency key versus a Redis dedupe cache — I chose the DB for durability across deploys.",
    "I lean on the outbox pattern and idempotent consumers, and keep operations commutative where possible so retries are safe.",
    "First I'd check latency percentiles and DB wait stats, then look for N+1 queries or lock contention before scaling reads.",
    "Yes — how is the team split between platform and product, and what does on-call look like?",
  ];
  const TOTAL = 25*60;
  const [qIndex, setQIndex]     = React.useState(0);
  const [phase, setPhase]       = React.useState("asking"); // asking|recording|processing|done
  const [transcript, setTx]     = React.useState([{who:"ai",t:"00:00",text:QS[0].text}]);
  const [muted, setMuted]       = React.useState(false);
  const [remaining, setRem]     = React.useState(TOTAL);
  const [qRemaining, setQRem]   = React.useState(QS[0].seconds);
  const [recElapsed, setRecEl]  = React.useState(0);
  const [warnVisible, setWarn]  = React.useState(false);
  const [tabSwitches, setTabs]  = React.useState(0);
  const txRef = React.useRef(null);
  const paused = warnVisible;
  const aiState = phase==="recording" ? "listening" : phase==="processing" ? "thinking" : "speaking";

  React.useEffect(()=>{window.lucide?.createIcons();},[phase,muted,warnVisible,qIndex]);
  // overall interview countdown
  React.useEffect(()=>{ if(paused||phase==="done") return; const t=setInterval(()=>setRem(r=>Math.max(0,r-1)),1000); return ()=>clearInterval(t); },[paused,phase]);
  // per-question countdown while recording
  React.useEffect(()=>{
    if(phase!=="recording"||paused) return;
    const t=setInterval(()=>{ setQRem(q=>Math.max(0,q-1)); setRecEl(e=>e+1); },1000);
    return ()=>clearInterval(t);
  },[phase,paused]);
  React.useEffect(()=>{ if(txRef.current) txRef.current.scrollTop=txRef.current.scrollHeight; },[transcript,phase]);

  const clk = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const startAnswer = () => { if(phase==="asking"){ setPhase("recording"); setRecEl(0); } };
  const stopAnswer = () => {
    if(phase!=="recording") return;
    setPhase("processing");
    const ans = ANSWERS[qIndex] || "…";
    setTx(t=>[...t,{who:"user",t:clk(TOTAL-remaining),text:ans}]);
    setTimeout(()=>{
      const next = qIndex+1;
      if(next<QS.length){
        setQIndex(next); setQRem(QS[next].seconds);
        setTx(t=>[...t,{who:"ai",t:clk(TOTAL-remaining),text:QS[next].text}]);
        setPhase("asking");
      } else {
        setPhase("done");
      }
    },1400);
  };

  const simulateTabSwitch = () => { setTabs(n=>n+1); setWarn(true); };
  const resumeAfterWarn = () => setWarn(false);

  const q = QS[qIndex];
  const orbState = {
    speaking:  {bg:"linear-gradient(135deg,#DEDAFB,#5B4FE9 70%,#4A3FCE)", shadow:"0 12px 36px rgba(91,79,233,0.35)", label:"Asking…",   iconName:"volume-2", labelColor:"#5B4FE9"},
    thinking:  {bg:"radial-gradient(circle at 35% 30%,#DEDAFB,#5B4FE9 90%)", shadow:"0 12px 28px rgba(91,79,233,0.18)", label:"Processing…", iconName:"loader-2", labelColor:"#94A3B8"},
    listening: {bg:"radial-gradient(circle at 35% 30%,#D1FAE5,#059669 75%)", shadow:"0 12px 28px rgba(5,150,105,0.32)", label:"Listening…", iconName:"ear", labelColor:"#059669"},
  }[aiState];

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 440px",minHeight:"calc(100vh - 132px)",position:"relative"}}>
      {/* Tab-switch warning overlay */}
      {warnVisible && (
        <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,0.7)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#FFF",borderRadius:16,padding:"32px 28px",maxWidth:420,textAlign:"center",boxShadow:"0 24px 48px rgba(15,23,42,0.24)"}}>
            <div style={{width:56,height:56,borderRadius:9999,background:"#FEF2F2",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
              <i data-lucide="alert-triangle" style={{width:26,height:26,color:"#EF4444"}}/>
            </div>
            <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:20,fontWeight:700,color:"#0F172A",marginBottom:8}}>Tab switch detected</div>
            <p style={{fontSize:13,color:"#6B7280",lineHeight:1.6,margin:"0 0 20px"}}>
              Leaving this tab during the interview is logged and may affect your evaluation. This is violation #{tabSwitches}. The interview is paused until you return.
            </p>
            <button onClick={resumeAfterWarn} style={{width:"100%",padding:"12px 20px",background:"#5B4FE9",color:"#FFF",border:0,borderRadius:10,fontWeight:600,fontSize:14,cursor:"pointer"}}>Resume interview</button>
          </div>
        </div>
      )}

      {/* Left — AI stage */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 48px",gap:22,background:"#FFF",borderRight:"1px solid #E2E8F0",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:480,height:480,borderRadius:9999,background:"radial-gradient(circle,rgba(91,79,233,0.08) 0%,transparent 70%)",filter:"blur(30px)"}}/>

        {/* recording + interview countdown */}
        <div style={{position:"absolute",top:16,left:16,display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:600}}>
          <span style={{width:7,height:7,borderRadius:9999,background:phase==="recording"?"#EF4444":"#94A3B8",animation:phase==="recording"?"v2pulse 1.4s ease-in-out infinite":"none"}}/>
          <span style={{color:phase==="recording"?"#EF4444":"#94A3B8"}}>{phase==="recording"?"RECORDING":"STANDBY"}</span>
        </div>
        <div style={{position:"absolute",top:14,right:16,display:"inline-flex",alignItems:"center",gap:6,fontFamily:"monospace",fontSize:13,fontWeight:700,color:remaining<120?"#EF4444":"#0F172A",background:"#F1F5F9",padding:"5px 10px",borderRadius:8,fontVariantNumeric:"tabular-nums"}}>
          <i data-lucide="clock" style={{width:13,height:13}}/>{clk(remaining)} left
        </div>

        {/* Orb */}
        <div style={{position:"relative",width:160,height:160,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {aiState==="listening" && [0,1,2].map(i=>(
            <span key={i} style={{position:"absolute",width:150,height:150,borderRadius:9999,border:"2px solid #059669",animation:`v2ring 2.4s ease-out ${i*800}ms infinite`,opacity:0}}/>
          ))}
          <div style={{width:130,height:130,borderRadius:9999,background:orbState.bg,boxShadow:orbState.shadow,display:"flex",alignItems:"center",justifyContent:"center",animation:paused?"none":"v2orbpulse 2s ease-in-out infinite",position:"relative"}}>
            <div style={{position:"absolute",inset:0,borderRadius:9999,background:"radial-gradient(circle at 35% 30%,rgba(255,255,255,0.5) 0%,transparent 40%)"}}/>
            <i data-lucide="sparkles" style={{width:46,height:46,color:"#FFF",position:"relative",zIndex:1}}/>
          </div>
        </div>

        <div style={{textAlign:"center"}}>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:4}}>Screeno AI · Question {qIndex+1} of {QS.length}</div>
          <div style={{fontSize:13,color:orbState.labelColor,display:"inline-flex",alignItems:"center",gap:6}}>
            <i data-lucide={orbState.iconName} style={{width:14,height:14,animation:aiState==="thinking"?"v2spin 1.2s linear infinite":"none"}}/>
            {orbState.label}
          </div>
        </div>

        {/* CURRENT QUESTION CARD — only ever shows the one current question */}
        <div style={{width:"100%",maxWidth:440,background:"#FAFAFE",border:"1px solid #DEDAFB",borderRadius:14,padding:"18px 20px",textAlign:"center"}}>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:8}}>{q?.phase}</div>
          <div style={{fontSize:16,color:"#0F172A",lineHeight:1.5,fontWeight:500}}>{phase==="done"?"That's the last question — thanks! You can end the interview now.":q?.text}</div>
          {phase!=="done" && (
            <div style={{marginTop:12,fontSize:12,color:phase==="recording"&&qRemaining<15?"#EF4444":"#94A3B8",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"monospace"}}>
              <i data-lucide="timer" style={{width:13,height:13}}/>{phase==="recording"?`Answer time ${clk(qRemaining)}`:`Suggested ${clk(q?.seconds||0)}`}
            </div>
          )}
        </div>

        {/* Waveform */}
        <div style={{display:"flex",alignItems:"center",gap:4,height:40}}>
          {[...Array(16)].map((_,i)=>(
            <span key={i} style={{width:4,height:34,borderRadius:9999,background:phase==="recording"?"#059669":aiState==="speaking"?"#5B4FE9":"#CBD5E1",animation:paused||phase==="processing"?"none":`v2wave 1.2s ease-in-out ${i*70}ms infinite`,transform:"scaleY(0.25)",transformOrigin:"center"}}/>
          ))}
        </div>

        {/* Controls: Start/Stop record + mute + end */}
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button onClick={()=>setMuted(m=>!m)} title="Mute" style={{width:52,height:52,borderRadius:9999,background:muted?"#FEF2F2":"#FFF",border:`1px solid ${muted?"#FECACA":"#CBD5E1"}`,color:muted?"#EF4444":"#0F172A",display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 120ms"}}>
            <i data-lucide={muted?"mic-off":"mic"} style={{width:20,height:20}}/>
          </button>

          {phase==="asking" && (
            <button onClick={startAnswer} style={{height:52,padding:"0 26px",borderRadius:9999,background:"#059669",color:"#FFF",border:0,fontSize:14,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8,boxShadow:"0 6px 16px rgba(5,150,105,0.3)"}}>
              <i data-lucide="circle" style={{width:16,height:16,fill:"#FFF"}}/> Start answer
            </button>
          )}
          {phase==="recording" && (
            <button onClick={stopAnswer} style={{height:52,padding:"0 26px",borderRadius:9999,background:"#EF4444",color:"#FFF",border:0,fontSize:14,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8,boxShadow:"0 6px 16px rgba(239,68,68,0.3)",animation:"v2recpulse 1.6s ease-in-out infinite"}}>
              <i data-lucide="square" style={{width:15,height:15,fill:"#FFF"}}/> Stop answer · {clk(recElapsed)}
            </button>
          )}
          {phase==="processing" && (
            <button disabled style={{height:52,padding:"0 26px",borderRadius:9999,background:"#E2E8F0",color:"#64748B",border:0,fontSize:14,fontWeight:600,display:"inline-flex",alignItems:"center",gap:8}}>
              <i data-lucide="loader-2" style={{width:16,height:16,animation:"v2spin 1s linear infinite"}}/> Processing…
            </button>
          )}
          {phase==="done" && (
            <button onClick={onEnd} style={{height:52,padding:"0 26px",borderRadius:9999,background:"#5B4FE9",color:"#FFF",border:0,fontSize:14,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8,boxShadow:"0 6px 16px rgba(91,79,233,0.3)"}}>
              <i data-lucide="check" style={{width:16,height:16}}/> Finish & submit
            </button>
          )}

          <button onClick={onEnd} title="End interview" style={{width:52,height:52,borderRadius:9999,background:"#FFF",border:"1px solid #FFD4C2",color:"#E0451F",display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <i data-lucide="phone-off" style={{width:20,height:20}}/>
          </button>
        </div>

        <p style={{fontSize:11,color:"#94A3B8",textAlign:"center",maxWidth:340,lineHeight:1.6}}>
          Press <strong>Start answer</strong> when you're ready, and <strong>Stop</strong> when done. The next question only appears after you finish — you won't see upcoming questions.
        </p>

        <button onClick={simulateTabSwitch} style={{position:"absolute",bottom:14,right:14,padding:"5px 10px",background:"#FFF",border:"1px solid #E2E8F0",borderRadius:7,fontSize:11,color:"#94A3B8",cursor:"pointer"}}>Simulate tab switch</button>
        <div style={{position:"absolute",bottom:14,left:14,width:84,height:84,borderRadius:9999,background:"linear-gradient(135deg,#475569,#1E293B)",border:"3px solid #FFF",boxShadow:"0 8px 20px rgba(15,23,42,0.2)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <window.V2Av name="Rahul Sharma" size={78}/>
        </div>
      </div>

      {/* Right — transcript (only what was actually asked/answered) */}
      <div style={{display:"flex",flexDirection:"column",background:"#FFF"}}>
        <div style={{padding:"16px 24px",borderBottom:"1px solid #F1F5F9"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#5B4FE9",letterSpacing:"0.05em",textTransform:"uppercase"}}>Live transcript</div>
          <div style={{fontSize:12,color:"#94A3B8",marginTop:2}}>Builds as the interview goes · upcoming questions stay hidden</div>
        </div>
        <div ref={txRef} style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
          {transcript.map((t,i)=>(
            <div key={i} style={{display:"flex",gap:12}}>
              {t.who==="ai" ? (
                <div style={{width:30,height:30,borderRadius:9999,background:"#EFEDFD",color:"#5B4FE9",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <i data-lucide="sparkles" style={{width:14,height:14}}/>
                </div>
              ) : <window.V2Av name="Rahul Sharma" size={30}/>}
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:600,color:t.who==="ai"?"#5B4FE9":"#0F172A"}}>{t.who==="ai"?"Screeno AI":"Rahul"}</span>
                  <span style={{fontFamily:"monospace",fontSize:11,color:"#94A3B8"}}>{t.t}</span>
                </div>
                <div style={{fontSize:14,color:"#374151",lineHeight:1.65}}>{t.text}</div>
              </div>
            </div>
          ))}
          {phase==="recording" && (
            <div style={{display:"flex",gap:12,opacity:0.7}}>
              <window.V2Av name="Rahul Sharma" size={30}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:4}}>Rahul · transcribing…</div>
                <div style={{display:"flex",gap:4,padding:"8px 0"}}>
                  {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:9999,background:"#94A3B8",animation:`v2pulsedot 1.4s ease-in-out ${i*0.2}s infinite`}}/>)}
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{padding:"14px 24px",borderTop:"1px solid #F1F5F9",fontSize:12,color:"#6B7280",display:"flex",alignItems:"center",gap:6}}>
          <i data-lucide="info" style={{width:13,height:13,color:"#94A3B8"}}/>
          Question {Math.min(qIndex+1,QS.length)} of {QS.length} · {clk(remaining)} remaining
        </div>
      </div>

      <style>{`
        @keyframes v2wave { 0%,100%{transform:scaleY(0.2);opacity:0.8} 50%{transform:scaleY(1);opacity:1} }
        @keyframes v2ring { 0%{transform:scale(0.6);opacity:0.7} 100%{transform:scale(1.8);opacity:0} }
        @keyframes v2orbpulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes v2pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
        @keyframes v2pulsedot { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes v2recpulse { 0%,100%{box-shadow:0 6px 16px rgba(239,68,68,0.3)} 50%{box-shadow:0 6px 22px rgba(239,68,68,0.55)} }
        @keyframes v2spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};

/* ══════════════════════════════════════════
   CANDIDATE STATUS DASHBOARD
══════════════════════════════════════════ */
const CandidateStatus = ({onNavigate}) => {
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  const steps = [
    {label:"Application",       state:"done",    when:"3 days ago"},
    {label:"Coding exam",       state:"done",    when:"2 days ago · 78%"},
    {label:"AI voice screen",   state:"active",  when:"Today · 4:30 PM"},
    {label:"Tech round",        state:"upcoming",when:"Scheduled after AI screen"},
    {label:"Decision",          state:"upcoming",when:"Typically 2 business days"},
  ];
  return (
    <div style={{maxWidth:680,margin:"0 auto",padding:"48px 24px"}}>
      <div style={{marginBottom:28}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#5B4FE9"}}>Acme Technologies</div>
        <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:36,fontWeight:700,color:"#0F172A",letterSpacing:"-0.025em",margin:"8px 0 6px"}}>Welcome back, Rahul.</h1>
        <p style={{fontSize:15,color:"#374151",lineHeight:1.6}}>Your AI voice screen is scheduled for <strong style={{color:"#0F172A"}}>today at 4:30 PM IST</strong>. It'll take about 25 minutes.</p>
      </div>

      {/* Next action */}
      <div style={{background:"#FFF",border:"1px solid #DEDAFB",borderRadius:14,padding:24,marginBottom:20,display:"flex",alignItems:"center",gap:20,boxShadow:"0 8px 24px rgba(91,79,233,0.06)"}}>
        <div style={{width:64,height:64,borderRadius:14,background:"linear-gradient(135deg,#5B4FE9,#4A3FCE)",display:"inline-flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 20px rgba(91,79,233,0.3)",flexShrink:0}}>
          <i data-lucide="mic" style={{width:28,height:28,color:"#FFF"}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:4}}>Next up</div>
          <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:20,fontWeight:700,color:"#0F172A",letterSpacing:"-0.01em"}}>AI voice interview</div>
          <div style={{fontSize:13,color:"#6B7280",marginTop:4,display:"flex",gap:14,flexWrap:"wrap"}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="clock" style={{width:12,height:12}}/>25 minutes</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="mic" style={{width:12,height:12}}/>Voice only</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="calendar" style={{width:12,height:12}}/>Today, 4:30 PM IST</span>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
          <button onClick={()=>onNavigate("c-device")} style={{padding:"11px 20px",borderRadius:10,background:"#5B4FE9",color:"#FFF",border:0,fontWeight:600,fontSize:14,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,boxShadow:"0 6px 14px rgba(91,79,233,0.25)"}}>
            Start now <i data-lucide="arrow-right" style={{width:14,height:14}}/>
          </button>
          <button style={{background:"transparent",border:0,color:"#94A3B8",fontSize:12,cursor:"pointer"}}>Reschedule</button>
        </div>
      </div>

      {/* Journey */}
      <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:14,padding:24,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:16}}>Your hiring journey</div>
        <div style={{position:"relative",paddingLeft:28}}>
          <div style={{position:"absolute",left:13,top:6,bottom:6,width:2,background:"#E2E8F0",borderRadius:9999}}/>
          {steps.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",position:"relative"}}>
              <span style={{
                position:"absolute",left:-28,
                width:26,height:26,borderRadius:9999,
                background:s.state==="done"?"#5B4FE9":s.state==="active"?"#FFF":"#FFF",
                border:s.state==="active"?"2px solid #5B4FE9":s.state==="upcoming"?"1px solid #E2E8F0":"0",
                boxShadow:s.state==="active"?"0 0 0 4px rgba(91,79,233,0.12)":"none",
                color:s.state==="done"?"#FFF":s.state==="active"?"#5B4FE9":"#94A3B8",
                display:"inline-flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:700,
              }}>
                {s.state==="done"?<i data-lucide="check" style={{width:13,height:13}}/>:
                 s.state==="active"?<span style={{width:8,height:8,borderRadius:9999,background:"#5B4FE9"}}/>:
                 <span style={{fontFamily:"monospace",fontSize:11}}>{i+1}</span>}
              </span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:s.state==="active"?600:500,color:s.state==="upcoming"?"#94A3B8":"#0F172A"}}>{s.label}</div>
                <div style={{fontSize:12,color:s.state==="active"?"#5B4FE9":"#6B7280",marginTop:1}}>{s.when}</div>
              </div>
              {s.state==="active"&&<span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:9999,background:"#EFEDFD",color:"#5B4FE9"}}>In progress</span>}
              {s.state==="done"&&<span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:9999,background:"#ECFDF5",color:"#047857"}}>Done</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   COMPLETION
══════════════════════════════════════════ */
const CompletionScreen = ({}) => {
  React.useEffect(()=>{window.lucide?.createIcons();},[]);
  const nexts = [
    {icon:"search",    title:"We review your answers",  body:"AI generates a detailed report of your interview performance."},
    {icon:"user-check",title:"Hiring team reviews",     body:"Our team reviews the report within 2–3 business days."},
    {icon:"mail",      title:"You'll hear from us",     body:"We'll email you at rahul.sharma@gmail.com with next steps."},
  ];
  return (
    <div style={{maxWidth:640,margin:"0 auto",padding:"60px 24px",textAlign:"center"}}>
      <div style={{width:80,height:80,borderRadius:9999,background:"#D1FAE5",display:"inline-flex",alignItems:"center",justifyContent:"center",boxShadow:"0 12px 28px rgba(5,150,105,0.18),0 0 0 8px rgba(16,185,129,0.08)",marginBottom:24,animation:"v2pop 400ms cubic-bezier(0.34,1.56,0.64,1)"}}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M11 20 L18 27 L30 14" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
            style={{strokeDasharray:40,strokeDashoffset:40,animation:"v2check 600ms cubic-bezier(0.2,0,0,1) 300ms forwards"}}/>
        </svg>
      </div>
      <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:32,fontWeight:700,color:"#0F172A",letterSpacing:"-0.025em",margin:"0 0 10px"}}>You're all done!</h1>
      <p style={{fontSize:15,color:"#374151",margin:"0 0 32px",lineHeight:1.6,maxWidth:440,marginLeft:"auto",marginRight:"auto"}}>
        Thanks for completing the interview for <strong>Senior .NET Developer</strong> at <strong>Acme Technologies</strong>.
      </p>

      {/* Feedback teaser */}
      <div style={{background:"#FFFBEB",border:"1px solid #FEF3C7",borderRadius:12,padding:"16px 20px",marginBottom:28,textAlign:"left"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,color:"#B45309",fontSize:13,fontWeight:600}}>
          <i data-lucide="lightbulb" style={{width:14,height:14}}/> Quick feedback for you
        </div>
        <div style={{fontSize:13,color:"#92400E",lineHeight:1.6}}>Strong technical depth on .NET! Consider practising system design at scale — a weak spot was identified in decomposition strategies. We've sent a detailed improvement guide to your email.</div>
      </div>

      <div style={{height:1,background:"#E2E8F0",margin:"0 0 28px"}}/>
      <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:16}}>What happens next</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,textAlign:"left",marginBottom:28}}>
        {nexts.map((n,i)=>(
          <div key={i} style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:18,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"#EFEDFD",color:"#5B4FE9",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:10}}>
              <i data-lucide={n.icon} style={{width:16,height:16}}/>
            </div>
            <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:4}}>{n.title}</div>
            <div style={{fontSize:12,color:"#6B7280",lineHeight:1.55}}>{n.body}</div>
          </div>
        ))}
      </div>
      <button style={{padding:"11px 20px",border:"1px solid #CBD5E1",borderRadius:10,background:"#FFF",fontSize:14,fontWeight:600,color:"#374151",cursor:"pointer",transition:"all 120ms"}} onMouseEnter={e=>e.currentTarget.style.background="#F1F5F9"} onMouseLeave={e=>e.currentTarget.style.background="#FFF"}>Close window</button>
      <style>{`@keyframes v2pop { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} } @keyframes v2check { to{stroke-dashoffset:0} }`}</style>
    </div>
  );
};

/* ══════════════════════════════════════════
   AI PREP LOADER — "AI is preparing your questions"
══════════════════════════════════════════ */
const AIPrepLoader = ({onReady, target="interview"}) => {
  const steps = [
    {label:"Reading the job description", icon:"file-text"},
    {label:"Analyzing your resume",       icon:"scan-search"},
    {label:target==="exam"?"Generating exam questions":"Generating tailored questions", icon:"sparkles"},
    {label:target==="exam"?"Loading the exam environment":"Setting up your interview room", icon:"monitor-check"},
  ];
  const [active, setActive] = React.useState(0);
  React.useEffect(()=>{window.lucide?.createIcons();},[active]);
  React.useEffect(()=>{
    if(active>=steps.length){ const t=setTimeout(onReady,500); return ()=>clearTimeout(t); }
    const t=setTimeout(()=>setActive(a=>a+1),750);
    return ()=>clearTimeout(t);
  },[active]);
  const pct = Math.min(100, Math.round((active/steps.length)*100));
  return (
    <div style={{minHeight:"calc(100vh - 132px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 24px"}}>
      <div style={{maxWidth:460,width:"100%",textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:18,background:"linear-gradient(135deg,#5B4FE9,#4A3FCE)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:22,boxShadow:"0 12px 28px rgba(91,79,233,0.3)",animation:"v2orbpulse 2s ease-in-out infinite"}}>
          <i data-lucide="sparkles" style={{width:32,height:32,color:"#FFF"}}/>
        </div>
        <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:24,fontWeight:700,color:"#0F172A",letterSpacing:"-0.02em",margin:"0 0 6px"}}>Preparing your {target==="exam"?"exam":"interview"}</h1>
        <p style={{fontSize:14,color:"#6B7280",margin:"0 0 26px"}}>Screeno AI is generating questions tailored to this role. This takes a few seconds.</p>

        <div style={{height:4,background:"#EFEDFD",borderRadius:9999,overflow:"hidden",marginBottom:22}}>
          <div style={{height:"100%",width:`${pct}%`,background:"#5B4FE9",borderRadius:9999,transition:"width 600ms cubic-bezier(0.2,0,0,1)"}}/>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10,textAlign:"left"}}>
          {steps.map((s,i)=>{
            const done=i<active, cur=i===active;
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFF",border:`1px solid ${cur?"#DEDAFB":"#E2E8F0"}`,borderRadius:10,opacity:i>active?0.5:1,transition:"all 200ms"}}>
                <div style={{width:34,height:34,borderRadius:9,background:done?"#ECFDF5":cur?"#EFEDFD":"#F1F5F9",color:done?"#059669":cur?"#5B4FE9":"#94A3B8",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {done?<i data-lucide="check" style={{width:16,height:16}}/>:cur?<i data-lucide="loader-2" style={{width:16,height:16,animation:"v2spin 1s linear infinite"}}/>:<i data-lucide={s.icon} style={{width:16,height:16}}/>}
                </div>
                <span style={{fontSize:14,fontWeight:cur?600:500,color:i>active?"#94A3B8":"#0F172A"}}>{s.label}</span>
              </div>
            );
          })}
        </div>
        <p style={{fontSize:12,color:"#94A3B8",marginTop:20,display:"inline-flex",alignItems:"center",gap:6}}>
          <i data-lucide="lock" style={{width:12,height:12}}/> Questions are generated live and never shown to you in advance.
        </p>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   EXAM RUNNER — MCQ section + coding question with mock IDE
══════════════════════════════════════════ */
const ExamRunner = ({onSubmit}) => {
  const {EXAM} = window.V2;
  const total = EXAM.mcqs.length; // last view index === coding
  const [view, setView]       = React.useState(0); // 0..total-1 mcq, total = coding
  const [answers, setAnswers] = React.useState({});
  const [lang, setLang]       = React.useState(EXAM.coding.languages[0]);
  const [code, setCode]       = React.useState(EXAM.coding.starter[EXAM.coding.languages[0]]);
  const [output, setOutput]   = React.useState(null);
  const [running, setRunning] = React.useState(false);
  const [remaining, setRem]   = React.useState(EXAM.durationMin*60);
  const [submitted, setSub]   = React.useState(false);
  const gutterRef = React.useRef(null);
  React.useEffect(()=>{window.lucide?.createIcons();},[view,running,output,submitted]);
  React.useEffect(()=>{ if(submitted) return; const t=setInterval(()=>setRem(r=>Math.max(0,r-1)),1000); return ()=>clearInterval(t); },[submitted]);
  const clk = s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const isCoding = view===total;

  const onLang = (l)=>{ setLang(l); setCode(EXAM.coding.starter[l]); setOutput(null); };
  const runCode = ()=>{
    setRunning(true); setOutput(null);
    setTimeout(()=>{
      let results=[];
      const cases=[{a:[[2,7,11,15],9],e:[0,1]},{a:[[3,2,4],6],e:[1,2]},{a:[[3,3],6],e:[0,1]}];
      if(lang==="JavaScript"){
        try{
          const fn=new Function(code+"\n;return typeof twoSum!=='undefined'?twoSum:null;")();
          if(typeof fn!=="function") throw new Error("Define a function named twoSum");
          results=cases.map((c,i)=>{ let pass=false,got; try{ got=fn(c.a[0],c.a[1]); pass=JSON.stringify(got)===JSON.stringify(c.e);}catch(err){got=String(err.message||err);} return {name:EXAM.coding.tests[i].name,pass,got:JSON.stringify(got)}; });
        }catch(err){ results=[{name:"Compilation",pass:false,got:String(err.message||err)}]; }
      } else {
        const ok=code.replace(EXAM.coding.starter[lang],"").trim().length>15;
        results=EXAM.coding.tests.map(t=>({name:t.name,pass:ok,got:ok?t.expected:"(no return — write your solution)"}));
      }
      setOutput(results); setRunning(false);
    },700);
  };

  const answeredCount = Object.keys(answers).length;
  if(submitted){
    const correct = EXAM.mcqs.filter(m=>answers[m.id]===m.answer).length;
    const passed = output ? output.filter(o=>o.pass).length : 0;
    return (
      <div style={{maxWidth:560,margin:"0 auto",padding:"60px 24px",textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:9999,background:"#D1FAE5",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>
          <i data-lucide="check-circle-2" style={{width:34,height:34,color:"#059669"}}/>
        </div>
        <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:26,fontWeight:700,color:"#0F172A",margin:"0 0 8px"}}>Exam submitted</h1>
        <p style={{fontSize:14,color:"#6B7280",margin:"0 0 24px"}}>Your answers were recorded. Results will appear in your report.</p>
        <div style={{display:"flex",gap:14,justifyContent:"center",marginBottom:28}}>
          <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:"16px 24px"}}>
            <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:26,fontWeight:700,color:"#0F172A"}}>{correct}/{total}</div>
            <div style={{fontSize:12,color:"#6B7280",marginTop:2}}>MCQ correct</div>
          </div>
          <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:"16px 24px"}}>
            <div style={{fontFamily:"var(--font-display,'Inter')",fontSize:26,fontWeight:700,color:"#0F172A"}}>{passed}/{EXAM.coding.tests.length}</div>
            <div style={{fontSize:12,color:"#6B7280",marginTop:2}}>Tests passed</div>
          </div>
        </div>
        <button onClick={onSubmit} style={{padding:"12px 26px",borderRadius:10,background:"#5B4FE9",color:"#FFF",border:0,fontWeight:600,fontSize:14,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8}}>
          Continue <i data-lucide="arrow-right" style={{width:14,height:14}}/>
        </button>
      </div>
    );
  }

  return (
    <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:0,height:"calc(100vh - 132px)",background:"#F8FAFC"}}>
      {/* Palette */}
      <div style={{borderRight:"1px solid #E2E8F0",background:"#FFF",padding:18,display:"flex",flexDirection:"column",gap:16,overflowY:"auto"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,fontFamily:"monospace",fontSize:16,fontWeight:700,color:remaining<300?"#EF4444":"#0F172A",background:"#F1F5F9",padding:"8px 12px",borderRadius:8,justifyContent:"center"}}>
          <i data-lucide="clock" style={{width:15,height:15}}/>{clk(remaining)}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#94A3B8",marginBottom:8}}>Multiple choice</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
            {EXAM.mcqs.map((m,i)=>(
              <button key={m.id} onClick={()=>setView(i)} style={{
                aspectRatio:"1",borderRadius:8,fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
                border:`1px solid ${view===i?"#5B4FE9":answers[m.id]!=null?"#A7F3D0":"#E2E8F0"}`,
                background:view===i?"#5B4FE9":answers[m.id]!=null?"#ECFDF5":"#FFF",
                color:view===i?"#FFF":answers[m.id]!=null?"#047857":"#6B7280",
              }}>{i+1}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#94A3B8",marginBottom:8}}>Coding</div>
          <button onClick={()=>setView(total)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
            border:`1px solid ${isCoding?"#5B4FE9":"#E2E8F0"}`,background:isCoding?"#EFEDFD":"#FFF",color:isCoding?"#3A31A3":"#374151"}}>
            <i data-lucide="code-2" style={{width:15,height:15}}/> {EXAM.coding.title}
          </button>
        </div>
        <div style={{marginTop:"auto",fontSize:12,color:"#6B7280"}}>{answeredCount}/{total} MCQs answered</div>
        <button onClick={()=>setSub(true)} style={{padding:"11px 0",borderRadius:9,background:"#5B4FE9",color:"#FFF",border:0,fontWeight:600,fontSize:13,cursor:"pointer"}}>Submit exam</button>
      </div>

      {/* Main */}
      <div style={{overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {!isCoding && (
          <div style={{padding:"32px 40px",overflowY:"auto"}}>
            <div style={{maxWidth:680}}>
              <div style={{fontSize:12,fontWeight:600,color:"#5B4FE9",marginBottom:8}}>Question {view+1} of {total}</div>
              <h2 style={{fontSize:20,fontWeight:600,color:"#0F172A",lineHeight:1.5,margin:"0 0 22px"}}>{EXAM.mcqs[view].q}</h2>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {EXAM.mcqs[view].options.map((opt,oi)=>{
                  const sel=answers[EXAM.mcqs[view].id]===oi;
                  return (
                    <button key={oi} onClick={()=>setAnswers(a=>({...a,[EXAM.mcqs[view].id]:oi}))} style={{
                      display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:10,textAlign:"left",fontFamily:"inherit",cursor:"pointer",
                      border:`1px solid ${sel?"#5B4FE9":"#E2E8F0"}`,background:sel?"#F3F0FF":"#FFF",transition:"all 120ms",
                    }}>
                      <span style={{width:24,height:24,borderRadius:9999,flexShrink:0,border:`1.5px solid ${sel?"#5B4FE9":"#CBD5E1"}`,background:sel?"#5B4FE9":"#FFF",color:"#FFF",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>
                        {sel?<i data-lucide="check" style={{width:13,height:13}}/>:String.fromCharCode(65+oi)}
                      </span>
                      <span style={{fontSize:14,color:"#0F172A"}}>{opt}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:28}}>
                <button onClick={()=>setView(v=>Math.max(0,v-1))} disabled={view===0} style={{padding:"10px 18px",borderRadius:8,border:"1px solid #CBD5E1",background:"#FFF",color:view===0?"#CBD5E1":"#374151",fontWeight:600,fontSize:13,cursor:view===0?"not-allowed":"pointer"}}>Previous</button>
                <button onClick={()=>setView(v=>v+1)} style={{padding:"10px 18px",borderRadius:8,border:0,background:"#5B4FE9",color:"#FFF",fontWeight:600,fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
                  {view===total-1?"Go to coding":"Next"} <i data-lucide="arrow-right" style={{width:13,height:13}}/>
                </button>
              </div>
            </div>
          </div>
        )}

        {isCoding && (
          <div style={{display:"grid",gridTemplateColumns:"360px 1fr",height:"100%",minHeight:0}}>
            {/* prompt */}
            <div style={{borderRight:"1px solid #E2E8F0",background:"#FFF",padding:"24px 22px",overflowY:"auto"}}>
              <div style={{fontSize:12,fontWeight:600,color:"#5B4FE9",marginBottom:6}}>Coding challenge</div>
              <h2 style={{fontSize:18,fontWeight:700,color:"#0F172A",margin:"0 0 12px"}}>{EXAM.coding.title}</h2>
              <p style={{fontSize:13,color:"#374151",lineHeight:1.6,margin:"0 0 16px"}}>{EXAM.coding.prompt}</p>
              <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#94A3B8",marginBottom:8}}>Examples</div>
              {EXAM.coding.examples.map((e,i)=>(
                <div key={i} style={{background:"#0F172A",borderRadius:8,padding:"10px 12px",marginBottom:8,fontFamily:"monospace",fontSize:12}}>
                  <div style={{color:"#94A3B8"}}>input&nbsp;: <span style={{color:"#E2E8F0"}}>{e.in}</span></div>
                  <div style={{color:"#94A3B8"}}>output: <span style={{color:"#86EFAC"}}>{e.out}</span></div>
                </div>
              ))}
            </div>
            {/* IDE */}
            <div style={{display:"flex",flexDirection:"column",background:"#0F172A",minHeight:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #1E293B"}}>
                <div style={{display:"flex",gap:6}}>
                  {EXAM.coding.languages.map(l=>(
                    <button key={l} onClick={()=>onLang(l)} style={{padding:"5px 12px",borderRadius:6,border:0,fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",background:lang===l?"#5B4FE9":"#1E293B",color:lang===l?"#FFF":"#94A3B8"}}>{l}</button>
                  ))}
                </div>
                <button onClick={runCode} disabled={running} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:7,border:0,background:"#059669",color:"#FFF",fontWeight:600,fontSize:12,cursor:running?"wait":"pointer"}}>
                  <i data-lucide={running?"loader-2":"play"} style={{width:13,height:13,animation:running?"v2spin 1s linear infinite":"none"}}/> {running?"Running…":"Run code"}
                </button>
              </div>
              {/* editor with gutter */}
              <div style={{flex:1,display:"flex",minHeight:0,position:"relative"}}>
                <div ref={gutterRef} style={{padding:"14px 8px 14px 14px",fontFamily:"monospace",fontSize:13,lineHeight:"21px",color:"#475569",textAlign:"right",userSelect:"none",overflow:"hidden",background:"#0B1220"}}>
                  {code.split("\n").map((_,i)=><div key={i}>{i+1}</div>)}
                </div>
                <textarea value={code} onChange={e=>setCode(e.target.value)} spellCheck={false}
                  onScroll={e=>{if(gutterRef.current)gutterRef.current.scrollTop=e.target.scrollTop;}}
                  style={{flex:1,resize:"none",border:0,outline:"none",background:"#0F172A",color:"#E2E8F0",fontFamily:"monospace",fontSize:13,lineHeight:"21px",padding:"14px 16px",tabSize:2}}/>
              </div>
              {/* output */}
              <div style={{borderTop:"1px solid #1E293B",background:"#0B1220",padding:"12px 16px",maxHeight:170,overflowY:"auto"}}>
                <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#64748B",marginBottom:8}}>Console</div>
                {!output && !running && <div style={{fontFamily:"monospace",fontSize:12,color:"#64748B"}}>Run your code to see test results.</div>}
                {running && <div style={{fontFamily:"monospace",fontSize:12,color:"#94A3B8"}}>Running {EXAM.coding.tests.length} tests…</div>}
                {output && output.map((r,i)=>(
                  <div key={i} style={{fontFamily:"monospace",fontSize:12,display:"flex",gap:8,marginBottom:4,color:r.pass?"#86EFAC":"#FCA5A5"}}>
                    <i data-lucide={r.pass?"check":"x"} style={{width:13,height:13,marginTop:1,flexShrink:0}}/>
                    <span><span style={{color:"#94A3B8"}}>{r.name}</span> → {r.got}</span>
                  </div>
                ))}
                {output && <div style={{fontFamily:"monospace",fontSize:12,color:"#E2E8F0",marginTop:6,fontWeight:700}}>{output.filter(o=>o.pass).length}/{output.length} passed</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   CANDIDATE PROFILE + ACCOUNT SETTINGS (self edit)
══════════════════════════════════════════ */
const CandidateProfileScreen = ({onBack}) => {
  const store = window.useV2Store();
  const p = store.get().candidate;
  const settings = store.get().settings;
  const [tab, setTab] = React.useState("profile");
  const [form, setForm] = React.useState({...p});
  const [skillStr, setSkillStr] = React.useState((p.skills||[]).join(", "));
  const [saved, setSaved] = React.useState(false);
  React.useEffect(()=>{window.lucide?.createIcons();},[tab,saved]);
  const set=(k,v)=>{setForm(f=>({...f,[k]:v}));setSaved(false);};
  const save=()=>{ store.update(s=>{ Object.assign(s.candidate, form); s.candidate.skills=skillStr.split(",").map(t=>t.trim()).filter(Boolean); }); setSaved(true); };
  const toggle=(k)=>store.update(s=>{s.settings[k]=!s.settings[k];});
  const fields=[
    {k:"name",label:"Full name"},{k:"role",label:"Current / desired role"},
    {k:"email",label:"Email"},{k:"phone",label:"Phone"},
    {k:"loc",label:"Location"},{k:"exp",label:"Experience"},
    {k:"noticePeriod",label:"Notice period"},{k:"github",label:"GitHub"},
    {k:"linkedin",label:"LinkedIn"},
  ];
  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:"32px 24px",animation:"v2fade 280ms"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:0,color:"#5B4FE9",fontWeight:500,fontSize:13,cursor:"pointer",marginBottom:20}}>
        <i data-lucide="arrow-left" style={{width:16,height:16}}/>Back to dashboard
      </button>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
        <window.V2Av name={form.name||"R"} size={64} ring="#DEDAFB"/>
        <div>
          <h1 style={{fontFamily:"var(--font-display,'Inter')",fontSize:24,fontWeight:700,color:"#0F172A",margin:0,letterSpacing:"-0.02em"}}>{form.name}</h1>
          <p style={{fontSize:13,color:"#6B7280",marginTop:3}}>{form.role} · {form.loc}</p>
        </div>
      </div>
      <div style={{display:"flex",gap:4,borderBottom:"1px solid #E2E8F0",marginBottom:20}}>
        {[{id:"profile",label:"My profile"},{id:"settings",label:"Account settings"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"transparent",border:0,padding:"10px 14px",fontSize:13,fontWeight:tab===t.id?600:500,color:tab===t.id?"#3A31A3":"#6B7280",borderBottom:tab===t.id?"2px solid #5B4FE9":"2px solid transparent",marginBottom:-1,cursor:"pointer",fontFamily:"inherit"}}>{t.label}</button>
        ))}
      </div>
      {tab==="profile" && (
        <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:20,boxShadow:"0 1px 3px rgba(15,23,42,0.04)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {fields.map(f=>(
              <div key={f.k}>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>{f.label}</label>
                <input value={form[f.k]||""} onChange={e=>set(f.k,e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E1",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}
                  onFocus={e=>{e.target.style.borderColor="#5B4FE9";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
                  onBlur={e=>{e.target.style.borderColor="#CBD5E1";e.target.style.boxShadow="none";}}/>
              </div>
            ))}
            <div style={{gridColumn:"1 / -1"}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Skills <span style={{color:"#94A3B8",fontWeight:400}}>(comma separated)</span></label>
              <input value={skillStr} onChange={e=>{setSkillStr(e.target.value);setSaved(false);}} style={{width:"100%",padding:"9px 12px",border:"1px solid #CBD5E1",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}
                onFocus={e=>{e.target.style.borderColor="#5B4FE9";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
                onBlur={e=>{e.target.style.borderColor="#CBD5E1";e.target.style.boxShadow="none";}}/>
            </div>
            <div style={{gridColumn:"1 / -1"}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>About</label>
              <textarea value={form.about||""} onChange={e=>set("about",e.target.value)} rows={3} style={{width:"100%",padding:"10px 12px",border:"1px solid #CBD5E1",borderRadius:8,fontSize:13,fontFamily:"inherit",lineHeight:1.55,outline:"none",resize:"vertical"}}
                onFocus={e=>{e.target.style.borderColor="#5B4FE9";e.target.style.boxShadow="0 0 0 3px rgba(91,79,233,0.18)";}}
                onBlur={e=>{e.target.style.borderColor="#CBD5E1";e.target.style.boxShadow="none";}}/>
            </div>
            <div style={{gridColumn:"1 / -1"}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Resume</label>
              <div style={{border:"1px dashed #CBD5E1",borderRadius:8,padding:"14px 12px",textAlign:"center",fontSize:13,color:"#94A3B8",cursor:"pointer"}}>
                <i data-lucide="upload-cloud" style={{width:15,height:15}}/> Replace resume (PDF / DOCX)
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:18}}>
            <button onClick={save} style={{padding:"10px 18px",borderRadius:8,background:"#5B4FE9",color:"#FFF",border:0,fontWeight:600,fontSize:13,cursor:"pointer"}}>Save changes</button>
            {saved && <span style={{fontSize:13,color:"#047857",display:"inline-flex",alignItems:"center",gap:5}}><i data-lucide="check-circle-2" style={{width:14,height:14}}/>Saved</span>}
          </div>
        </div>
      )}
      {tab==="settings" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:20}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:8}}>Notifications</div>
            {[
              {k:"notifyEmail",label:"Email updates",desc:"Interview invites and results by email"},
              {k:"notifyReminders",label:"Interview reminders",desc:"Remind me before scheduled interviews"},
              {k:"notifyResults",label:"Feedback ready",desc:"Tell me when my report is available"},
            ].map((o,i)=>(
              <div key={o.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderTop:i?"1px solid #F1F5F9":"0"}}>
                <div><div style={{fontSize:13,fontWeight:600,color:"#0F172A"}}>{o.label}</div><div style={{fontSize:12,color:"#6B7280",marginTop:1}}>{o.desc}</div></div>
                <window.V2Toggle on={settings[o.k]} onClick={()=>toggle(o.k)}/>
              </div>
            ))}
          </div>
          <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:20}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#5B4FE9",marginBottom:8}}>Security</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0"}}>
              <div><div style={{fontSize:13,fontWeight:600,color:"#0F172A"}}>Two-factor authentication</div><div style={{fontSize:12,color:"#6B7280",marginTop:1}}>Extra security at sign-in</div></div>
              <window.V2Toggle on={settings.twoFactor} onClick={()=>toggle("twoFactor")}/>
            </div>
            <div style={{paddingTop:12,borderTop:"1px solid #F1F5F9",display:"flex",gap:8}}>
              <button style={{padding:"8px 14px",borderRadius:8,border:"1px solid #CBD5E1",background:"#FFF",fontWeight:600,fontSize:13,color:"#374151",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}><i data-lucide="key-round" style={{width:13,height:13}}/> Change password</button>
              <button style={{padding:"8px 14px",borderRadius:8,border:"1px solid #FFD4C2",background:"#FFF",fontWeight:600,fontSize:13,color:"#B53618",cursor:"pointer"}}>Delete my data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, {
  CandidateLanding, DeviceCheck, ConsentScreen,
  AIScreenRoom, CandidateStatus, CompletionScreen,
  AIPrepLoader, ExamRunner, CandidateProfileScreen,
});
