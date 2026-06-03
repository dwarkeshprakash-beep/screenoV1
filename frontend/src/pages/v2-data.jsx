/* Screeno v2 — Mock data */
const V2_TEAM = [
  { id:1, name:"Raj Mehta",      role:"Senior .NET Developer",    skills:[".NET","SQL","Docker"],          assess:{s:"up-to-date",ago:"12 days ago"},  upcoming:"—",               email:"raj.m@acme.co",      phone:"+91 98765 11111", resumeUpdated:"Mar 12, 2026", loc:"Bangalore", exp:"6 yrs", manager:"Kiran Patel" },
  { id:2, name:"Divya Iyer",     role:"React Frontend Engineer",  skills:["React","TypeScript","CSS"],     assess:{s:"up-to-date",ago:"4 days ago"},    upcoming:"Scheduled · Jun 2", email:"divya.i@acme.co",    phone:"+91 98765 22222", resumeUpdated:"Apr 3, 2026",  loc:"Hyderabad", exp:"4 yrs", manager:"Kiran Patel" },
  { id:3, name:"Arjun Kulkarni", role:".NET Developer",           skills:[".NET","C#"],                   assess:{s:"overdue",ago:"95 days ago"},      upcoming:"—",               email:"arjun.k@acme.co",    phone:"+91 98765 33333", resumeUpdated:"Jan 18, 2026", loc:"Pune",      exp:"5 yrs", manager:"Kiran Patel" },
  { id:4, name:"Preethi Nair",   role:"DevOps Engineer",          skills:[],                             assess:{s:"never",ago:"Never"},             upcoming:"—",               email:"preethi.n@acme.co",  phone:"+91 98765 44444", resumeUpdated:null,           loc:"Remote",    exp:"3 yrs", manager:"Kiran Patel" },
  { id:5, name:"Suresh Babu",    role:"Full Stack Engineer",      skills:["Node.js","React","MongoDB"],   assess:{s:"up-to-date",ago:"30 days ago"},   upcoming:"—",               email:"suresh.b@acme.co",   phone:"+91 98765 55555", resumeUpdated:"Apr 28, 2026", loc:"Chennai",   exp:"7 yrs", manager:"Kiran Patel" },
  { id:6, name:"Kavitha Reddy",  role:"Backend Engineer",         skills:["Java","Spring"],               assess:{s:"overdue",ago:"102 days ago"},     upcoming:"—",               email:"kavitha.r@acme.co",  phone:"+91 98765 66666", resumeUpdated:"Feb 1, 2026",  loc:"Bangalore", exp:"8 yrs", manager:"Kiran Patel" },
];

const V2_EXTERNAL = [
  { id:101, name:"Rahul Sharma",   email:"rahul.sharma@gmail.com",  role:"Senior .NET Developer",          stage:"interview",  score:4.4, applied:"2 days ago",   source:"Naukri",   loc:"Bangalore", exp:"6 yrs", next:"AI screen · today 4:30 PM",   resumeUpdated:"May 25, 2026", attempts:{ done:1, total:3 } },
  { id:102, name:"Priya Patel",    email:"priya.p@outlook.com",     role:"React Frontend Developer",       stage:"screening",  score:4.1, applied:"3 days ago",   source:"Referral", loc:"Hyderabad", exp:"4 yrs", next:"Coding exam pending",         resumeUpdated:"May 24, 2026", attempts:{ done:0, total:3 } },
  { id:103, name:"Ankit Verma",    email:"ankit.v@gmail.com",       role:"Full Stack Engineer",            stage:"offer",      score:4.7, applied:"1 week ago",   source:"LinkedIn", loc:"Pune",      exp:"5 yrs", next:"Offer accepted",              resumeUpdated:"May 20, 2026", attempts:{ done:3, total:3 } },
  { id:104, name:"Sneha Joshi",    email:"sneha.j@gmail.com",       role:"React Frontend Developer",       stage:"screening",  score:3.6, applied:"4 days ago",   source:"Referral", loc:"Mumbai",    exp:"3 yrs", next:"Awaiting result",             resumeUpdated:"May 22, 2026", attempts:{ done:1, total:3 } },
  { id:105, name:"Karthik Reddy",  email:"karthik.r@yahoo.in",      role:"DevOps Engineer",                stage:"applied",    score:null,applied:"Yesterday",     source:"LinkedIn", loc:"Hyderabad", exp:"7 yrs", next:"Send invite",                 resumeUpdated:"May 27, 2026", attempts:{ done:0, total:5 } },
  { id:106, name:"Meera Pillai",   email:"meera.p@gmail.com",       role:"Senior .NET Developer",          stage:"interview",  score:4.1, applied:"5 days ago",   source:"LinkedIn", loc:"Hyderabad", exp:"4 yrs", next:"AI screen · tomorrow",        resumeUpdated:"May 23, 2026", attempts:{ done:2, total:3 } },
  { id:107, name:"Arjun Nair",     email:"arjun.n@gmail.com",       role:"Mobile Engineer",                stage:"applied",    score:null,applied:"Today",         source:"Referral", loc:"Bangalore", exp:"5 yrs", next:"Send invite",                 resumeUpdated:"May 28, 2026", attempts:{ done:0, total:3 } },
  { id:108, name:"Divya Singh",    email:"divya.s@gmail.com",       role:"React Frontend Developer",       stage:"screening",  score:null,applied:"Just now",      source:"Naukri",   loc:"Chennai",   exp:"2 yrs", next:"AI screening in progress",    resumeUpdated:"May 28, 2026", attempts:{ done:0, total:3 } },
];

