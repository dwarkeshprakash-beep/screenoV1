/* Screeno mock data — Indian tech hiring context */

const ROLES = [
  "Senior .NET Developer",
  "Full Stack Engineer (React + Node)",
  "React Frontend Engineer",
  "Backend Engineer (Java)",
  "DevOps Engineer",
  "Mobile Engineer (React Native)",
  "Data Engineer",
  "QA Automation Engineer",
];

const LOCATIONS = ["Bangalore", "Hyderabad", "Pune", "Gurugram", "Chennai", "Mumbai", "Noida", "Remote"];

const STAGES = {
  applied:    { label: "Applied",    tone: "info",    color: "var(--info-500)", dot: "#3B82F6" },
  screen:     { label: "In screen",  tone: "brand",   color: "var(--brand-500)", dot: "var(--brand-400)" },
  interview:  { label: "Interview",  tone: "warning", color: "var(--warning-500)", dot: "#F59E0B" },
  offer:      { label: "Offer",      tone: "success", color: "var(--success-500)", dot: "#10B981" },
  rejected:   { label: "Rejected",   tone: "danger",  color: "var(--danger-500)", dot: "#F87171" },
};

const MODES = {
  exam:  { label: "Coding exam",      icon: "file-text", color: "var(--info-500)" },
  ai:    { label: "AI voice screen",  icon: "phone",     color: "var(--warning-500)" },
  video: { label: "Live video",       icon: "video",     color: "var(--brand-500)" },
};

