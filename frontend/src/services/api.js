const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
let refreshPromise = null

export class ApiError extends Error {
  constructor(message, type, statusCode, data) {
    super(message)
    this.name = 'ApiError'
    this.type = type || 'UNKNOWN_ERROR'
    this.statusCode = statusCode || 500
    this.data = data // Store the full response body for structured data (open/close timestamps etc)
  }
}

class RefreshError extends Error {
  constructor(message, type, statusCode) {
    super(message)
    this.name = 'RefreshError'
    this.type = type || 'SESSION_REFRESH_FAILED'
    this.statusCode = statusCode || 0
  }
}

function clearSession() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('user')
}

function getInterviewAccessToken() {
  try {
    const session = JSON.parse(localStorage.getItem('interviewSession') || '{}')
    return localStorage.getItem('interviewAccessToken') || session.sessionToken || null
  } catch {
    return localStorage.getItem('interviewAccessToken')
  }
}

async function runFetch(endpoint, options, token) {
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  })
}

function generateTabId() {
  const id = Math.random().toString(36).substring(2, 9)
  sessionStorage.setItem('tabId', id)
  return id
}
const TAB_ID = sessionStorage.getItem('tabId') || generateTabId()

async function acquireFallbackLock(lockName, ttlMs = 10000) {
  const now = Date.now()
  const lockDataStr = localStorage.getItem(lockName)
  let lockData = null
  try { lockData = JSON.parse(lockDataStr) } catch { /* ignore */ }

  if (lockData && lockData.owner !== TAB_ID && now < lockData.expires) {
    return false // Locked by another tab, still valid
  }

  // Acquire or renew lock
  localStorage.setItem(lockName, JSON.stringify({ owner: TAB_ID, expires: now + ttlMs }))
  
  // Double-check (prevent race conditions in localStorage)
  await new Promise(r => setTimeout(r, 20)) 
  const check = JSON.parse(localStorage.getItem(lockName) || '{}')
  return check.owner === TAB_ID
}

function releaseFallbackLock(lockName) {
  const lockDataStr = localStorage.getItem(lockName)
  try {
    const lockData = JSON.parse(lockDataStr)
    if (lockData && lockData.owner === TAB_ID) {
      localStorage.removeItem(lockName)
    }
  } catch { /* ignore */ }
}

async function doRefreshFetch() {
  const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    if (response.status === 401) {
      if (body.error === 'TOKEN_REUSE') {
        throw new RefreshError('Token reuse detected', 'TOKEN_REUSE', response.status)
      }
    }
    throw new RefreshError(
      body.message || body.error || 'Session refresh failed',
      body.error || 'SESSION_REFRESH_FAILED',
      response.status
    )
  }
  const body = await response.json()
  if (!body?.data?.accessToken) throw new Error('Session refresh failed')
  localStorage.setItem('accessToken', body.data.accessToken)
  if (body.data.user) localStorage.setItem('user', JSON.stringify(body.data.user))
  
  const channel = new BroadcastChannel('auth_channel')
  channel.postMessage({ type: 'token_refreshed', accessToken: body.data.accessToken })
  channel.close()
  
  return body.data.accessToken
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = new Promise((resolve, reject) => {
    let resolved = false
    
    // Listen for cross-tab refresh completion
    const channel = new BroadcastChannel('auth_channel')
    channel.onmessage = (event) => {
      if (event.data?.type === 'token_refreshed') {
        if (!resolved) {
          resolved = true
          channel.close()
          resolve(event.data.accessToken)
        }
      } else if (event.data === 'auth_expired' && !resolved) {
        resolved = true
        channel.close()
        reject(new Error('Session expired'))
      }
    }

    const runRefresh = async () => {
      try {
        const token = await doRefreshFetch()
        if (!resolved) {
          resolved = true
          channel.close()
          resolve(token)
        }
      } catch (err) {
        if (!resolved) {
          resolved = true
          channel.close()
          reject(err)
        }
      } finally {
        refreshPromise = null
      }
    }

    if (navigator.locks) {
      navigator.locks.request('auth_refresh_lock', { ifAvailable: true }, async (lock) => {
        if (lock) {
          await runRefresh()
        } else {
          // Wait for BroadcastChannel to resolve this promise, or timeout after 10s
          setTimeout(() => {
            if (!resolved) {
              resolved = true
              channel.close()
              reject(new Error('Refresh timeout waiting for other tab'))
            }
          }, 10000)
        }
      }).catch(reject)
    } else {
      acquireFallbackLock('auth_refresh_lock_fallback')
        .then(async gotLock => {
          if (gotLock) {
            try {
              await runRefresh()
            } finally {
              releaseFallbackLock('auth_refresh_lock_fallback')
            }
          } else {
            setTimeout(() => {
              if (!resolved) {
                resolved = true
                channel.close()
                reject(new Error('Refresh timeout waiting for other tab'))
              }
            }, 10000)
          }
        })
        .catch(reject)
    }
  })

  return refreshPromise
}

