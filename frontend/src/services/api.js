// frontend/src/services/api.js
// Central API client — ALL backend calls go through here.
// Handles auth header, 401 redirect, and consistent error throwing.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/**
 * Base request helper — attaches JWT, sends cookies, handles 401.
 * @param {string} endpoint
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('accessToken')
  const { skipAuthRedirect, ...fetchOptions } = options

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
    credentials: 'include',
  })

  // 401 on auth endpoints (login) = wrong credentials — let the caller handle it
  // 401 on any other endpoint = session expired — redirect to login
  if (response.status === 401 && !skipAuthRedirect) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
    return
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Request failed')
  }

  return response.json()
}

// ── AUTH ──────────────────────────────────────────────────────
export const login = (email, password) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), skipAuthRedirect: true })

export const logout = () =>
  request('/api/auth/logout', { method: 'POST' })

export const refreshToken = () =>
  request('/api/auth/refresh', { method: 'POST' })

export const validateMagicLink = (token) =>
  request(`/api/auth/magic-link/${token}`, { method: 'POST' })

// ── TEAM ──────────────────────────────────────────────────────
export const getTeam = (filter = 'all') => request(`/api/team?filter=${filter}`)
export const getTeamStats = () => request('/api/team/stats')
export const getTeamActivity = () => request('/api/team/activity')
export const getMember = (id) => request(`/api/team/member/${id}`)
export const getMemberNotes = (id) => request(`/api/team/member/${id}/notes`)
export const getMemberInterviews = (id) => request(`/api/team/member/${id}/interviews`)
export const addMemberNote = (id, note) => request(`/api/team/member/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) })
export const addMember = (data) => request('/api/team/member', { method: 'POST', body: JSON.stringify(data) })
export const updateMember = (id, data) => request(`/api/team/member/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const removeMember = (id) => request(`/api/team/member/${id}`, { method: 'DELETE' })

// ── SCHEDULE ──────────────────────────────────────────────────
export const createSchedule = (data) =>
  request('/api/schedule', { method: 'POST', body: JSON.stringify(data) })

export const getCalendarEvents = (week) =>
  request(`/api/schedule/calendar${week ? `?week=${week}` : ''}`)

export const getAvailableSlots = (token) => request(`/api/schedule/slots/${token}`)

// ── TEMPLATES ────────────────────────────────────────────────
export const getTemplates = () => request('/api/templates')
export const createTemplate = (data) => request('/api/templates', { method: 'POST', body: JSON.stringify(data) })
export const updateTemplate = (id, data) => request(`/api/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteTemplate = (id) => request(`/api/templates/${id}`, { method: 'DELETE' })

// ── REPORTS ───────────────────────────────────────────────────
export const getTeamReports = () => request('/api/reports/team')
export const getCandidateReport = (id) => request(`/api/reports/candidate/${id}`)

// ── INTERVIEWS ────────────────────────────────────────────────
export const startInterview = (id) => request(`/api/interviews/${id}/start`, { method: 'POST' })
export const completeInterview = (id, attemptId) =>
  request(`/api/interviews/${id}/complete`, { method: 'POST', body: JSON.stringify({ attemptId }) })
export const logProctoringEvent = (id, data) =>
  request(`/api/interviews/${id}/proctoring`, { method: 'POST', body: JSON.stringify(data) })

/**
 * Save an answer — sends audio as multipart/form-data (no Content-Type header).
 * @param {number} id - interview ID
 * @param {FormData} formData - contains audio blob + metadata
 */
export const saveAnswer = (id, formData) => {
  const token = localStorage.getItem('accessToken')
  return fetch(`${BASE_URL}/api/interviews/${id}/answer`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData,
  }).then(async r => {
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      throw new Error(body.error || 'Save answer failed')
    }
    return r.json()
  })
}

// ── CANDIDATE ─────────────────────────────────────────────────
export const getCandidateInterviews = () => request('/api/candidate/interviews')
export const getCandidateOwnReport = () => request('/api/candidate/report', { skipAuthRedirect: true })

// ── INTERVIEWER ───────────────────────────────────────────────
export const getInterviewerSchedule = (date) =>
  request(`/api/interviewer/schedule${date ? `?date=${date}` : ''}`)

export const getPendingScorecards = () => request('/api/interviewer/scorecards')

export const submitScorecard = (interviewId, data) =>
  request(`/api/interviewer/scorecard/${interviewId}`, { method: 'POST', body: JSON.stringify(data) })

export const getScorecardData = (interviewId) =>
  request(`/api/interviewer/scorecard-data/${interviewId}`)

export const getInterviewTranscript = (interviewId) =>
  request(`/api/interviews/${interviewId}/transcript`)

// ── EXAM ──────────────────────────────────────────────────────
export const getExam = (token) => request(`/api/exam/${token}`)
export const submitExam = (token, answers) =>
  request(`/api/exam/${token}/submit`, { method: 'POST', body: JSON.stringify({ answers }) })

// ── LIVEKIT ───────────────────────────────────────────────────
export const getLiveKitToken = (roomName, participantName) =>
  request('/api/interviewer/livekit-token', {
    method: 'POST',
    body: JSON.stringify({ roomName, participantName }),
  })

// ── UPLOAD ────────────────────────────────────────────────────
/**
 * Upload a PDF resume for a candidate.
 * Sends multipart/form-data — do NOT use request() helper (browser must set Content-Type boundary).
 * @param {number} candidateId
 * @param {File} file
 * @returns {Promise<{ success: boolean, data: { resumeUrl: string } }>}
 */
export const uploadResume = (candidateId, file) => {
  const token = localStorage.getItem('accessToken')
  const formData = new FormData()
  formData.append('resume', file)
  formData.append('candidateId', String(candidateId))
  return fetch(`${BASE_URL}/api/upload/resume`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData,
  }).then(async r => {
    if (!r.ok) {
      const b = await r.json().catch(() => ({}))
      throw new Error(b.error || 'Upload failed')
    }
    return r.json()
  })
}

// ── PROFILE ───────────────────────────────────────────────────
export const getManagerProfile    = () => request('/api/profile')
export const updateManagerProfile = (data) =>
  request('/api/profile', { method: 'PATCH', body: JSON.stringify(data) })

// Interviewers share the same profile endpoint (JWT identifies the user)
export const getInterviewerProfile    = () => request('/api/profile')
export const updateInterviewerProfile = (data) =>
  request('/api/profile', { method: 'PATCH', body: JSON.stringify(data) })
