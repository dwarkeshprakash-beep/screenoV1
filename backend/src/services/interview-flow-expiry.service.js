const interviewFlowService = require('./interview-flow.service')

let intervalId = null
let running = false

async function processExpiredInterviewFlows() {
  if (running) return []
  running = true
  try {
    return await interviewFlowService.processExpiredFlows()
  } finally {
    running = false
  }
}

function startInterviewFlowExpiryWorker() {
  if (intervalId) return
  const intervalMs = Math.max(
    5000,
    Number.parseInt(process.env.INTERVIEW_FLOW_EXPIRY_INTERVAL_MS || '30000', 10) || 30000
  )
  intervalId = setInterval(() => {
    processExpiredInterviewFlows()
      .catch(err => console.error('Expired interview flow processing failed:', err))
  }, intervalMs)
  intervalId.unref?.()
  processExpiredInterviewFlows()
    .catch(err => console.error('Expired interview flow processing failed:', err))
}

function stopInterviewFlowExpiryWorker() {
  if (intervalId) clearInterval(intervalId)
  intervalId = null
}

module.exports = {
  processExpiredInterviewFlows,
  startInterviewFlowExpiryWorker,
  stopInterviewFlowExpiryWorker,
}