const CANDIDATES = [
  { id: 1,  name: "Rahul Sharma",      role: "Senior .NET Developer",            mode: "ai",    stage: "interview", score: 4.4, applied: "2d ago",  appliedAt: "Mon", next: "AI screen · today 4:30 PM",      loc: "Bangalore", exp: "6 yrs", source: "Naukri",   email: "rahul.s@gmail.com",  phone: "+91 98765 43210" },
  { id: 2,  name: "Priya Patel",       role: "Full Stack Engineer (React + Node)", mode: "exam",  stage: "screen",    score: 4.1, applied: "3d ago",  appliedAt: "Sun", next: "Coding exam in progress",         loc: "Hyderabad", exp: "4 yrs", source: "Referral", email: "priya.p@outlook.com", phone: "+91 99234 12876" },
  { id: 3,  name: "Ankit Verma",       role: "React Frontend Engineer",            mode: "video", stage: "offer",     score: 4.7, applied: "1w ago",  appliedAt: "Thu", next: "Offer accepted, awaiting joinee", loc: "Pune",      exp: "5 yrs", source: "LinkedIn", email: "ankit.v@gmail.com",  phone: "+91 90034 56712" },
  { id: 4,  name: "Divya Iyer",        role: "Backend Engineer (Java)",            mode: "video", stage: "interview", score: 4.0, applied: "5d ago",  appliedAt: "Fri", next: "Round 2 · Thu 10:00 AM",          loc: "Chennai",   exp: "3 yrs", source: "Naukri",   email: "divya.iyer@gmail.com", phone: "+91 97543 89765" },
  { id: 5,  name: "Karthik Reddy",     role: "DevOps Engineer",                    mode: "exam",  stage: "applied",   score: null, applied: "1d ago",  appliedAt: "Tue", next: "Send screening invite",           loc: "Hyderabad", exp: "7 yrs", source: "LinkedIn", email: "karthik.r@yahoo.in",  phone: "+91 91234 56723" },
  { id: 6,  name: "Aisha Khan",        role: "Senior .NET Developer",              mode: "ai",    stage: "rejected",  score: 2.6, applied: "1w ago",  appliedAt: "Wed", next: "—",                              loc: "Gurugram",  exp: "5 yrs", source: "Naukri",   email: "aisha.k@gmail.com",  phone: "+91 98821 34567" },
  { id: 7,  name: "Sneha Joshi",       role: "Full Stack Engineer (React + Node)", mode: "exam",  stage: "screen",    score: 3.6, applied: "4d ago",  appliedAt: "Sat", next: "Awaiting result",                 loc: "Mumbai",    exp: "3 yrs", source: "Referral", email: "sneha.j@gmail.com",  phone: "+91 99807 12365" },
  { id: 8,  name: "Vikram Singh",      role: "Backend Engineer (Java)",            mode: "ai",    stage: "interview", score: 4.3, applied: "6d ago",  appliedAt: "Thu", next: "Final round · Fri 2:00 PM",       loc: "Noida",     exp: "8 yrs", source: "LinkedIn", email: "vikram.s@gmail.com", phone: "+91 90123 87654" },
  { id: 9,  name: "Neha Gupta",        role: "React Frontend Engineer",            mode: "video", stage: "interview", score: 3.9, applied: "5d ago",  appliedAt: "Fri", next: "Tech round · today 11:00 AM",     loc: "Bangalore", exp: "4 yrs", source: "Naukri",   email: "neha.g@gmail.com",   phone: "+91 98213 76544" },
  { id: 10, name: "Arjun Nair",        role: "Mobile Engineer (React Native)",     mode: "exam",  stage: "applied",   score: null, applied: "today",   appliedAt: "Today", next: "Send screening invite",         loc: "Bangalore", exp: "5 yrs", source: "Referral", email: "arjun.n@gmail.com",  phone: "+91 99876 12354" },
  { id: 11, name: "Shreya Banerjee",   role: "Data Engineer",                      mode: "exam",  stage: "screen",    score: 4.2, applied: "3d ago",  appliedAt: "Sun", next: "Awaiting result",                 loc: "Pune",      exp: "6 yrs", source: "LinkedIn", email: "shreya.b@gmail.com", phone: "+91 90765 43289" },
  { id: 12, name: "Manish Tiwari",     role: "DevOps Engineer",                    mode: "video", stage: "interview", score: 3.7, applied: "1w ago",  appliedAt: "Wed", next: "Round 3 · Mon 3:30 PM",           loc: "Remote",    exp: "9 yrs", source: "Naukri",   email: "manish.t@yahoo.in",  phone: "+91 91876 54321" },
  { id: 13, name: "Pooja Krishnan",    role: "QA Automation Engineer",             mode: "exam",  stage: "applied",   score: null, applied: "today",   appliedAt: "Today", next: "Send screening invite",         loc: "Chennai",   exp: "4 yrs", source: "Naukri",   email: "pooja.k@gmail.com",  phone: "+91 98456 23187" },
  { id: 14, name: "Rohit Kulkarni",    role: "Senior .NET Developer",              mode: "video", stage: "offer",     score: 4.5, applied: "2w ago",  appliedAt: "Mon", next: "Offer extended · awaiting response", loc: "Pune",  exp: "7 yrs", source: "Referral", email: "rohit.k@gmail.com",  phone: "+91 90341 23876" },
  { id: 15, name: "Tanvi Desai",       role: "React Frontend Engineer",            mode: "ai",    stage: "rejected",  score: 2.9, applied: "1w ago",  appliedAt: "Tue", next: "—",                              loc: "Mumbai",    exp: "2 yrs", source: "LinkedIn", email: "tanvi.d@gmail.com",  phone: "+91 99543 21876" },
  { id: 16, name: "Harish Menon",      role: "Backend Engineer (Java)",            mode: "exam",  stage: "screen",    score: 3.8, applied: "4d ago",  appliedAt: "Sat", next: "Awaiting result",                 loc: "Bangalore", exp: "5 yrs", source: "Naukri",   email: "harish.m@gmail.com", phone: "+91 90876 34521" },
  { id: 17, name: "Meera Pillai",      role: "Full Stack Engineer (React + Node)", mode: "ai",    stage: "interview", score: 4.1, applied: "5d ago",  appliedAt: "Fri", next: "AI screen · tomorrow 5:00 PM",    loc: "Hyderabad", exp: "4 yrs", source: "LinkedIn", email: "meera.p@gmail.com",  phone: "+91 98123 76542" },
  { id: 18, name: "Sanjay Bhatt",      role: "DevOps Engineer",                    mode: "exam",  stage: "applied",   score: null, applied: "yesterday", appliedAt: "Mon", next: "Send screening invite",        loc: "Gurugram",  exp: "6 yrs", source: "Naukri",   email: "sanjay.b@yahoo.in",  phone: "+91 99087 23456" },
];

