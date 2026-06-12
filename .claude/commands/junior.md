# /junior — Quick Multi-Agent Scan

Fast review of recent changes. 2-3 targeted agents, inline output only.
Use during active development for quick feedback. For deep analysis → /senior.

Stack evolution check is SKIPPED here — run /senior periodically to keep evolved.md current.

---

## STEP 1 — Quick Context

Read `BRAIN.md` only (sections: "Current Gaps" and "Feature Impact Map").
Read `.claude/senior/agents/core.md`.
Read `.claude/senior/agents/evolved.md` (agent names and trigger files only — skip analysis focus).

Run:
```
git diff HEAD~1 --stat
git diff HEAD~1
git diff
git diff --cached
```

Build CHANGED_FILES list from the output.

---

## STEP 2 — Select Top 2-3 Focus Areas

From CHANGED_FILES, identify the changed area with the most lines.
Then apply this priority tiebreaker (higher = spawn first):

1. Auth/security files → always spawn SECURITY_AGENT if touched
2. Backend routes/services with user data → BACKEND_EXPERT
3. Frontend pages/components → REACT_EXPERT  
4. Database repositories/migrations → DATABASE_EXPERT
5. Config/package files → DEVOPS_AGENT

Select the top 2 agents. Add a 3rd only if a security file was changed (SECURITY_AGENT always
gets added if `auth.*`, `*middleware*`, or `*token*` is in CHANGED_FILES).

Check evolved.md: if any evolved agent's trigger files match CHANGED_FILES, swap one general
agent for the more specific evolved agent (e.g., swap DATABASE_EXPERT for SUPABASE_EXPERT if
repository files changed).

---

## STEP 3 — Spawn 2-3 Agents in Parallel

Spawn all selected agents simultaneously in a single message.

Each agent gets this lean context:
```
You are a [ROLE] doing a quick scan of recent changes to Screeno (AI interview platform).

QUICK PROJECT CONTEXT:
- Three roles: Manager (schedules), Candidate (magic link, takes interview), Interviewer (video call + scorecard)
- Key rule: candidate routes use magicLink middleware, not JWT auth
- Key rule: all SQL in repositories only, business logic in services only
- team_members.id ≠ candidates.id — different namespaces, never swap them
- Scores from backend are 1-10 integers — frontend never divides them
- Known open gap: getReportsByManager and getHistoryByUser missing scorecard LEFT JOIN

YOUR QUICK-CHECK LIST:
[paste the trigger files and Quick checks from this agent's Junior definition in evolved.md,
 or if no Junior definition exists, use the first 4 bullets from the Senior analysis focus]

GIT DIFF (your domain only):
[paste git diff lines matching this agent's trigger files]

Return ONLY:
🔴 Critical: [issue] ([file])   ← bugs causing wrong behavior right now
🟡 Watch: [issue] ([file])      ← will cause problems soon
✅ Good: [one thing done right]
Next: [single most important fix]

Max 8 lines total. Bullets only. No explanation unless critical.
```

---

## STEP 4 — Print Inline Summary

No session file. Print directly to chat:

```
/junior — [date] | Agents: [list] | Files: [changed count]

[all 🔴 Critical bullets from all agents]
[all 🟡 Watch bullets from all agents]
[one ✅ Good from each agent]

→ Next: [the single highest-priority fix across all agents]
```

If no issues found: print `✅ No critical issues in recent changes. [file count] files scanned.`
