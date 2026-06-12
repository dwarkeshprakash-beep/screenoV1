# /senior — Deep Multi-Agent Senior Analysis

You are the orchestrator. Work through every phase in order.
Do NOT spawn an agent to make decisions — this command IS the orchestrator.
All agents spawn in a single parallel batch. Never spawn sequentially.

---

## PHASE 0 — Initialize / Baseline

Read `.claude/senior/baseline.md`.

**If baseline says "NOT INITIALIZED" (first run):**
Run these and write the results into `.claude/senior/baseline.md`:
```
git rev-parse HEAD           ← baseline commit hash
git log --oneline -1         ← commit message
```
Read `frontend/package.json` and `backend/package.json`, collect all direct dependencies.
Read all files matching `**/*.md` (exclude node_modules) — list their paths.

Write `.claude/senior/baseline.md`:
```
# Senior Analysis Baseline
Initialized: [today's date]
Baseline commit: [hash]
Baseline message: [commit message]

## Tech stack at baseline
[all direct dependencies from both package.json files]

## MD files at baseline
[list of all .md paths]

## Notes
First /senior run. All future runs compare against this commit.
```
Print: `First run — baseline set at commit [short hash]. Future runs track changes from here.`

**If baseline exists:** read it, note the baseline commit hash for use in Phase 1.

---

## PHASE 1 — Gather Context (run all in parallel)

Read these files simultaneously:
- `BRAIN.md`
- `CLAUDE.md`
- `backend/CLAUDE.md`
- `frontend/CLAUDE.md`
- `.claude/senior/agents/core.md`
- `.claude/senior/agents/evolved.md`
- `docs/open-issues.md` (first 60 lines — the priority list)

Run these shell commands:
```
git status
git log --oneline -8
git diff HEAD~1 --stat
git diff HEAD~1
git diff
git diff --cached
```

If baseline commit exists and differs from HEAD~1, also run:
```
git diff [BASELINE_COMMIT] --stat
```

Parse the output. Build two lists:
- **CHANGED_FILES**: all files touched in git diff HEAD~1 + unstaged + staged
- **BASELINE_DELTA**: files changed since the baseline commit (if available)

---

## PHASE 2 — Stack Evolution Check

Read `frontend/package.json` and `backend/package.json`. Extract all package names from
`dependencies` and `devDependencies`.

Read `.claude/senior/agents/evolved.md`. Extract the list of technologies already registered
(the "Baseline technologies" line + each `## Senior X` heading).

**For each package found in package.json that is NOT in evolved.md:**
Add new agent definitions to evolved.md using this format:
```
## Senior [Technology Name] Expert
Added: [today's date]
Trigger files: [relevant file patterns for this technology]
Analysis focus:
- [5 specific things to check for this technology]
- [common mistakes with this tech]
- [security concerns if any]

## Junior [Technology Name] Reviewer
Added: [today's date]
Trigger files: [same patterns]
Quick checks:
- [3 fast things to look for]
```

Update the "Last updated" line in evolved.md.
If new agents were added, print: `New agents created for: [list of new tech]`

---

## PHASE 3 — Determine Agents to Spawn

Using CHANGED_FILES from Phase 1, apply these rules to build AGENT_LIST.
Add an agent to the list if ANY changed file matches its trigger pattern.

| Trigger pattern in changed files | Add these agents |
|---|---|
| `*.jsx` or `*.css` or `tokens.css` | REACT_EXPERT, UX_AGENT |
| `*.routes.js` or `*.middleware.js` | BACKEND_EXPERT, SECURITY_AGENT |
| `*.service.js` | BACKEND_EXPERT |
| `*.repository.js` or `migrations/` | DATABASE_EXPERT |
| `hooks/` or `services/api.js` | REACT_EXPERT |
| `package.json` | DEVOPS_AGENT, ARCHITECTURE_AGENT |
| `BRAIN.md` or `docs/` or `.claude/` | PRODUCT_AGENT, TEAMLEAD_AGENT |
| `auth.*` or `*middleware*` or `*token*` | SECURITY_AGENT |
| llm.service.js or transcription or judge | *(evolved)* LLM_EXPERT |
| HumanInterviewPage or LiveRoom or *livekit* | *(evolved)* LIVEKIT_EXPERT |
| `*.repository.js` | *(evolved)* SUPABASE_EXPERT |