const V2_JOBS = [
  { id:"j1", title:"Senior .NET Developer",    loc:"Bangalore (Hybrid)", candidates:8,  status:"Active", jd:true },
  { id:"j2", title:"React Frontend Developer", loc:"Bangalore (Hybrid)", candidates:12, status:"Active", jd:true },
  { id:"j3", title:"DevOps Engineer",          loc:"Remote",             candidates:5,  status:"Active", jd:false },
];

const V2_ACTIVITY = [
  { what:"AI Screen passed: Divya Singh",   sub:"React Developer (Score: 4.1/5)",       when:"10 mins ago" },
  { what:"Exam completed: Karthik Reddy",  sub:"DevOps Engineer (Score: 78%)",          when:"2 hours ago" },
  { what:"Rahul Sharma Advanced",           sub:"Moved to Technical Round 2",            when:"Yesterday" },
  { what:"Meera Pillai — Attempt 2 done",  sub:"Senior .NET · score 4.1",              when:"Yesterday" },
];

const V2_SCHEDULE_EVENTS = [
  { day:1, start:10.5, dur:0.5, title:"AI screen · Rahul Sharma",  sub:"Senior .NET",    type:"ai",    candidate:101 },
  { day:1, start:14.0, dur:1.0, title:"Tech Round · Divya Iyer",   sub:"React Frontend", type:"human", candidate:null },
  { day:2, start:11.0, dur:0.5, title:"AI screen · Meera Pillai",  sub:"Senior .NET",    type:"ai",    candidate:106 },
  { day:2, start:15.0, dur:1.0, title:"Coding exam window",         sub:"4 candidates",   type:"exam",  candidate:null },
  { day:3, start:9.0,  dur:1.0, title:"Final round · Priya Patel", sub:"React Frontend", type:"human", candidate:102 },
  { day:4, start:13.0, dur:0.5, title:"AI screen · Arjun Nair",    sub:"Mobile Engineer",type:"ai",    candidate:107 },
  { day:4, start:16.0, dur:1.0, title:"Offer call · Ankit Verma",  sub:"Full Stack",     type:"human", candidate:103 },
];

const V2_TRANSCRIPT = [
  { who:"ai",   t:"00:00", text:"Hi Rahul, thanks for taking the time today. I'll ask you a few questions about your recent work in .NET and then a couple of system design scenarios. Sound good?" },
  { who:"user", t:"00:08", text:"Yes, that sounds good. I'm ready." },
  { who:"ai",   t:"00:11", text:"Great. To start, tell me about a recent backend service you built in .NET — what it does and one technical decision you made." },
  { who:"user", t:"00:18", text:"Sure. Most recently I built an order-reconciliation service for a fintech client. It consumes events from Kafka, dedupes them, and writes settled orders to Postgres. The trickiest decision was choosing between an idempotency key in the database versus a Redis dedupe cache." },
  { who:"user", t:"00:42", text:"I went with the database approach because we needed durability across deploys, and the write volume was modest — about 200 writes per second peak." },
  { who:"ai",   t:"00:56", text:"Good context. Why did you not use the outbox pattern there?" },
  { who:"user", t:"01:02", text:"The producer was a third-party system we didn't own, so an outbox at the source wasn't possible. We treated their events as the source of truth and reconciled on our side." },
];

const V2_REPORTS = [
  { id:"r1", candidateId:103, name:"Ankit Verma",   role:"Full Stack Engineer",   attempts:3, date:"May 26",   overall:4.7, confidence:4.8, knowledge:4.7, techStack:4.6, communication:4.9, jdMatch:87, decision:"pass"   },
  { id:"r2", candidateId:101, name:"Rahul Sharma",  role:"Senior .NET Developer", attempts:1, date:"Today",    overall:4.4, confidence:4.2, knowledge:4.6, techStack:4.3, communication:4.5, jdMatch:72, decision:"pending" },
  { id:"r3", candidateId:104, name:"Sneha Joshi",   role:"React Frontend Dev",    attempts:2, date:"May 25",   overall:3.6, confidence:3.4, knowledge:3.8, techStack:3.5, communication:3.7, jdMatch:61, decision:"maybe"   },
];

