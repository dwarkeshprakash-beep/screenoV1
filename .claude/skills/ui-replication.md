# SKILL: UI Replication — Screeno v2 → Production

> CRITICAL: Every screen, button, state, and component from the v2 prototype must be replicated exactly. Do not miss a single page. Do not remove any feature. This file is the single source of truth for what UI exists.

---

## How to use this file

When building any screen, find it in this catalog. Replicate:
- Layout exactly as described
- All colors using tokens.css variables (not hardcoded hex)
- All interactive states (hover, active, disabled, loading, error, empty)
- All data displayed (replace mock data with real API calls — see `.claude/skills/api-integration.md`)

---

## SHARED COMPONENTS (build first — everything else depends on these)

### ScreenoLogo
- Two horizontal bars (rectangles) in brand purple, stacked with slight offset
- Used in: dark sidebar (white version), login screen, candidate header
- Sizes: sidebar (24px), candidate header (20px), login (44px container)

### Sidebar (AppLayout)
- Dark navy background: `#0F172A`
- Width: 240px (collapsible to 64px)
- Screeno logo + wordmark at top (white)
- Nav sections with dividers:
  - **Manager nav:** Team Overview, My Team, Schedule, Reports, Referrals
  - **Interviewer nav:** Dashboard, Interviews
- Each nav item: icon (16px lucide) + label, hover = white/10 bg, active = `#5B4FE9` bg white text
- User avatar + name + role pill at bottom
- Collapse toggle button

### TopBar
- Height 64px, white bg, bottom border `#E2E8F0`
- Left: page title (bold, 18px)
- Right: search icon → opens search input, bell icon (with red badge for unread), user avatar

### NotificationPanel (V2NotifPanel)
- Opens from bell icon
- Max-width 360px, right-anchored, white bg, shadow-lg
- Header: "Notifications" + "Mark all read" link
- Each notification: icon/avatar + text + timestamp + unread dot (blue)
- Footer: "View all notifications"

### Avatar (V2Av)
- Circle with initials, background color based on name hash
- Sizes: 24px, 32px, 40px, 48px, 56px
- Hover shows full name tooltip

### AssessBadge
- `overdue`: amber/warning colors + "Overdue" label
- `up_to_date`: green/success colors + "Up to date" label
- `never`: gray + "Never assessed" label
- Pill shape, small font, used in team table and member cards

### SkillTag
- Small rounded pill, light gray bg, dark text
- Lists tech skills (e.g., ".NET", "React", "Azure")

### Btn (Button)
- Variants: primary (brand purple), secondary (white + border), ghost (transparent), danger (red text, light border), success (green)
- Sizes: sm, md, lg
- Disabled state: gray bg, not-allowed cursor

### Card
- White bg, `1px solid #E2E8F0` border, `border-radius: 12px`
- Shadow: `0 1px 3px rgba(15,23,42,0.04)`
- Configurable padding

### V2Toggle
- Clean pill toggle switch
- On: brand purple, Off: gray

### V2Modal
- Centered overlay with dark bg (`rgba(15,23,42,0.5)`)
- White card, rounded-xl, max-width varies per modal
- Close button top-right

---

## LOGIN SCREEN

**Route:** `/login`  
**Background:** `#0F172A` (dark navy full screen)  
**Content (centered, max-width 440px):**
- Screeno logo icon (44px, purple gradient bg, two white bars) + "Screeno" wordmark (28px, white, bold)
- Subtitle: "AI-powered hiring platform" (gray)
- Card (dark: `#1E293B` bg, `#334155` border):
  - "Demo Accounts" eyebrow label (uppercase, gray)
  - 3 role buttons stacked:
    - **Manager:** avatar KP (purple bg) | "Kiran Patel" | "Manager · Acme Corp" | "manager" badge
    - **Candidate:** avatar RS (green bg) | "Rahul Sharma" | "Senior .NET Developer" | "candidate" badge
    - **Interviewer:** avatar AR (blue bg) | "Anand Rao" | "Tech Interviewer · Acme" | "interviewer" badge
  - Each button: `#0F172A` bg, `#334155` border, hover border `#5B4FE9`
  - Footer: "Secure end-to-end encrypted" with lock icon

**Production version:** Replace demo buttons with email + password form. Same visual design.

---

## MANAGER SCREENS

### 1. Team Overview (`/manager/dashboard`)

