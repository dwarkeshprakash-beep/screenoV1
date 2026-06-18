// backend/src/services/teams.service.js
// Microsoft Teams meeting integration via Microsoft Graph API.
// Requires Azure AD app registration with Calendars.ReadWrite permission.
//
// Required env vars (set these after Azure app registration):
//   TEAMS_TENANT_ID     — Azure AD tenant ID
//   TEAMS_CLIENT_ID     — App (client) ID
//   TEAMS_CLIENT_SECRET — App secret value
//   TEAMS_USER_EMAIL    — Organizer UPN (e.g. manager@company.com)

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

let cachedToken = null
let tokenExpiresAt = 0

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken

  const { TEAMS_TENANT_ID, TEAMS_CLIENT_ID, TEAMS_CLIENT_SECRET } = process.env
  if (!TEAMS_TENANT_ID || !TEAMS_CLIENT_ID || !TEAMS_CLIENT_SECRET) {
    throw new Error('TEAMS_* env vars not configured — see teams.service.js')
  }

  const url = `https://login.microsoftonline.com/${TEAMS_TENANT_ID}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     TEAMS_CLIENT_ID,
    client_secret: TEAMS_CLIENT_SECRET,
    scope:         'https://graph.microsoft.com/.default',
  })

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal:  AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Teams token error: ${res.status}`)

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + data.expires_in * 1000
  return cachedToken
}

// Creates a Teams online meeting for a scheduled interview.
// Returns { joinUrl, meetingId } or null if Teams is not configured.
async function createMeeting({ subject, startAt, endAt, attendeeEmails = [] }) {
  const { TEAMS_USER_EMAIL } = process.env
  if (!process.env.TEAMS_TENANT_ID || !TEAMS_USER_EMAIL) return null

  try {
    const token = await getAccessToken()

    const body = {
      subject,
      startDateTime: new Date(startAt).toISOString(),
      endDateTime:   new Date(endAt).toISOString(),
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
      attendees: attendeeEmails.map(email => ({
        emailAddress: { address: email },
        type: 'required',
      })),
    }

    const res = await fetch(`${GRAPH_BASE}/users/${TEAMS_USER_EMAIL}/events`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[teams] Create meeting failed:', err)
      return null
    }

    const event = await res.json()
    return {
      joinUrl:   event.onlineMeeting?.joinUrl || event.webLink || null,
      meetingId: event.id || null,
    }
  } catch (err) {
    console.error('[teams] createMeeting error:', err.message)
    return null
  }
}

function isConfigured() {
  return !!(process.env.TEAMS_TENANT_ID && process.env.TEAMS_CLIENT_ID && process.env.TEAMS_CLIENT_SECRET)
}

module.exports = { createMeeting, isConfigured }