const V2_QUESTIONS = {
  warmup: [
    "Tell me a little about yourself.",
    "What domains have you primarily worked in?",
    "How long have you been working in software development?",
  ],
  technical: [
    { id:"q1", text:"Walk me through a complex .NET service you designed. What tradeoffs did you make?",     source:"Resume + JD",     type:"open"    },
    { id:"q2", text:"How do you handle distributed transactions across microservices?",                       source:"JD required",     type:"open"    },
    { id:"q3", text:"Which SOLID principle does dependency injection primarily implement?",                   source:"Question bank",   type:"mcq",    options:["SRP","OCP","LSP","DIP"] },
    { id:"q4", text:"Write a generic async repository pattern in C#.",                                       source:"Question bank",   type:"code"    },
    { id:"q5", text:"Explain your experience with Azure Functions and cold-start considerations.",           source:"JD",              type:"open"    },
  ],
};

const V2_INTEGRITY = {
  tabSwitches: 0, lookAways: 2, faceCoverage: 98, fullscreen: 100, multipleScreens: false,
};

/* ══════════════════════════════════════════
   EXAM (MCQ + coding) — fetched dynamically; candidate sees step-by-step
══════════════════════════════════════════ */
const V2_EXAM = {
  durationMin: 45,
  mcqs: [
    { id:"m1", q:"Which keyword makes a C# method awaitable inside an async method?", options:["yield","await","lock","defer"], answer:1 },
    { id:"m2", q:"In a REST API, which HTTP status best signals a successful resource creation?", options:["200 OK","201 Created","204 No Content","302 Found"], answer:1 },
    { id:"m3", q:"What does the SOLID 'D' (Dependency Inversion) primarily encourage?", options:["Depending on concretions","Depending on abstractions","Avoiding interfaces","Static coupling"], answer:1 },
    { id:"m4", q:"Which index type best speeds up an equality lookup on a single column?", options:["Full-text index","B-tree index","Spatial index","No index"], answer:1 },
  ],
  coding: {
    id:"c1",
    title:"Two Sum (return indices)",
    prompt:"Given an array of integers `nums` and a target, return the indices of the two numbers that add up to target. Assume exactly one solution.",
    examples:[{ in:"nums=[2,7,11,15], target=9", out:"[0,1]" },{ in:"nums=[3,2,4], target=6", out:"[1,2]" }],
    languages:["JavaScript","Python","C#"],
    starter:{
      "JavaScript":"function twoSum(nums, target) {\n  // your code here\n}\n",
      "Python":"def two_sum(nums, target):\n    # your code here\n    pass\n",
      "C#":"public int[] TwoSum(int[] nums, int target) {\n    // your code here\n}\n",
    },
    tests:[
      { name:"basic case [2,7,11,15] / 9", expected:"[0,1]" },
      { name:"case [3,2,4] / 6", expected:"[1,2]" },
      { name:"case [3,3] / 6", expected:"[0,1]" },
    ],
  },
};

/* AI interview question pool — revealed ONE AT A TIME to candidate.
   No screen ever shows the full upcoming list. */
const V2_AI_QUESTIONS = [
  { id:"a0", phase:"Intro",     text:"Hi Rahul — thanks for joining. To start, tell me a little about yourself and your recent work.", seconds:90 },
  { id:"a1", phase:"Goals",     text:"What are you looking for in your next role, and why this kind of position?", seconds:75 },
  { id:"a2", phase:"Technical", text:"Walk me through a complex .NET service you designed. What tradeoffs did you make?", seconds:150 },
  { id:"a3", phase:"Technical", text:"How do you handle distributed transactions across microservices?", seconds:150 },
  { id:"a4", phase:"Scenario",  text:"A production endpoint is timing out under load. Talk me through how you'd diagnose it.", seconds:150 },
  { id:"a5", phase:"Wrap-up",   text:"Anything you'd like to ask me about the team or the role?", seconds:90 },
];

