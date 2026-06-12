const reportJobRepository = require('../repositories/report-job.repository')
const interviewService = require('./interview.service')

let running = false

async function processReportJobs() {
  if (running) return
  running = true
  try {
    const jobs = await reportJobRepository.getPendingJobs()
    for (const job of jobs) {
      await reportJobRepository.markStarted(job.id)
      try {
        await interviewService.generateReport(job.interview_id)
        await reportJobRepository.markCompleted(job.id)
      } catch (err) {
        console.error('report job failed:', err)
        await reportJobRepository.markFailed(job.id, err.message)
      }
    }
  } finally {
    running = false
  }
}

let intervalId = null

function startReportJobWorker() {
  const intervalMs = parseInt(process.env.REPORT_JOB_INTERVAL_MS || '15000', 10)
  intervalId = setInterval(() => {
    processReportJobs().catch(err => console.error('processReportJobs failed:', err))
  }, intervalMs)
  processReportJobs().catch(err => console.error('processReportJobs failed:', err))
}

async function stopReportJobWorker() {
  if (intervalId) clearInterval(intervalId)
  await reportJobRepository.resetProcessingJobs()
}

module.exports = { processReportJobs, startReportJobWorker, stopReportJobWorker }