/* --- Roles open --- */
const JOBS = [
  { id: "j1", title: "Senior .NET Developer",                team: "Platform",      loc: "Bangalore",  open: 3, pipeline: 18, applied: 42, stage: "Active", owner: "Alex Morgan" },
  { id: "j2", title: "Full Stack Engineer (React + Node)",   team: "Product",       loc: "Hyderabad",  open: 2, pipeline: 12, applied: 31, stage: "Active", owner: "Alex Morgan" },
  { id: "j3", title: "React Frontend Engineer",              team: "Product",       loc: "Pune",       open: 1, pipeline: 9,  applied: 27, stage: "Active", owner: "Sara Mehta" },
  { id: "j4", title: "Backend Engineer (Java)",              team: "Platform",      loc: "Chennai",    open: 2, pipeline: 14, applied: 36, stage: "Active", owner: "Alex Morgan" },
  { id: "j5", title: "DevOps Engineer",                      team: "Infrastructure", loc: "Remote",    open: 1, pipeline: 6,  applied: 19, stage: "Active", owner: "Sara Mehta" },
];

/* --- Interviewer scorecard rubric --- */
const RUBRIC = [
  { id: "tech",       label: "Technical depth",        desc: "Depth of language/runtime knowledge, system design instincts." },
  { id: "problem",    label: "Problem solving",         desc: "Decomposition, edge-case discovery, debugging." },
  { id: "comm",       label: "Communication",           desc: "Clarity of explanation, signal-to-noise, listening." },
  { id: "collab",     label: "Collaboration & culture", desc: "How they'd work with the team day-to-day." },
];

/* --- AI interview transcript (sample) --- */
const AI_TRANSCRIPT = [
  { who: "ai",   t: "00:00", text: "Hi Rahul, thanks for taking the time today. I'll ask you a few questions about your recent work in .NET and then a couple of system design scenarios. Sound good?" },
  { who: "user", t: "00:08", text: "Yes, that sounds good. I'm ready." },
  { who: "ai",   t: "00:11", text: "Great. To start, tell me about a recent backend service you built in .NET — what it does and one technical decision you made." },
  { who: "user", t: "00:18", text: "Sure. Most recently I built an order-reconciliation service for a fintech client. It consumes events from Kafka, dedupes them, and writes settled orders to Postgres. The trickiest decision was choosing between an idempotency key in the database versus a Redis dedupe cache." },
  { who: "user", t: "00:42", text: "I went with the database approach because we needed durability across deploys, and the write volume was modest — about 200 writes per second peak." },
  { who: "ai",   t: "00:56", text: "Good context. Why did you not use the outbox pattern there?" },
  { who: "user", t: "01:02", text: "The producer was a third-party system we didn't own, so an outbox at the source wasn't possible. We treated their events as the source of truth and reconciled on our side." },
];

/* --- Exam question bank (sample) --- */
const EXAM_QUESTIONS = [
  {
    id: "q1", kind: "code", title: "Two-sum (return indices)",
    prompt: "Given an array of integers and a target, return the indices of the two numbers that add up to the target. You may assume exactly one solution exists.",
    starter: "function twoSum(nums, target) {\n  // your code here\n}\n",
    examples: [{ in: "[2,7,11,15], target = 9", out: "[0, 1]" }, { in: "[3,2,4], target = 6", out: "[1, 2]" }],
    timeMins: 18,
  },
  { id: "q2", kind: "mcq", title: "Which HTTP status indicates a server-side rate limit?", options: ["408 Request Timeout", "418 I'm a Teapot", "429 Too Many Requests", "503 Service Unavailable"], answer: 2 },
  { id: "q3", kind: "mcq", title: "In React, which hook would you use to subscribe to an external store?", options: ["useEffect", "useReducer", "useSyncExternalStore", "useMemo"], answer: 2 },
  { id: "q4", kind: "mcq", title: "In a relational schema, which key uniquely identifies a row in a table?", options: ["Foreign key", "Composite key", "Candidate key", "Primary key"], answer: 3 },
  { id: "q5", kind: "code", title: "Reverse a linked list (iterative)", prompt: "Given the head of a singly linked list, reverse it and return the new head. O(n) time, O(1) extra space.", starter: "function reverseList(head) {\n  // your code here\n}\n", examples: [{ in: "1 → 2 → 3 → 4 → 5", out: "5 → 4 → 3 → 2 → 1" }], timeMins: 22 },
  { id: "q6", kind: "mcq", title: "Which of the following best describes a Promise in JavaScript?", options: ["A synchronous value computed eagerly", "A placeholder for the result of an async operation", "A type of generator function", "A subclass of EventEmitter"], answer: 1 },
];

