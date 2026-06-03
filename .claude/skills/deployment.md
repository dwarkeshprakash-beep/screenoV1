# SKILL: Deployment — Screeno

> How to deploy frontend and backend. Reference when ready to ship.

---

## Architecture

```
Frontend (React)  →  Vercel (free tier)
Backend (Express) →  Render starter ($7/mo)
Database          →  SSMS local dev → Azure SQL for production
Files             →  Cloudinary (free tier)
Video             →  LiveKit Cloud (free tier)
```

---

## Frontend — Vercel

1. Push frontend code to GitHub
2. Go to vercel.com → New Project → import GitHub repo
3. Framework: Create React App
4. Root directory: `frontend`
5. Build command: `npm run build`
6. Output directory: `build`
7. Add environment variables:
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com
   REACT_APP_LIVEKIT_URL=wss://your-livekit-server
   ```
8. Deploy

Every push to `main` auto-deploys.

---

## Backend — Render

1. Go to render.com → New → Web Service
2. Connect GitHub repo
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Plan: **Starter ($7/mo)** — never use free tier (spins down after 15 min idle, breaks interviews)
7. Add all environment variables from `backend/.env`

---

## Database — Azure SQL (production)

For production, migrate from local SSMS to Azure SQL:

1. Create Azure SQL database in Azure Portal
2. Run `backend/migrations/001_create_tables.sql` in Azure SQL
3. Update `backend/.env`:
   ```
   DB_SERVER=your-server.database.windows.net
   DB_DATABASE=Screeno
   DB_USER=screeno_admin
   DB_PASSWORD=your_password
   DB_ENCRYPT=true
   ```

Cost: ~$5/month (Basic tier, 2GB, enough for Phase 1)

---

## Environment variables checklist

```bash
# backend/.env — all required before first deploy
PORT=4000
DB_SERVER=localhost          # or Azure SQL server
DB_DATABASE=Screeno
DB_USER=screeno_user
DB_PASSWORD=ScreenoPass123!
JWT_SECRET=                  # generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
GROQ_API_KEY=                # console.groq.com (free)
GEMINI_API_KEY=              # aistudio.google.com (free)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
RESEND_API_KEY=              # resend.com (free 3000/mo)
FRONTEND_URL=http://localhost:3000   # or https://screeno.vercel.app
```

---

## Pre-deploy checklist

- [ ] All `.env` values filled in (no empty values)
- [ ] DB migration script run successfully
- [ ] API health check works: `GET /health` returns `{ status: "ok" }`
- [ ] Login works with test manager account
- [ ] Candidate can open a magic link and reach interview landing page
- [ ] No `console.log` with sensitive data in code
- [ ] `.env` not committed to git (check `.gitignore`)
- [ ] Cloudinary credentials tested (upload a test file)
- [ ] Groq API key tested (make a test LLM call)

---

## Local dev setup (for new team members)

```bash
# Clone
git clone https://github.com/dwarkeshprakash-beep/screenoV1
cd screenoV1

# Backend setup
cd backend
npm install
cp .env.example .env        # fill in values
# Run migration in SSMS: backend/migrations/001_create_tables.sql
node server.js              # starts on port 4000

# Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env        # set REACT_APP_API_URL=http://localhost:4000
npm start                   # starts on port 3000
```
