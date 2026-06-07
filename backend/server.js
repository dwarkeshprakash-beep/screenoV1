// backend/server.js
// Entry point — Express app with all middleware and routes mounted.
// Run: node server.js  OR  npx nodemon server.js

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const rateLimit = require('./src/middleware/rate-limit')

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
const reportJobService = require('./src/services/report-job.service')

const app = express()
const PORT = process.env.PORT || 4000

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim())
    if (!origin || allowed.includes(origin)) return cb(null, true)
    if (process.env.NODE_ENV !== 'production') return cb(null, true)
    cb(new Error('CORS: origin not allowed'))
  },
  credentials: true,
}))

app.disable('x-powered-by')
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()')
  req.setTimeout(req.path.includes('/answer') ? 120000 : 60000)
  next()
})
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: 'auth' })
const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: 'write' })

// ── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return writeLimiter(req, res, next)
  next()
})
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
  reportJobService.startReportJobWorker()
})