/* --- Activity timeline for a candidate --- */
const ACTIVITY = [
  { t: "Today · 11:42 AM",   who: "Alex Morgan",  what: "Moved to Interview",          icon: "arrow-right-circle", tone: "brand" },
  { t: "Today · 09:15 AM",   who: "Screeno AI",   what: "AI screen completed · score 4.4 / 5", icon: "check-circle-2", tone: "success" },
  { t: "Yesterday · 6:02 PM", who: "Alex Morgan", what: "Scheduled AI voice screen for today 4:30 PM", icon: "calendar-clock", tone: "neutral" },
  { t: "2 days ago",         who: "Screeno",      what: "Coding exam submitted · 92%",  icon: "file-check-2", tone: "success" },
  { t: "3 days ago",         who: "Alex Morgan",  what: "Sent screening invite",        icon: "mail",         tone: "neutral" },
  { t: "3 days ago",         who: "Rahul Sharma", what: "Application received via Naukri", icon: "user-plus", tone: "info" },
];

/* --- Schedule events (week view, Mon–Fri) --- */
const SCHEDULE = [
  { day: 0, start: 9.0,  dur: 1.0, title: "Round 2 · Divya Iyer",       sub: "Backend Engineer (Java)", who: "Anand R.",     type: "brand" },
  { day: 0, start: 11.5, dur: 0.5, title: "AI screen · Meera Pillai",   sub: "Full Stack",              who: "Screeno AI",   type: "ai" },
  { day: 1, start: 10.0, dur: 1.0, title: "Tech round · Neha Gupta",    sub: "React Frontend",          who: "Rajiv M.",     type: "brand" },
  { day: 1, start: 14.0, dur: 0.5, title: "Coding exam window",          sub: "5 candidates",            who: "—",            type: "exam" },
  { day: 1, start: 16.5, dur: 0.5, title: "AI screen · Rahul Sharma",   sub: "Senior .NET",             who: "Screeno AI",   type: "ai" },
  { day: 2, start: 11.0, dur: 1.0, title: "Final round · Vikram Singh", sub: "Backend Engineer (Java)", who: "Hiring panel", type: "brand" },
  { day: 2, start: 15.0, dur: 0.5, title: "Debrief · platform team",     sub: "Pipeline review",         who: "Alex M.",      type: "brand" },
  { day: 3, start: 9.5,  dur: 1.0, title: "Round 2 · Divya Iyer",        sub: "Backend Engineer (Java)", who: "Anand R.",     type: "brand" },
  { day: 3, start: 13.0, dur: 0.5, title: "AI screen · Karthik Reddy",   sub: "DevOps",                  who: "Screeno AI",   type: "ai" },
  { day: 4, start: 10.0, dur: 1.0, title: "Round 3 · Manish Tiwari",     sub: "DevOps",                  who: "Hiring panel", type: "brand" },
  { day: 4, start: 14.0, dur: 1.0, title: "Offer call · Ankit Verma",    sub: "React Frontend",          who: "Alex M.",      type: "brand" },
];

window.SCREENO_DATA = {
  ROLES, LOCATIONS, STAGES, MODES,
  CANDIDATES, JOBS, RUBRIC, AI_TRANSCRIPT, EXAM_QUESTIONS, ACTIVITY, SCHEDULE,
};
