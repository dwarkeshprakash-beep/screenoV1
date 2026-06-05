// backend/src/services/email.service.js
// Transactional email via Brevo SMTP + nodemailer.
// Public API is unchanged: sendMagicLink(to, params) and sendReportReady(to, params).
// For multi-recipient / CC / attachment use: sendMail({ to, cc, bcc, subject, html, text, attachments })

const nodemailer = require('nodemailer')

// ── Dev / staging override ────────────────────────────────────────────────────
// All outgoing mail is redirected here regardless of the original recipients.
// Remove these two lines (and the override inside sendMail) to restore real delivery.
const DEV_OVERRIDE_TO = 'dwarkesh.vajjala@prakashinfotech.com'
const DEV_CC          = 'contact.dwarkesh@gmail.com'
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = `"${process.env.MAIL_FROM_NAME || 'Screeno'}" <${process.env.MAIL_FROM_EMAIL}>`

/**
 * Core send function — supports multiple recipients, CC, BCC, attachments.
 * @param {{ to, cc?, bcc?, subject, html?, text?, attachments? }} opts
 */
async function sendMail({ to, cc, bcc, subject, html, text, attachments = [] }) {
  await transporter.sendMail({
    from: FROM,
    to:  DEV_OVERRIDE_TO,
    cc:  DEV_CC,
    subject,
    html,
    text,
    attachments,
  })
}

/**
 * Send a magic link to a candidate.
 * @param {string} to - candidate email
 * @param {{ candidateName, interviewToken, companyName, jobTitle, windowDays }} params
 */
async function sendMagicLink(to, { candidateName, interviewToken, companyName, jobTitle, windowDays }) {
  const link = `${process.env.FRONTEND_URL}/interview/${interviewToken}`

  await sendMail({
    to,
    subject: `Your interview link — ${jobTitle || 'Assessment'} at ${companyName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#0F172A">Hi ${candidateName},</h2>
        <p>You've been invited to complete an interview for <strong>${jobTitle || 'an assessment'}</strong> at <strong>${companyName}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#5B4FE9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Start Interview &rarr;
          </a>
        </p>
        <p style="color:#6B7280;font-size:14px">This link is valid for ${windowDays || 7} days. You can return to it at any time.</p>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0" />
        <p style="color:#94A3B8;font-size:12px">This is an automated email from Praskesh Infotech. Please do not reply to this email.</p>
      </div>
    `,
  })
}

/**
 * Notify a manager that a report is ready.
 * @param {string} to - manager email
 * @param {{ candidate, interviewId, companyName }} params
 */
async function sendReportReady(to, { candidate, interviewId, companyName }) {
  const link = `${process.env.FRONTEND_URL}/manager/team/${candidate.id}`

  await sendMail({
    to,
    subject: `Report ready — ${candidate.first_name} ${candidate.last_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#0F172A">Interview report ready</h2>
        <p>The AI report for <strong>${candidate.first_name} ${candidate.last_name}</strong> is now available.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#5B4FE9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            View Report &rarr;
          </a>
        </p>
        <p style="color:#94A3B8;font-size:12px">This is an automated email from Praskesh Infotech. Please do not reply to this email.</p>
        <p style="color:#94A3B8;font-size:12px">Screeno &middot; ${companyName}</p>
      </div>
    `,
  })
}

module.exports = { sendMail, sendMagicLink, sendReportReady }