async function request(endpoint, options = {}) {
  const {
    skipAuthRedirect = false,
    authToken,
    useInterviewAuth = false,
    omitAuth = false,
    ...fetchOptions
  } = options
  const requestToken = omitAuth
    ? null
    : authToken !== undefined
      ? authToken
      : useInterviewAuth
        ? getInterviewAccessToken()
        : localStorage.getItem('accessToken')
  let response = await runFetch(
    endpoint,
    fetchOptions,
    requestToken
  )

  const isAuthEndpoint = endpoint.startsWith('/api/auth/')
  const canRefresh = !skipAuthRedirect && !isAuthEndpoint && !omitAuth && !useInterviewAuth && authToken === undefined
  if (response.status === 401 && canRefresh) {
    try {
      response = await runFetch(endpoint, fetchOptions, await refreshAccessToken())
    } catch (err) {
      if (err instanceof RefreshError && err.statusCode === 401) {
        clearSession()
        window.dispatchEvent(new CustomEvent('auth_expired'))
        throw new ApiError('Your session has expired', err.type, 401)
      }
      throw new ApiError('Could not refresh your session. Please try again.', err?.type || 'SESSION_REFRESH_FAILED', err?.statusCode || 503)
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(
      body.message || body.error || 'Request failed',
      body.error || 'UNKNOWN_ERROR',
      response.status,
      body
    )
  }
  return response.json()
}

export const login = (email, password) =>
  request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  })
export const forgotPassword = email =>
  request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuthRedirect: true,
    omitAuth: true,
  })
export const resetPassword = (token, newPassword) =>
  request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
    skipAuthRedirect: true,
    omitAuth: true,
  })
export const logout = () => request('/api/auth/logout', { method: 'POST' })
export const previewMagicLink = token =>
  request(`/api/auth/magic-link/${token}`, { method: 'GET', skipAuthRedirect: true, omitAuth: true })
export const claimMagicLink = token =>
  request(`/api/auth/magic-link/${token}/claim`, { method: 'POST', skipAuthRedirect: true, omitAuth: true })
export const getHealth = () => request('/health', { skipAuthRedirect: true, omitAuth: true })

export const getTeam = (filter = 'all') => request(`/api/team?filter=${filter}`)
export const getOrgUsersNotInTeam = () => request('/api/team/not-in-team')
export const getTeamStats = () => request('/api/team/stats')
export const getTeamActivity = () => request('/api/team/activity')
export const getMember = id => request(`/api/team/member/${id}`)
export const getMemberInterviews = id => request(`/api/team/member/${id}/interviews`)
export const getOrganizationUser = id => request(`/api/team/organization-users/${id}`)
export const getOrganizationUserInterviews = id => request(`/api/team/organization-users/${id}/interviews`)
export const addMember = data =>
  request('/api/team/member', { method: 'POST', body: JSON.stringify(data) })
