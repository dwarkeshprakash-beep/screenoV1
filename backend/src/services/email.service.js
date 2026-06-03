// backend/src/services/email.service.js
// Transactional email via Resend REST API (plain fetch, no SDK).

const RESEND_API = 'https://api.resend.com/emails'
const FROM = 'Screeno <noreply@screeno.app>'

/**
 * Send a raw email via Resend.
 * @param {Object} payload - { to, subject, html }
 * @returns {Promise<void>}
 */
async function sendEmail(payload) {
  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM,
      ...payload,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Resend API failed: ${response.status} ${err}`)
  }
}

/**
 * Send a magic link to a candidate.
 * @param {string} to - candidate email
 * @param {Object} params
 */
async function sendMagicLink(to, { candidateName, interviewToken, companyName, jobTitle, windowDays }) {
  const link = `${process.env.FRONTEND_URL}/interview/${interviewToken}`

  await sendEmail({
    to,
    subject: `Your interview link — ${jobTitle || 'Assessment'} at ${companyName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#0F172A">Hi ${candidateName},</h2>
        <p>You've been invited to complete an interview for <strong>${jobTitle || 'an assessment'}</strong> at <strong>${companyName}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#5B4FE9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Start Interview →
          </a>
        </p>
        <p style="color:#6B7280;font-size:14px">This link is valid for ${windowDays || 7} days. You can return to it at any time.</p>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0" />
        <p style="color:#94A3B8;font-size:12px">Sent by Screeno · AI-powered hiring platform</p>
      </div>
    `,
  })
}

/**
 * Notify a manager that a report is ready.
 * @param {string} to - manager email
 * @param {Object} params
 */
async function sendReportReady(to, { candidate, interviewId, companyName }) {
  const link = `${process.env.FRONTEND_URL}/manager/team/${candidate.id}`

  await sendEmail({
    to,
    subject: `Report ready — ${candidate.first_name} ${candidate.last_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#0F172A">Interview report ready</h2>
        <p>The AI report for <strong>${candidate.first_name} ${candidate.last_name}</strong> is now available.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#5B4FE9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            View Report →
          </a>
        </p>
        <p style="color:#94A3B8;font-size:12px">Screeno · ${companyName}</p>
      </div>
    `,
  })
}

module.exports = { sendMagicLink, sendReportReady }