**Header:**
- Eyebrow: "MANAGER · TEAM" (brand color, uppercase)
- H1: "Team Hiring" (28px bold)
- Subtitle: "Manage your team's active openings, review candidate scorecards, and make final decisions."
- Top-right: "Post New Job" button (primary)

**3 stat cards (grid, 3 columns):**
- Each card: icon in purple bubble (36px), big value text (32px bold), label (muted), link text (brand)
- Cards: "3 open roles" / Active Jobs | "42 candidates" / Candidates Evaluated | "2 pending" / Awaiting My Scorecard

**Bottom 2-col layout:**
- Left: "My Team's Openings" table
  - Columns: ROLE / CANDIDATES / STATUS
  - Click row → goes to JobCandidatesScreen for that job
- Right: "Hiring Activity" feed
  - Each item: what / sub (brand color) / when (muted)

---

### 2. My Team (`/manager/team`)

**Header:**
- H1: "My Team"
- Right: "Import CSV" (secondary) + "Add Member" (primary) buttons

**Filter tabs:** All | Overdue | Never (pill tabs, active = brand bg white text)

**Team member rows (table or cards):**
- Checkbox (for bulk select)
- Avatar + Name + Role subtitle
- AssessBadge (overdue/up-to-date/never)
- Last assessed date (or "Never")
- Resume last updated date
- "Schedule" button (small)
- Three-dot menu → Edit / Remove

**When items selected:**
- Floating "Schedule [N] selected" bar appears at bottom

---

### 3. Member Profile (`/manager/team/:id`)

**Header card:**
- Large avatar (48px) + Name (24px bold) + Role + Email
- AssessBadge
- "Schedule Interview" button (primary)
- "Edit Member" button (secondary)

**5 tabs:**

**Tab 1: Overview**
- Left: CV PDF embed (or "Upload Resume" if none) + "Download CV" button
- Right: Assessment history timeline (icons, dates, types, scores)
- Notes section: existing notes list + "Add note" textarea + button

**Tab 2: Analysis**
- Radar/bar chart: 5 metrics (Knowledge, Tech Stack, Communication, Confidence, Problem Solving)
- Strengths list (green check items)
- Gaps list (orange warning items)
- JD Match meter (percentage bar) — only shows if JD was provided
- Integrity score pill (green/yellow/red)

**Tab 3: Transcript**
- Latest interview Q&A
- Each item: Q label (brand, small) + question text | A label (muted) + answer text
- Scrollable list

**Tab 4: Exam**
- MCQ results (question + correct/incorrect indicator + selected answer)
- Code question result (code display + AI score)

**Tab 5: Notes**
- All notes chronologically
- Each note: avatar + name + date + note text
- Add note form at bottom

---

### 4. Schedule (Calendar) (`/manager/schedule`)

**Week grid calendar:**
- Header: "< Week of May 27 >" navigation, "Today" button
- 7 columns (Mon-Sun), each with date + day
- Time slots from 9:00 AM down
- Events as colored cards:
  - Blue: AI voice interviews
  - Purple: Exams
  - Green: Human interviews
- Each event card: time + candidate name + "AI Voice" / "Exam" / "Human" label
- Click event → event detail popup

**Below calendar:** Upcoming interviews list (next 5)

---

### 5. Reports (`/manager/reports`)

**Filter bar:**
- Search input (by candidate name)
- Job dropdown filter
- Date range picker

**Candidate rows:**
- Avatar + Name + Role
- Mini score bars (4 metrics: Confidence, Knowledge, Communication, Tech Stack)
- Overall score badge
- View Full Report button → opens full report modal or page
- Download PDF button

**Full report view:** Same as Member Profile → Analysis tab, but standalone

---

### 6. Templates (`/manager/templates`) ← UNDOCUMENTED — need decision

**Header:**
- H1: "Interview Templates"
- "New Template" button (primary)

**Template cards (auto-fill grid):**
- Each card: Name (bold) | Type badge | Description | Attempts count | "Report after" info | AI prompt preview (italic, muted)
- Buttons: "Use Template" (primary) + "Edit" (secondary)

**Create template form (appears below on click):**
- Template name input
- Attempts select (1/2/3/5/Unlimited)
- Description / Prompt focus textarea
- Save / Cancel buttons

---

### 7. Resume Analyzer (`/manager/resume-analyzer`) ← UNDOCUMENTED — need decision

**Two-column input:**
- Left: JD text area (paste JD) with "Load Sample" link
- Right: Resume text area (paste resume) with "Load Sample" link

