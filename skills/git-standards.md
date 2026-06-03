# Git Standards — Screeno

Repo: https://github.com/dwarkeshprakash-beep/screenoV1

---

## Branch structure

```
main        ← stable, production-ready only
  └── dev   ← active development, all features merge here first
        ├── feat/schedule-modal
        ├── feat/ai-interview-room
        ├── fix/device-check-camera
        └── chore/update-groq-sdk
```

**Never commit directly to `main`.** All work goes to `dev` first.

---

## Branch naming

```
feat/short-description    → new feature
fix/short-description     → bug fix
chore/short-description   → dependency update, config change, setup
docs/short-description    → documentation only
test/short-description    → tests only

Examples:
feat/schedule-modal
feat/ai-voice-interview
feat/candidate-device-check
fix/audio-recording-safari
fix/jwt-refresh-token
chore/update-node-packages
docs/database-schema
```

Keep it short. Use hyphens. Lowercase only.

---

## Commit messages

```
Simple English, not too long, not too short.
Start with the type, then describe what changed.

type: what changed in plain words

Types: feat, fix, chore, docs, test, refactor

Examples:
feat: add schedule modal with 4-step wizard
feat: save interview answers one by one to backend
fix: audio not recording on Firefox
fix: JWT token not refreshing automatically
chore: update Groq SDK to latest version
docs: add database schema with sample queries
test: add tests for interview service
refactor: move SQL queries out of routes into repositories
```

Keep the message under 72 characters. Don't add a period at the end.

---

## Daily workflow

```bash
# Start of the day — get latest from dev
git checkout dev
git pull origin dev

# Create a new branch for your feature
git checkout -b feat/your-feature-name

# Work on the feature in small commits
git add frontend/src/components/manager/ScheduleModal.jsx
git commit -m "feat: add step 1 of schedule modal"

git add frontend/src/components/manager/ScheduleModal.jsx
git commit -m "feat: add step 2 with attempt settings"

# When feature is ready — update from dev to avoid conflicts
git fetch origin
git rebase origin/dev

# Push to GitHub
git push origin feat/your-feature-name

# Open Pull Request from your branch → dev on GitHub
```

---

## Merging rules

- Always merge **feature branch → dev** (never directly to main)
- Squash merge is fine to keep history clean
- Review your own diff on GitHub before opening PR
- Delete the feature branch after merging

---

## Merging dev → main (releases)

When `dev` is stable and tested:

```bash
git checkout main
git merge --ff-only dev       # fast-forward only, no merge commits
git tag v0.1.0
git push origin main --tags
```

---

## Tags / releases

```
v0.1.0   Manager + Candidate working end to end (Phase 1)
v0.2.0   Interviewer role added
v0.3.0   Reports + email notifications working
v1.0.0   Phase 1 complete, ready for internal pilot
v2.0.0   Phase 2 launch (HR role, external candidates)
```

---

## What goes in each commit

- One logical change per commit — not ten things in one commit
- If you fixed a bug while building a feature — two separate commits
- Never commit `.env` files — add to `.gitignore`
- Always commit `package.json` when you add a dependency

---

## .gitignore essentials

```
# Never commit these
.env
.env.local
node_modules/
build/
dist/
.next/
*.log
```
