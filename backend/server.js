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
const examRoutes = require('./src/routes/exam.routes')
const uploadRoutes = require('./src/routes/upload.routes')
const profileRoutes = require('./src/routes/profile.routes')
const clientTemplateRoutes = require('./src/routes/client-template.routes')
const monthlyAssessmentRoutes = require('./src/routes/monthly-assessment.routes')
const reportJobService = require('./src/services/report-job.service')
const db = require('./src/db/connection')

const app = express()
const PORT = process.env.PORT || 4000

// Last-resort safety net — log and keep running instead of crashing the process.
// Background work (report generation, email delivery) fires promise chains that
// the request/response cycle never awaits, so a slipped-through rejection here
// must not take down interviews that are already in progress.
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
app.use('/api/templates/client', clientTemplateRoutes)
app.use('/api/exam', examRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/assessments/monthly', monthlyAssessmentRoutes)

// Health check — used by uptime monitors and deploy checks
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(503).json({ status: 'error', error: 'DB unreachable', timestamp: new Date().toISOString() })
  }
})

// 404 fallback — route not found
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// Global error handler — catches anything thrown without a try/catch
app.use((err, req, res, next) => {
  if (err.name === 'MulterError' || /file type not allowed/i.test(err.message)) {
    return res.status(400).json({ success: false, error: err.message })
  }
  console.error('[server] Unhandled error:', err)
  res.status(500).json({ success: false, error: 'Something went wrong' })
})

// ── START ─────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`)
  reportJobService.startReportJobWorker()
})

let shuttingDown = false
async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[server] ${signal} received — graceful shutdown`)
  const forceExit = setTimeout(() => process.exit(exitCode || 1), 10000)
  forceExit.unref()
  try {
    await reportJobService.stopReportJobWorker()
  } finally {
    server.close(() => process.exit(exitCode))
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason)
  void shutdown('unhandledRejection', 1)
})
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err)
  void shutdown('uncaughtException', 1)
})