**Analyze button → results view:**
- Match score (large %, color coded: green ≥65%, amber 50-64%, red <50%)
- Verdict band (Strong Match / Good Match / Borderline / Mismatch)
- "Hard Skills" tab: found skills (green check) + missing skills (red X)
- "Soft Skills" tab: same format
- "Gaps" tab: missing keywords list
- "Searchability" score
- Recommendations panel

---

### 8. Job Candidates (`/manager/jobs/:id/candidates`) ← UNDOCUMENTED — need decision

**Accessed by:** clicking a job in Team Overview

**Table of external candidates for that job:**
- Candidate name + role
- Stage badge (Applied / Screening / Interview / Offer)
- Last activity date
- Score (if screened)
- Actions: Schedule Interview / View Profile

---

### 9. Compare Screen (`/manager/compare`) ← UNDOCUMENTED — need decision

**Accessed by:** selecting 2 candidates + "Compare" button (or from reports)

**Two columns, one per candidate:**
- Header: avatar + name + role + skills tags + decision badge (PASS/PENDING/FAIL)

**Metrics table (11 rows):**
- Metric label | Bar + value (C1) | Bar + value (C2)
- Winner highlighted in brand color
- Metrics: Overall, Confidence, Technical Knowledge, Tech Stack Match, Communication, JD Match %, Problem Solving, Clarity, Response Speed, Culture Fit, Integrity Score %

---

### 10. Manager Profile (`/manager/profile`)

**Edit profile section:**
- First name + Last name inputs
- Email input (read-only with note)
- Save Changes button

**Change password section:**
- Current password
- New password
- Confirm new password
- Update Password button

**Notifications section:**
- Toggles for: Email notifications, Report ready alerts, Interview reminders

---

## CANDIDATE SCREENS

### 1. Candidate Dashboard (`/candidate/dashboard`) ← UNDOCUMENTED — need decision

**Accessed after login (candidate has an account) OR redirect from magic link**

**Welcome message:** "Welcome back, [name]!"
**Blue info banner:** upcoming interview notice

**4 stat cards:** Upcoming Interviews / Completed / Average Score / Total Attempts

**Two-column:**
- Left: Upcoming interviews list
  - Each: role + company + status badge (Scheduled/Pending) + type/duration/attempt tags
  - If scheduled: date + time + "Device Check" button + "Start Interview" button
  - If pending (no date): "Choose my slot" button (self-schedule)
- Right: Recent performance + completed interviews + improvement tips

---

### 2. Interview Landing (`/i/:token`)

**Centered card (white, shadow, max-width 480px):**
- Purple icon (briefcase, 64px rounded)
- Job title (26px bold)
- Company name (muted)
- Info card (light gray bg):
  - Interview type + with whom + duration
  - Scheduled date/time
- "Check your device and start →" button (purple gradient, full width)
- "Takes about 30 seconds" note

---

### 3. Device Check (`/i/:token/device-check`)

**Uses CandidateLayout (header with step indicator)**

**Sequential checks (one at a time or all listed):**
- Camera: icon + status indicator + live preview when checking
- Microphone: icon + animated audio level bars when passing
- Speaker: icon + "Play Test Sound" button + manual confirm
- Network: icon + speed result (e.g., "18 Mbps")
- Screen: single screen check via Screen API

**Each check state:**
- Checking: spinner (gray)
- Pass: green CheckCircle icon + "Working" label
- Fail: red XCircle icon + "Failed — check your settings" + Retry button

**Bottom:** "Continue" button — disabled until all pass

---

### 4. Consent Screen (`/i/:token/consent`)

**Title:** "Before you begin"
**Subtitle:** "Please review what will be captured during your interview"

**Consent items (each with icon):**
- 🎥 Video/audio recording
- 📷 Periodic screenshots (every 30 seconds)
- 🖥️ Tab switch and fullscreen monitoring
- 🤖 AI processing of your transcript
- 🗄️ Data storage period

**Bottom:**
- Checkbox: "I have read and understand the above" (required)
- "Start Interview →" button (disabled until checked)
- "I do not consent" link (small, muted)

---

### 5. AI Prep Loader (`/i/:token/prep`)

**Full screen, centered:**
- Animated loading circle (brand color, spinning/pulsing)
- "AI is preparing your interview questions..." (16px, muted)
- Subtle progress animation
- Auto-advances to AI interview when done (after API returns questions)

---

### 6. AI Interview Room (`/i/:token/ai`)

**Uses CandidateLayout with timer ring in header**

