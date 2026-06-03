// backend/server.js
// Entry point — Express app with all middleware and routes mounted.
// Run: node server.js  OR  npx nodemon server.js

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const authRoutes = require('./src/routes/auth.routes')
const teamRoutes = require('./src/routes/team.routes')
const interviewRoutes = require('./src/routes/interview.routes')
const reportRoutes = require('./src/routes/report.routes')
const scheduleRoutes = require('./src/routes/schedule.routes')
const candidateRoutes = require('./src/routes/candidate.routes')
const interviewerRoutes = require('./src/routes/interviewer.routes')
const templateRoutes = require('./src/routes/template.routes')
const examRoutes = require('./src/routes/exam.routes')
const uploadRoutes = require('./src/routes/upload.routes')
const profileRoutes = require('./src/routes/profile.routes')

const app = express()
const PORT = process.env.PORT || 4000

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,          // allow HttpOnly refresh token cookie
}))

app.use(express.json())
app.use(cookieParser())

// ── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/candidate', candidateRoutes)
app.use('/api/interviewer', interviewerRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/exam', examRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/profile', profileRoutes)

// Health check — used by uptime monitors and deploy checks
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404 fallback — route not found
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// Global error handler — catches anything thrown without a try/catch
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err)
  res.status(500).json({ success: false, error: 'Something went wrong' })
})

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`)
})
