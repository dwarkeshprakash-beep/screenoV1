const reportJobRepository = require('../repositories/report-job.repository')
const interviewService = require('./interview.service')

let running = false

async function processReportJobs() {
  if (running) return
  running = true
  try {
    const jobs = await reportJobRepository.getReady(3)
    for (const job of jobs) {
      await reportJobRepository.markRunning(job.id)
      try {
        await interviewService.generateReport(job.interview_id, job.attempt_id)
        await reportJobRepository.markCompleted(job.id)
      } catch (err) {
        console.error('report job failed:', err)
        await reportJobRepository.markError(job.id, err.message)
      }
    }
  } finally {
    running = false
  }
}

function startReportJobWorker() {
  const intervalMs = parseInt(process.env.REPORT_JOB_INTERVAL_MS || '15000', 10)
  setInterval(() => {
    processReportJobs().catch(err => console.error('processReportJobs failed:', err))
  }, intervalMs)
  processReportJobs().catch(err => console.error('processReportJobs failed:', err))
}

module.exports = { processReportJobs, startReportJobWorker }
