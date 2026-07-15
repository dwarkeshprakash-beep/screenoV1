// backend/src/services/google-meet.service.js
// Creates Google Meet links via the Google Calendar API using a Service Account.
// The service account must have Calendar API access and domain-wide delegation
// (or be the calendar owner) to create events on behalf of an organizer.
//
// Required env vars (from Google Cloud Console → Service Accounts):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL — service account email (xxx@project.iam.gserviceaccount.com)
//   GOOGLE_SERVICE_ACCOUNT_KEY   — private key from JSON key file (PEM, newlines as \n)
//   GOOGLE_CALENDAR_ORGANIZER    — calendar/user the event is created under (organizer's email)
//                                  Omit to default to the service account itself.

const { createSign } = require('crypto')

let cachedToken = null
let tokenExpiresAt = 0

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken

  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_CALENDAR_ORGANIZER } = process.env
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_* env vars not configured — see google-meet.service.js')
  }

  const now = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss:   GOOGLE_SERVICE_ACCOUNT_EMAIL,
    sub:   GOOGLE_CALENDAR_ORGANIZER || GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  })).toString('base64url')

  const privateKey = GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n')
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  const signature = signer.sign(privateKey, 'base64url')
  const jwt = `${header}.${payload}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Google token error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000
  return cachedToken
}

// Creates a Google Calendar event with a Meet link.
// Returns { joinUrl, eventId } or null on failure.
async function createMeeting({ summary, startAt, endAt, attendeeEmails = [] }) {
  if (!isConfigured()) return null
  try {
    const token = await getAccessToken()
    const organizer = process.env.GOOGLE_CALENDAR_ORGANIZER || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const calendarId = encodeURIComponent(organizer)

    const endIso = endAt || new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString()

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          start:     { dateTime: new Date(startAt).toISOString() },
          end:       { dateTime: new Date(endIso).toISOString() },
          attendees: attendeeEmails.map(email => ({ email })),
          conferenceData: {
            createRequest: {
              requestId:             `screeno-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    )
    if (!res.ok) { console.error('[google-meet] Create event failed:', await res.text()); return null }

    const event = await res.json()
    const videoEntry = (event.conferenceData?.entryPoints || []).find(ep => ep.entryPointType === 'video')
    return {
      joinUrl: videoEntry?.uri || event.htmlLink || null,
      eventId: event.id || null,
    }
  } catch (err) {
    console.error('[google-meet] createMeeting error:', err.message)
    return null
  }
}

async function updateMeeting(eventId, { summary, startAt, endAt, attendeeEmails = [] }) {
  if (!isConfigured() || !eventId) return null
  try {
    const token = await getAccessToken()
    const organizer = process.env.GOOGLE_CALENDAR_ORGANIZER || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const calendarId = encodeURIComponent(organizer)
    const endIso = endAt || new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString()
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          start: { dateTime: new Date(startAt).toISOString() },
          end: { dateTime: new Date(endIso).toISOString() },
          attendees: attendeeEmails.map(email => ({ email })),
        }),
        signal: AbortSignal.timeout(15000),
      }
    )
    if (!res.ok) throw new Error(`Google event update failed (${res.status}): ${await res.text()}`)
    const event = await res.json()
    const videoEntry = (event.conferenceData?.entryPoints || []).find(ep => ep.entryPointType === 'video')
    return { joinUrl: videoEntry?.uri || event.hangoutLink || event.htmlLink || null, eventId: event.id || eventId }
  } catch (err) {
    console.error('[google-meet] updateMeeting error:', err.message)
    throw err
  }
}

async function cancelMeeting(eventId) {
  if (!isConfigured() || !eventId) return false
  const token = await getAccessToken()
  const organizer = process.env.GOOGLE_CALENDAR_ORGANIZER || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const calendarId = encodeURIComponent(organizer)
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google event cancellation failed (${res.status}): ${await res.text()}`)
  }
  return true
}

function isConfigured() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
}

module.exports = { createMeeting, updateMeeting, cancelMeeting, isConfigured }