**Center stage:**
- Large animated waveform circle (200px)
  - `ai_speaking` state: pulsing outward rings, brand purple
  - `listening` state: static ring, green
  - `recording` state: pulsing red dot inside ring
  - `thinking` state: slow spin
- State label below: "AI is speaking..." / "AI is listening..." / "Processing..."
- Current question card (white, border-left brand, shadow):
  - Small "Current Question" eyebrow
  - Question text (16px)

**Bottom left corner (fixed):** Candidate camera preview (120px circle, white border)

**Transcript panel (toggleable, bottom):**
- "Show transcript" toggle button
- Scrollable Q&A list: AI text (gray) | You text (dark)
- Visible/hidden state

**Controls (bottom center, fixed):**
- `listening` state: "Start Answer" button (large, green)
- `recording` state: "Stop Answer" button (large, red) + recording indicator
- "Repeat question" ghost button (always visible during listening)
- Skip button (limited uses)

**Integrity violation overlay (appears on tab switch):**
- Full-screen semi-transparent dark overlay
- Warning icon + "You switched windows. This has been recorded."
- "I understand — resume interview" button
- Interview paused until acknowledged

**No camera overlay (if no camera detected):**
- Banner at top: "No camera detected — interview continuing in reduced monitoring mode"

---

### 7. Exam Runner (`/i/:token/exam`)

**Uses CandidateLayout with section timer in header**

**Left panel (280px):**
- Question navigation: numbered circles
  - Answered: filled brand color
  - Current: outlined brand color
  - Skipped: amber
  - Unanswered: gray
- Section progress: "7 of 10 answered"

**Main area:**
- Section name + time remaining (red when < 2 min)
- Progress bar (thin, brand color)
- Question card (white, shadow):
  - Question number badge "Q3" (brand bg)
  - Question text (16px)
  - For MCQ: option cards (large, clickable, hover = brand border+tint, selected = filled)
  - For text: large textarea
  - For code: Monaco-like editor (dark bg, monospace font)
- Bottom bar: "Saved 3s ago" indicator + Previous / Next buttons

**Submit section modal:**
- "Are you sure? You cannot return to this section."
- Confirm / Cancel

---

### 8. Completion Screen (`/i/:token/done`)

**Centered, full screen:**
- Animated checkmark circle (80px, green bg)
- "You're all done!" (30px bold)
- "Thanks for completing the interview for [role] at [company]"
- Divider
- "What happens next" — 3 step cards:
  1. "We review your answers" — AI generates report
  2. "Hiring team reviews" — 2-3 business days
  3. "You'll hear from us" — email at [candidate email]
- (No scores shown — improvement tips only, on separate feedback screen)

---

### 9. Self-Schedule Modal (from Candidate Dashboard) ← UNDOCUMENTED — need decision

**Appears when candidate clicks "Choose my slot"**

**Date strip:** Mon/Tue/Wed/Thu/Fri/Sat/Sun (scrollable week)
**Time slot grid:** Available slots as buttons (green), unavailable slots (gray, disabled)
**Confirm button:** "Book this slot"
**Selected slot shows:** date + time summary

---

### 10. Candidate Profile (self-edit) (`/candidate/profile`)

- First name, last name, email, phone inputs
- Resume upload (PDF/DOCX/text)
- Save button
- Simple form, white card

---

## INTERVIEWER SCREENS

### 1. Interviewer Dashboard (`/interviewer/dashboard`)

**Stats row (3 cards):**
- Today's interviews count
- Pending scorecards (red badge)
- This week's count

**Today's interviews (list):**
- Each: time | candidate avatar+name | role | "Prep" button + "Join" button
- "Join" button: disabled until 5 minutes before, then turns green with pulse animation
- "Starting soon" state: green border glow on card

**Pending scorecards section:**
- Each: candidate + interview date + "Overdue by X days" red badge + "Fill Scorecard" button

**Week strip calendar:**
- Mon-Sun, dots below days that have interviews
- Click day → scrolls to those interviews

---

### 2. Interviewer Live Room (`/interviewer/live/:id`)

**Full screen, no sidebar**

**Split layout:**
- Left (60%): LiveKit video (candidate + interviewer feeds)
- Right (40%): side panel

**Side panel tabs:** Questions | Notes | AI Suggestions

**Questions tab:**
- List of interview questions
- Each: question text + "Mark as asked" checkbox
- "Ask this" highlights current
- Search questions input

**Notes tab:**
- Free-text area, auto-saved every 5 seconds
- "Saved" indicator