/* Editable profiles (used by self-edit + manager edit) */
const V2_PROFILES = {
  candidate: {
    name:"Rahul Sharma", email:"rahul.sharma@gmail.com", phone:"+91 99887 65432",
    loc:"Bangalore, India", role:"Senior .NET Developer", exp:"6 yrs",
    noticePeriod:"60 days", github:"github.com/rahulsharma", linkedin:"linkedin.com/in/rahulsharma",
    skills:[".NET","C#","SQL","Docker","Azure"],
    about:"Backend engineer focused on .NET microservices, event-driven systems, and Postgres at scale.",
  },
  manager: {
    name:"Kiran Patel", email:"kiran.patel@acme.co", phone:"+91 98111 22334",
    loc:"Bangalore, India", title:"Engineering Manager", team:"Platform & Backend",
    department:"Engineering", timezone:"Asia/Kolkata (IST)",
  },
  settings: {
    notifyEmail:true, notifyInApp:true, notifyResults:true, notifyReminders:false,
    twoFactor:false, language:"English",
  },
};

/* Resume-analyzer dictionaries (for live tokenized matching of pasted text) */
const V2_HARD_SKILLS = [
  ".net","c#","asp.net","entity framework","azure","aws","gcp","sql","sql server","postgres","postgresql",
  "mysql","mongodb","redis","docker","kubernetes","microservices","rest","graphql","grpc","kafka","rabbitmq",
  "react","angular","vue","typescript","javascript","node.js","python","java","spring","go","ci/cd","terraform",
  "system design","unit testing","tdd","oauth","jwt","linq","async","multithreading","devops","git",
];
const V2_SOFT_SKILLS = [
  "communication","leadership","ownership","collaboration","mentoring","problem solving","stakeholder",
  "agile","scrum","teamwork","time management","adaptability","analytical",
];

const V2_RESUME_SAMPLE = `Rahul Sharma — Senior Software Engineer
rahul.sharma@gmail.com · +91 99887 65432 · Bangalore

SUMMARY
Backend engineer with 6 years building .NET and C# microservices on Postgres and Docker.
Strong on REST APIs, async processing with Kafka, and unit testing. Good communication and ownership.

EXPERIENCE
- Built an order-reconciliation service in .NET consuming Kafka events, writing to Postgres.
- Designed REST APIs with LINQ and Entity Framework; led a small team using Agile/Scrum.
- Containerised services with Docker and set up CI/CD pipelines in Git.

SKILLS
.NET, C#, SQL, Postgres, Docker, Kafka, REST, LINQ, Entity Framework, Unit Testing, Agile`;

const V2_JD_SAMPLE = `Senior .NET Developer — Acme Technologies (Bangalore, Hybrid)

We are hiring a Senior .NET Developer to build scalable backend services.

Requirements:
- 5+ years with C# and .NET / ASP.NET Core
- Strong experience with Microservices and System Design
- Hands-on with Azure (App Service, Functions, Service Bus)
- SQL Server and Entity Framework
- CI/CD, Docker, Kubernetes
- REST and gRPC APIs
- Excellent communication and leadership; mentoring junior engineers

Nice to have: Kafka, Redis, Terraform`;

window.V2 = {
  TEAM: V2_TEAM, EXTERNAL: V2_EXTERNAL, JOBS: V2_JOBS, ACTIVITY: V2_ACTIVITY,
  SCHEDULE: V2_SCHEDULE_EVENTS, TRANSCRIPT: V2_TRANSCRIPT,
  REPORTS: V2_REPORTS, QUESTIONS: V2_QUESTIONS, INTEGRITY: V2_INTEGRITY,
  EXAM: V2_EXAM, AI_QUESTIONS: V2_AI_QUESTIONS, PROFILES: V2_PROFILES,
  HARD_SKILLS: V2_HARD_SKILLS, SOFT_SKILLS: V2_SOFT_SKILLS,
  RESUME_SAMPLE: V2_RESUME_SAMPLE, JD_SAMPLE: V2_JD_SAMPLE,
};

/* ══════════════════════════════════════════
   Reactive in-memory store — real CRUD (resets on refresh)
══════════════════════════════════════════ */
(function(){
  const state = {
    team:     V2_TEAM.map(m=>({...m})),
    external: V2_EXTERNAL.map(c=>({...c})),
    jobs:     V2_JOBS.map(j=>({...j})),
    candidate: {...V2_PROFILES.candidate},
    manager:   {...V2_PROFILES.manager},
    settings:  {...V2_PROFILES.settings},
  };
  const listeners = new Set();
  const emit = () => listeners.forEach(l=>l());
  window.V2Store = {
    get: () => state,
    update: (fn) => { fn(state); emit(); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    nextId: (() => { let n = 900; return () => ++n; })(),
  };
})();
window.useV2Store = function(){
  const [,force] = React.useReducer(x=>x+1, 0);
  React.useEffect(()=> window.V2Store.subscribe(force), []);
  return window.V2Store;
};
