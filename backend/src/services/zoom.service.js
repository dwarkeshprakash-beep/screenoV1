// backend/src/services/zoom.service.js
// Zoom Server-to-Server OAuth — creates scheduled Zoom meetings.
//
// Required env vars (from zoom.us → App Marketplace → Server-to-Server OAuth):
//   ZOOM_ACCOUNT_ID    — Account credentials app account ID
//   ZOOM_CLIENT_ID     — App client ID
//   ZOOM_CLIENT_SECRET — App client secret

const ZOOM_API = 'https://api.zoom.us/v2'

let cachedToken = null
let tokenExpiresAt = 0

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error('ZOOM_* env vars not configured — see zoom.service.js')
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    {
      method:  'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      signal:  AbortSignal.timeout(10000),
    }
  )
  if (!res.ok) throw new Error(`Zoom token error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000
  return cachedToken
}

// Creates a Zoom meeting. Returns { joinUrl, startUrl, meetingId } or null on failure.
async function createMeeting({ topic, startAt, durationMinutes = 60 }) {
  if (!isConfigured()) return null
  try {
    const token = await getAccessToken()
    const res = await fetch(`${ZOOM_API}/users/me/meetings`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        type:          2,
        start_time:    new Date(startAt).toISOString(),
        duration:      durationMinutes,
        timezone:      'Asia/Kolkata',
        settings: {
          host_video:        true,
          participant_video:  true,
          join_before_host:  true,
          waiting_room:      false,
          mute_upon_entry:   false,
        },
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) { console.error('[zoom] Create meeting failed:', await res.text()); return null }
    const meeting = await res.json()
    return {
      joinUrl:   meeting.join_url   || null,
      startUrl:  meeting.start_url  || null,
      meetingId: String(meeting.id  || ''),
    }
  } catch (err) {
    console.error('[zoom] createMeeting error:', err.message)
    return null
  }
}

function isConfigured() {
  return !!(process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET)
}

module.exports = { createMeeting, isConfigured }