**AI Suggestions tab:**
- Cards appearing after candidate answers
- Each card: suggested follow-up question + "Use this" link + dismiss X

**Bottom controls:** End Interview button (danger, requires confirm)

---

### 3. Scorecard (`/interviewer/scorecard/:id`)

**Two-column layout:**

**Left (main scorecard):**
- Header: candidate name + role + round + date + duration
- Info note: "AI has pre-filled this from the transcript. Review and submit."
- 5 competency rows:
  - Name + weight badge
  - 5-dot score selector (filled = brand purple, empty = gray, hover = scale up)
  - Score label (1=Poor, 2=Weak, 3=Good, 4=Strong, 5=Excellent) on hover
  - Evidence textarea (AI-suggested text in gray italic, editable)
- Final decision (Pass / Maybe / Reject toggle cards):
  - Selected card: brand border + tint bg
- Reason textarea (required, shows char count)
- "Submit Scorecard" button (full width primary)
- "Last saved X min ago" indicator

**Right panel (AI Insights):**
- "AI Insights" header with sparkle icon
- Insight cards (brand tint bg):
  - Contradiction detected
  - Comparison to prior rounds
  - Role-match notes
- "Jump to transcript" link
- "Play recording" link + duration

---

### 4. Interviewer Prep Page (`/interviewer/prep/:id`) ← CURRENTLY PLACEHOLDER — need content

Not built yet in v2. Need decision on what to show here.

---

## SHARED MODALS

### Schedule Modal (4 steps)

**Step 1: Interview type**
- "Client Mock Interview" OR "Internal Monthly Assessment" (card selection)
- Interview mode: "Simple — 10 questions pre-generated" OR "Adaptive — AI asks follow-ups"
- Transcription mode: "Local (Whisper.js)" OR "API (Groq)" — with explanation of each

**Step 2: Configure**
- Attempts: 3 / 5 / Custom / Unlimited (pill options)
- If unlimited: "Generate report every N attempts" slider/input
- Cooldown between attempts: X hours input (default 24)
- Window: X days input (how long the link stays active)
- Report timing: "After each attempt" OR "After all attempts"
- Additional report emails (comma-separated input)

**Step 3: Questions**
- JD upload (PDF, DOCX, or plain text) — optional
- Alternative: "Describe the role or company" text area
- Focus areas: "Areas for AI to focus on" textarea
- Difficulty: Easy / Medium / Hard (pill selection)

**Step 4: Confirm**
- Summary card (all settings)
- Candidate name(s) + email(s)
- "Schedule and Send Invite →" button (primary)

### CSV Import Modal (3 steps)

**Step 1: Upload**
- Drag-and-drop zone + browse button
- Supported: CSV, XLSX
- Required columns shown (name, email)

**Step 2: Preview + Duplicate Check**
- Table of first 10 rows
- Error rows highlighted in red with reason
- Duplicate detection by email (yellow warning)
- "Skip duplicates" or "Update existing" option

**Step 3: Done**
- Summary: "N imported, M skipped"
- Close button

### Add Candidate Modal

- First name, last name, email, phone (required: first name + email)
- Type: Internal / External
- Manager assignment (dropdown, for internal)
- Resume upload (optional)
- Submit button

### Edit Member Modal

- Edit: first name, last name, email, role
- Upload new resume
- "Remove from team" danger button (with confirm)

---

## WHAT'S NOT BUILT YET IN v2 (placeholder pages)

1. **Referrals** — sidebar nav item → PlaceholderPage. No UI designed yet.
2. **Interviewer Prep** — placeholder page. Need content decisions.

---

## SCREENS FULL LIST (must all be built)

### Manager (13 total)
1. Team Overview
2. My Team
3. Member Profile (5 tabs)
4. Calendar / Schedule
5. Reports
6. Templates
7. Resume Analyzer
8. Job Candidates
9. Compare Screen
10. Manager Profile
11. Schedule Modal
12. CSV Import Modal
13. Add Candidate Modal + Edit Member Modal

### Candidate (9 total)
1. Candidate Dashboard
2. Interview Landing
3. Device Check
4. Consent
5. AI Prep Loader
6. AI Interview Room
7. Exam Runner
8. Completion Screen
9. Self-Schedule Modal + Candidate Profile

### Interviewer (4 built, 1 TBD)
1. Dashboard
2. Live Room
3. Scorecard
4. Prep Page (TBD)

### Shared
- Login Screen
- Notification Panel
- All shared components (Button, Card, Badge, Avatar, etc.)