export const updateMember = (id, data) =>
  request(`/api/team/member/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const removeMember = id =>
  request(`/api/team/member/${id}`, { method: 'DELETE' })
export const importTeamCSV = csv =>
  request('/api/team/import', { method: 'POST', body: JSON.stringify({ csv }) })
export const getExternalCandidates = () => request('/api/team/external')
export const addExternalCandidate = data =>
  request('/api/team/external', { method: 'POST', body: JSON.stringify(data) })

export const createSchedule = data =>
  request('/api/schedule', { method: 'POST', body: JSON.stringify(data) })
export const getInterview = interviewId =>
  request(`/api/schedule/${interviewId}`)
export const cancelInterview = interviewId =>
  request(`/api/schedule/${interviewId}/cancel`, { method: 'POST' })
export const rescheduleInterview = (interviewId, data) =>
  request(`/api/schedule/${interviewId}/reschedule`, { method: 'POST', body: JSON.stringify(data) })
export const getScheduleOrgUsers = () => request('/api/schedule/org-users')
export const getCalendarEvents = week =>
  request(`/api/schedule/calendar${week ? `?week=${week}` : ''}`)
export const getEmailDeliveries = interviewId =>
  request(`/api/schedule/email-deliveries/${interviewId}`)
export const resendMagicLink = interviewId =>
  request(`/api/schedule/email-deliveries/${interviewId}/resend`, { method: 'POST' })

export const getTeamReports = source =>
  request(`/api/reports/team${source ? `?source=${source}` : ''}`)
export const getReportDetail = id => request(`/api/reports/detail/${id}`)
export const getReportByInterview = id => request(`/api/reports/interview/${id}`)
export const getCandidateReport = id => request(`/api/reports/candidate/${id}`)
export const getCandidateReportHistory = id =>
  request(`/api/reports/candidate/${id}/history`)
export const getReportJobs = () => request('/api/reports/jobs')
export const retryReportJob = id =>
  request(`/api/reports/jobs/${id}/retry`, { method: 'POST' })

export const startInterview = id =>
  request(`/api/interviews/${id}/start`, { method: 'POST', useInterviewAuth: true, skipAuthRedirect: true })
export const completeInterview = (id, status = 'completed') =>
  request(`/api/interviews/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ status }),
    useInterviewAuth: true,
    skipAuthRedirect: true,
  })
export const logProctoringEvent = (id, data) =>
  request(`/api/interviews/${id}/proctoring`, {
    method: 'POST',
    body: JSON.stringify(data),
    useInterviewAuth: true,
    skipAuthRedirect: true,
  })
export const saveAnswer = (id, formData) =>
  request(`/api/interviews/${id}/answer`, { method: 'POST', body: formData, useInterviewAuth: true, skipAuthRedirect: true })
export const saveTextAnswer = (id, data) =>
  request(`/api/interviews/${id}/answer`, {
    method: 'POST',
    body: JSON.stringify(data),
    useInterviewAuth: true,
    skipAuthRedirect: true,
  })
export const getInterviewTranscript = id =>
  request(`/api/interviews/${id}/transcript`)

export const getCandidateInterviews = () => request('/api/candidate/interviews')
export const launchCandidateInterview = id =>
  request(`/api/candidate/interviews/${id}/launch`, { method: 'POST' })
export const getCandidateOwnReport = (interviewScoped = false) =>
  request('/api/candidate/report', {
    skipAuthRedirect: interviewScoped,
    useInterviewAuth: interviewScoped,
  })
export const getCandidateFeedbackHistory = () => request('/api/candidate/reports')

export const getExam = token =>
  request(`/api/exam/${token}`, { skipAuthRedirect: true, omitAuth: true })