Always add: ARCHITECTURE_AGENT, CODE_QUALITY_AGENT
Also check: does any changed file match a trigger pattern in evolved.md? If yes, add that evolved agent.

Deduplicate the list.

---

## PHASE 4 — Spawn All Agents in Parallel

Create session timestamp: `YYYY-MM-DD-HH-MM` (use today's date and current hour/minute).
Session file: `.claude/senior/sessions/[timestamp].md`

**Spawn ALL agents in PHASE_AGENT_LIST simultaneously in a single message.**
Every agent gets this context package:

```
You are a [ROLE TITLE] reviewing recent changes to the Screeno AI interview platform.

PROJECT CONTEXT (read carefully):
[paste BRAIN.md sections: "What Is Screeno", "Roles", "Non-Obvious Data Relationships",
 "Current Gaps"]

YOUR ANALYSIS FOCUS:
[paste the full definition block for this agent from core.md or evolved.md]

GIT DIFF (your domain files only):
[paste the git diff lines for files matching this agent's trigger patterns]

CHANGED FILES SUMMARY:
[paste git diff --stat output]

PREVIOUS OPEN ISSUES (check if any were fixed):
[paste first 40 lines of docs/open-issues.md]

Return EXACTLY this format — no other text:

## [ROLE NAME] Report

### Critical (fix before next commit)
- [specific issue] | [file:line if known] | [one sentence: why this matters]

### High (fix this sprint)
- [specific issue] | [file:line if known] | [one sentence: why]

### Medium (tech debt — schedule it)
- [issue] | [file if known]

### What's good
- [1-2 specific things done well in the recent changes]

### Top recommendation
[Single sentence: the one thing this agent most wants fixed next]
```

---

## PHASE 5 — Consolidate and Write Output

After all agents return, do:

**1. Write session file** to `.claude/senior/sessions/[timestamp].md`:

```markdown
# Senior Analysis — [timestamp]

## Session metadata
- Branch: [current branch from git status]
- Baseline commit: [from baseline.md]  
- HEAD commit: [from git log]
- Files changed (HEAD~1): [count from git diff --stat]
- Files changed since baseline: [count, or "baseline = HEAD~1"]
- Agents spawned: [list]

## What changed in this session
[git diff HEAD~1 --stat output]

## Previous suggestions implemented
[scan the diff for anything that matches known open-issues.md items — note what was fixed]

---

[Full verbatim output from each agent, separated by ---]

---

## Combined priority list

### All Critical items (across all agents)
[merge all Critical items, prefixed with [ROLE] label]

### All High items
[merge all High items, prefixed with [ROLE] label]

### Top 3 actions for next session
1. [most critical item from any agent]
2. [second most critical]
3. [third]
```

**2. Print inline summary:**

```
## /senior complete — [timestamp]
Agents: [list] | Files analyzed: [count] | Baseline delta: [count] files

### 🔴 Critical
[all Critical items across all agents — prefixed with [ROLE]]

### 🟡 High  
[all High items — prefixed with [ROLE]]

### ✅ What's good
[top 3 positive findings across agents]

### Top 3 actions
1. [most important]
2. [second]
3. [third]

Full report → .claude/senior/sessions/[timestamp].md
```

---

## Rules
- Spawn ALL agents in one parallel batch (single message, multiple Agent tool calls)
- Never spawn an agent to decide what other agents to spawn — Phase 3 is deterministic
- If git diff is empty: analyze full current state vs baseline instead
- Phase 2 (stack evolution) must complete before Phase 4 so new evolved agents are available
- Do not modify any source code files — analysis only
- If a previous session file exists from today, still create a new one (append timestamp minutes)
