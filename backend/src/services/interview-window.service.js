function durationMinutesFor(interview) {
  const configured = Number(interview?.duration_minutes)
  if (Number.isInteger(configured) && configured > 0) return configured

  if (interview?.type === 'exam') {
    const qCount = Number(interview.question_count) || 10
    return Math.min(90, Math.max(15, qCount * 4))
  }
  if (interview?.type === 'human') return 60
  return 25
}

function launchWindow(interview, now = new Date()) {
  if (!interview?.scheduled_at) {
    return {
      state: 'open',
      durationMinutes: durationMinutesFor(interview),
      opensAt: null,
      closesAt: null,
    }
  }

  const opensAt = new Date(interview.scheduled_at)
  const durationMinutes = durationMinutesFor(interview)
  const closesAt = new Date(opensAt.getTime() + durationMinutes * 60 * 1000)
  const nowDate = now instanceof Date ? now : new Date(now)

  if (Number.isNaN(opensAt.getTime())) {
    return { state: 'open', durationMinutes, opensAt: null, closesAt: null }
  }
  if (nowDate < opensAt) {
    return { state: 'not_yet', durationMinutes, opensAt, closesAt }
  }
  if (interview.status === 'scheduled' && nowDate > closesAt) {
    return { state: 'expired', durationMinutes, opensAt, closesAt }
  }
  return { state: 'open', durationMinutes, opensAt, closesAt }
}

function formatWindowDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function launchWindowMessage(window) {
  if (window.state === 'not_yet') {
    return `This assessment opens at ${formatWindowDate(window.opensAt)}.`
  }
  if (window.state === 'expired') {
    return `This assessment window expired at ${formatWindowDate(window.closesAt)}. Your manager has been notified to reschedule.`
  }
  return null
}

module.exports = {
  durationMinutesFor,
  launchWindow,
  launchWindowMessage,
  formatWindowDate,
}