export const submitExam = (token, answers, metadata = {}) =>
  request(`/api/exam/${token}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers, ...metadata }),
    skipAuthRedirect: true,
    omitAuth: true,
  })

export const uploadResume = (teamMemberId, file) => {
  const formData = new FormData()
  formData.append('resume', file)
  if (teamMemberId) formData.append('teamMemberId', String(teamMemberId))
  return request('/api/upload/resume', { method: 'POST', body: formData })
}
export const extractTextFromFile = file => {
  const formData = new FormData()
  formData.append('file', file)
  return request('/api/upload/extract-text', { method: 'POST', body: formData })
}
export const analyzeResumeMatch = (jd, resume) =>
  request('/api/upload/analyze-resume', {
    method: 'POST',
    body: JSON.stringify({ jd, resume }),
  })

export const getProfile = () => request('/api/profile')
export const getManagerProfile = getProfile
export const updateManagerProfile = data =>
  request('/api/profile', { method: 'PATCH', body: JSON.stringify(data) })
export const updateCandidateProfile = updateManagerProfile
export const uploadOwnResume = file => {
  const formData = new FormData()
  formData.append('resume', file)
  return request('/api/profile/resume', { method: 'POST', body: formData })
}

export const getMonthlyAssessments = () => request('/api/assessments/monthly')
export const createMonthlyAssessment = data =>
  request('/api/assessments/monthly', { method: 'POST', body: JSON.stringify(data) })
export const updateMonthlyAssessment = (id, data) =>
  request(`/api/assessments/monthly/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteMonthlyAssessment = id =>
  request(`/api/assessments/monthly/${id}`, { method: 'DELETE' })
export const getMonthlyAssessmentCalendar = () =>
  request('/api/assessments/monthly/calendar')
export const getMonthlyAssessmentPlan = month =>
  request(`/api/assessments/monthly/plan?month=${encodeURIComponent(month)}`)
export const assignMonthlyAssessment = (id, data) =>
  request(`/api/assessments/monthly/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
export const removeMonthlyEnrollment = id =>
  request(`/api/assessments/monthly/enrollments/${id}`, { method: 'DELETE' })
export const cancelMonthlyEnrollment = removeMonthlyEnrollment
export const generateSubtopics = data =>
  request('/api/assessments/monthly/generate-subtopics', {
    method: 'POST',
    body: JSON.stringify(data),
  })
export const generateAssessmentJD = data =>
  request('/api/assessments/monthly/generate-jd', {
    method: 'POST',
    body: JSON.stringify(data),
  })
export const getCandidateMonthlyAssessments = () => request('/api/candidate/monthly-assessments')

export const getClientTemplates = (state = 'active') => request(`/api/templates/client?state=${state}`)
export const archiveClientTemplate = id => request(`/api/templates/client/${id}/archive`, { method: 'POST' })
export const restoreClientTemplate = id => request(`/api/templates/client/${id}/restore`, { method: 'POST' })
export const deleteClientTemplate = id => request(`/api/templates/client/${id}`, { method: 'DELETE' })
export const deleteClientTemplatePreview = id => request(`/api/templates/client/${id}?preview=true`, { method: 'DELETE' })
export const createClientTemplate = data =>
  request('/api/templates/client', { method: 'POST', body: JSON.stringify(data) })
export const updateClientTemplate = (id, data) =>
  request(`/api/templates/client/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const extractTemplateTags = text =>
  request('/api/templates/client/extract-tags', { method: 'POST', body: JSON.stringify({ text }) })
export const getTemplateMatches = id => request(`/api/templates/client/${id}/matches`)
export const getTemplateAssignments = id => request(`/api/templates/client/${id}/assignments`)
export const cancelTemplateAssignment = (id, interviewId) =>
  request(`/api/templates/client/${id}/assignments/${interviewId}`, { method: 'DELETE' })
export const sendJDToTeam = (id, data) =>
  request(`/api/templates/client/${id}/send-jd`, { method: 'POST', body: JSON.stringify(data) })

// Mandate requirement profiles
export const getMandateRequirements = id => request(`/api/templates/client/${id}/requirements`)
export const createMandateRequirement = (id, data) =>
  request(`/api/templates/client/${id}/requirements`, { method: 'POST', body: JSON.stringify(data) })
export const updateMandateRequirement = (id, rqId, data) =>
  request(`/api/templates/client/${id}/requirements/${rqId}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteMandateRequirement = (id, rqId) =>
  request(`/api/templates/client/${id}/requirements/${rqId}`, { method: 'DELETE' })

// Client team (prospects)
export const getClientTeam = id => request(`/api/templates/client/${id}/team`)
export const addProspects = (id, data) =>
  request(`/api/templates/client/${id}/team`, { method: 'POST', body: JSON.stringify(data) })
export const updateClientTeamMember = (id, ctId, data) =>
  request(`/api/templates/client/${id}/team/${ctId}`, { method: 'PATCH', body: JSON.stringify(data) })
export const updateClientTeamRequirement = (id, ctId, requirementId) =>
  request(`/api/templates/client/${id}/team/${ctId}/requirement`, { method: 'PATCH', body: JSON.stringify({ requirementId }) })
export const removeFromClientTeam = (id, ctId) =>
  request(`/api/templates/client/${id}/team/${ctId}`, { method: 'DELETE' })
export const sendClientJD = (id, ctId, data) =>
  request(`/api/templates/client/${id}/team/${ctId}/send-jd`, { method: 'POST', body: JSON.stringify(data) })
export const scheduleClientTeamInterview = (id, ctId, data) =>
  request(`/api/templates/client/${id}/team/${ctId}/schedule`, { method: 'POST', body: JSON.stringify(data) })
export const createInterviewFlow = data =>
  request('/api/interview-flows', { method: 'POST', body: JSON.stringify(data) })
export const updateInterviewFlow = (flowId, data) =>
  request(`/api/interview-flows/${flowId}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteInterviewFlow = flowId =>
  request(`/api/interview-flows/${flowId}`, { method: 'DELETE' })
export const getMandateInterviewFlows = mandateId =>
  request(`/api/interview-flows/mandate/${mandateId}`)
export const getMandateInterviewFlowRuns = mandateId =>
  request(`/api/interview-flows/mandate/${mandateId}/runs`)
export const startInterviewFlow = (flowId, clientTeamId) =>
  request(`/api/interview-flows/${flowId}/runs`, { method: 'POST', body: JSON.stringify({ clientTeamId }) })
export const retryInterviewFlowRun = (runId, scheduledAt) =>
  request(`/api/interview-flows/runs/${runId}/retry`, { method: 'POST', body: JSON.stringify({ scheduledAt }) })
export const continueInterviewFlowRun = runId =>
  request(`/api/interview-flows/runs/${runId}/continue`, { method: 'POST' })
export const deleteInterviewFlowRun = runId =>
  request(`/api/interview-flows/runs/${runId}`, { method: 'DELETE' })
export const getMyInterviewerAssignments = () => request('/api/interview-flows/my-assignments')
export const completeInterviewerAssignment = (assignmentId, data) => {
  const body = new FormData()
  body.append('outcome', data.outcome)
  body.append('feedback', data.feedback || '')
  if (data.file) body.append('file', data.file)
  return request(`/api/interview-flows/assignments/${assignmentId}/complete`, { method: 'POST', body })
}
export const getVideoPlatforms = () => request('/api/templates/client/video-platforms')

// Outcome rounds (new multi-round model)
export const getOutcomeRounds = (id, ctId) =>
  request(`/api/templates/client/${id}/team/${ctId}/rounds`)
export const createOutcomeRound = (id, ctId, data) =>
  request(`/api/templates/client/${id}/team/${ctId}/rounds`, { method: 'POST', body: JSON.stringify(data) })
export const updateOutcomeRound = (id, ctId, roundId, data) =>
  request(`/api/templates/client/${id}/team/${ctId}/rounds/${roundId}`, { method: 'PATCH', body: JSON.stringify(data) })
export const publishOutcomeRound = (id, ctId, roundId) =>
  request(`/api/templates/client/${id}/team/${ctId}/rounds/${roundId}/publish`, { method: 'POST' })
export const unpublishOutcomeRound = (id, ctId, roundId) =>
  request(`/api/templates/client/${id}/team/${ctId}/rounds/${roundId}/unpublish`, { method: 'POST' })

// Candidate: client outcomes (published rounds only)
export const getCandidateClientOutcomes = () => request('/api/candidate/client-outcomes')
export const joinCandidateInterview = (interviewId, interviewScoped = false) =>
  request(`/api/candidate/interviews/${interviewId}/join`, {
    method: 'POST',
    useInterviewAuth: interviewScoped,
    skipAuthRedirect: interviewScoped,
  })

// Candidate: client mandates they've been added to
export const getCandidateClientMandates = () => request('/api/candidate/client-mandates')
export const submitClientResume = (ctId, file) => {
  const formData = new FormData()
  formData.append('resume', file)
  return request(`/api/candidate/client-mandates/${ctId}/resume`, { method: 'POST', body: formData })
}
export const useExistingResumeForClient = ctId =>
  request(`/api/candidate/client-mandates/${ctId}/resume`, {
    method: 'POST',
    body: JSON.stringify({ useExisting: true }),
  })

export const get = (url, opts) => request(url, { ...opts, method: 'GET' })
export const post = (url, body, opts) => request(url, { ...opts, method: 'POST', body: body ? JSON.stringify(body) : undefined })
export const patch = (url, body, opts) => request(url, { ...opts, method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
const _delete = (url, opts) => request(url, { ...opts, method: 'DELETE' })
export { _delete as delete }

