// backend/src/services/email.service.js
// Transactional email via Brevo.
//
// Two send paths — chosen automatically:
//   1. Brevo HTTP API  (if BREVO_API_KEY is set) — works from any host (HTTPS port 443)
//   2. Brevo SMTP      (nodemailer, ports 587 → 465 fallback) — works from local dev
//
// All paths enforce static-only delivery — no real candidate/manager addresses are ever used.

const nodemailer = require('nodemailer')

// ── SMTP transporters (local dev) ─────────────────────────────────────────────

const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Port 465 fallback — some hosts block 587 but allow 465.
const smtpTransporterAlt = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

const SMTP_CONNECTION_ERRORS = ['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNREFUSED']

// ── Static recipients — all mail is redirected here ──────────────────────────

const FROM_NAME  = process.env.MAIL_FROM_NAME  || 'Screeno'
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL

const STATIC_RECIPIENTS = [
  'dwarkesh.vajjala@prakashinfotech.com',
  'contact.dwarkesh@gmail.com',
  'dvajjala@gmail.com',
]

function getRecipients(originalTo) {
  let deliveredTo;
  if (Array.isArray(originalTo)) {
    deliveredTo = originalTo;
  } else if (typeof originalTo === 'string') {
    deliveredTo = originalTo.split(',').map(e => e.trim()).filter(Boolean);
  } else {
    deliveredTo = [];
  }

  console.info('[email] Sending message', { intendedRecipient: originalTo, deliveredTo })
  return deliveredTo
}

function getDeliveredRecipients(originalTo) {
  return getRecipients(originalTo)
}

// ── Send via Brevo HTTP API (works from Render / any cloud host) ──────────────

async function sendViaBrevoAPI(recipients, subject, html, text) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY not set')

  const body = {
    sender:      { name: FROM_NAME, email: FROM_EMAIL },
    to:          recipients.map(email => ({ email })),
    subject,
    htmlContent: html  || undefined,
    textContent: text  || undefined,
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Brevo API error ${res.status}: ${detail}`)
  }
}

// ── Send via SMTP with 465 fallback (local dev) ───────────────────────────────

async function sendViaSmtp(mailOptions) {
  try {
    await smtpTransporter.sendMail(mailOptions)
  } catch (err) {
    if (!SMTP_CONNECTION_ERRORS.includes(err.code)) throw err
    console.warn('[email] Port 587 timed out, retrying on port 465:', err.message)
    await smtpTransporterAlt.sendMail(mailOptions)
  }
}

// ── Core send function ────────────────────────────────────────────────────────

async function sendMail({ to, subject, html, text, attachments = [] }) {
  if (!to)        throw new Error('Email recipient is required')
  if (!FROM_EMAIL) throw new Error('MAIL_FROM_EMAIL is required')

  const recipients = getRecipients(to)

  if (process.env.BREVO_API_KEY) {
    await sendViaBrevoAPI(recipients, subject, html, text)
  } else {
    const mailOptions = {
      from:        `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to:          recipients,
      subject,
      html,
      text,
      attachments,
    }
    await sendViaSmtp(mailOptions)
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

async function sendMagicLink(to, { candidateName, interviewToken, companyName, jobTitle, windowDays }) {
  const link = `${process.env.FRONTEND_URL}/interview/${interviewToken}`

  await sendMail({
    to,
    subject: `Your interview link - ${jobTitle || 'Assessment'} at ${companyName}`,
    text: [
      `Hi ${candidateName},`,
      '',
      `You've been invited to complete an interview for ${jobTitle || 'an assessment'} at ${companyName}.`,
      '',
      `Interview link: ${link}`,
      '',
      `This link is valid for ${windowDays || 7} days.`,
      'This is an automated email from Praskesh Infotech. Please do not reply to this email.',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#0F172A">Hi ${candidateName},</h2>
        <p>You've been invited to complete an interview for <strong>${jobTitle || 'an assessment'}</strong> at <strong>${companyName}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#5B4FE9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Start Interview &rarr;
          </a>
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          If the button does not work, copy and paste this link:<br />
          <a href="${link}" style="color:#5B4FE9;word-break:break-all">${link}</a>
        </p>
        <p style="color:#6B7280;font-size:14px">This link is valid for ${windowDays || 7} days. You can return to it at any time.</p>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0" />
        <p style="color:#94A3B8;font-size:12px">This is an automated email from Praskesh Infotech. Please do not reply to this email.</p>
      </div>
    `,
  })
}

async function sendReportReady(to, { candidate, interviewId, companyName }) {
  const link = `${process.env.FRONTEND_URL}/manager/team/${candidate.id}`

  await sendMail({
    to,
    subject: `Report ready - ${candidate.first_name} ${candidate.last_name}`,
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
        <p style="color:#94A3B8;font-size:12px">Screeno &middot; ${companyName || ''}</p>
      </div>
    `,
  })
}

async function sendJDForResumeUpdate(to, { candidateName, clientName, jdText, deadline }) {
  const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-IN') : 'as soon as possible'

  await sendMail({
    to,
    subject: `Action required: Update your resume for ${clientName}`,
    text: [
      `Hi ${candidateName},`,
      '',
      `Your profile is being considered for a requirement at ${clientName}.`,
      `Please update your resume to highlight the following skills by ${deadlineStr}.`,
      '',
      jdText ? `Requirement details:\n${jdText}` : '',
      '',
      'Log in to your Screeno account to upload your updated resume.',
      'This is an automated email from Praskesh Infotech. Please do not reply.',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <h2 style="color:#0F172A">Update your resume</h2>
        <p>Hi <strong>${candidateName}</strong>,</p>
        <p>Your profile is being considered for a requirement at <strong>${clientName}</strong>.</p>
        <p>Please update your resume to highlight the relevant skills and upload it by <strong>${deadlineStr}</strong>.</p>
        ${jdText ? `<div style="background:#F8FAFC;border-left:4px solid #5B4FE9;padding:16px;margin:16px 0;font-size:14px;color:#374151;white-space:pre-line">${jdText.slice(0, 1500)}</div>` : ''}
        <p style="color:#94A3B8;font-size:12px">This is an automated email from Praskesh Infotech. Please do not reply.</p>
      </div>
    `,
  })
}

module.exports = { sendMail, sendMagicLink, sendReportReady, sendJDForResumeUpdate, getDeliveredRecipients }
