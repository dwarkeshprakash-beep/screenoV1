// backend/src/services/email.service.js
// Transactional email via Brevo.
//
// Two send paths — chosen automatically:
//   1. Brevo HTTP API  (if BREVO_API_KEY is set) — works from any host (HTTPS port 443)
//   2. Brevo SMTP      (nodemailer, ports 587 → 465 fallback) — works from local dev
//
// EMAIL_REDIRECT_TO can be used in test environments to redirect outbound mail.

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
const EMAIL_TRANSPORT = process.env.EMAIL_TRANSPORT || 'auto'

if (process.env.EMAIL_REDIRECT_TO) {
  console.warn('[email] EMAIL_REDIRECT_TO is set; outbound mail will be redirected.')
}

function getRecipients(originalTo) {
  let deliveredTo
  if (Array.isArray(originalTo)) {
    deliveredTo = originalTo
  } else if (typeof originalTo === 'string') {
    deliveredTo = originalTo.split(',').map(e => e.trim()).filter(Boolean)
  } else {
    deliveredTo = []
  }

  const redirect = String(process.env.EMAIL_REDIRECT_TO || '')
    .split(',')
    .map(email => email.trim())
    .filter(Boolean)
  const recipients = redirect.length > 0 ? redirect : deliveredTo
  console.info(`[email] Sending message to ${recipients.length} recipient(s)`)
  return recipients
}

function getDeliveredRecipients(originalTo) {
  return getRecipients(originalTo)
}

function senderLabel(companyName) {
  return companyName || FROM_NAME || 'Screeno'
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
    signal:  AbortSignal.timeout(10000),
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

  const recipients = getRecipients(to)
  if (EMAIL_TRANSPORT === 'console') {
    console.info(`[email:test] Suppressed "${subject}" to ${recipients.length} recipient(s)`)
    return
  }
  if (!FROM_EMAIL) throw new Error('MAIL_FROM_EMAIL is required')

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

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function sendPasswordReset(to, { name, token, expiresMinutes = 60 }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const link = `${frontendUrl}/login?reset=${encodeURIComponent(token)}`
  const safeName = escapeHtml(name || 'there')

  await sendMail({
    to,
    subject: 'Reset your Screeno password',
    text: [
      `Hi ${name || 'there'},`,
      '',
      'We received a request to reset your Screeno password.',
      `Reset link: ${link}`,
      '',
      `This link expires in ${expiresMinutes} minutes.`,
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#0F172A">Reset your password</h2>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your Screeno password.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#5B4FE9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Reset Password
          </a>
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          This link expires in ${expiresMinutes} minutes. If the button does not work, copy and paste this link:<br />
          <a href="${link}" style="color:#5B4FE9;word-break:break-all">${link}</a>
        </p>
        <p style="color:#94A3B8;font-size:12px">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  })
}

async function sendMagicLink(to, {
  candidateName,
  interviewToken,
  companyName,
  jobTitle,
  windowDays,
  assessmentDate,
  details,
}) {
  const link = `${process.env.FRONTEND_URL}/interview/${interviewToken}`
  const sender = senderLabel(companyName)
  const dateText = assessmentDate
    ? new Date(assessmentDate).toLocaleString('en-IN', {
      dateStyle: 'long',
      timeStyle: 'short',
    })
    : null

  await sendMail({
    to,
    subject: `Your interview link - ${jobTitle || 'Assessment'} at ${companyName}`,
    text: [
      `Hi ${candidateName},`,
      '',
      `You've been invited to complete an interview for ${jobTitle || 'an assessment'} at ${companyName}.`,
      dateText ? `Assessment date: ${dateText}` : '',
      details ? `Details:\n${details}` : '',
      '',
      `Interview link: ${link}`,
      '',
      `This link is valid for ${windowDays || 7} days.`,
      `This is an automated email from ${sender}. Please do not reply to this email.`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#0F172A">Hi ${candidateName},</h2>
        <p>You've been invited to complete an interview for <strong>${jobTitle || 'an assessment'}</strong> at <strong>${companyName}</strong>.</p>
        ${dateText ? `<p><strong>Assessment date:</strong> ${escapeHtml(dateText)}</p>` : ''}
        ${details ? `<div style="background:#F8FAFC;border-left:4px solid #5B4FE9;padding:16px;margin:16px 0;font-size:14px;color:#374151;white-space:pre-line">${escapeHtml(details).slice(0, 3000)}</div>` : ''}
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
        <p style="color:#94A3B8;font-size:12px">This is an automated email from ${escapeHtml(sender)}. Please do not reply to this email.</p>
      </div>
    `,
  })
}

async function sendMonthlyAssessmentInvite(to, {
  candidateName,
  companyName,
  subject,
  assessmentDate,
  assessmentEndDate,
  durationMonths,
  jdText,
}) {
  const dateText = new Date(assessmentDate).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
  const endDate = (() => {
    const d = assessmentEndDate ? new Date(assessmentEndDate) : new Date(assessmentDate)
    if (assessmentEndDate) {
      return d.toLocaleDateString('en-IN', { dateStyle: 'long' })
    }
    d.setMonth(d.getMonth() + Number(durationMonths || 1))
    d.setDate(d.getDate() - 1)
    return d.toLocaleDateString('en-IN', { dateStyle: 'long' })
  })()
  const details = String(jdText || '').trim()

  await sendMail({
    to,
    subject: `[${companyName}] Monthly Assessment Assigned — ${subject}`,
    text: [
      `Dear ${candidateName},`,
      '',
      `We are pleased to inform you that ${companyName} has assigned you a monthly assessment.`,
      '',
      `Subject     : ${subject}`,
      `Start Date  : ${dateText}`,
      `End Date    : ${endDate}`,
      `Duration    : ${durationMonths} month${durationMonths === 1 ? '' : 's'}`,
      '',
      details ? `Study Material / JD:\n${'─'.repeat(40)}\n${details}\n${'─'.repeat(40)}` : '',
      '',
      'Use the secure Screeno assessment link sent for this scheduled assessment.',
      'Please ensure you complete the assessment within the scheduled period.',
      '',
      'Should you have any questions, please reach out to your manager.',
      '',
      `Best regards,`,
      `${companyName} — Screeno Platform`,
      '',
      '──────────────────────────────────────',
      'This is an automated notification. Please do not reply to this email.',
    ].filter(l => l !== null).join('\n'),
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">
        <!-- header -->
        <div style="background:linear-gradient(135deg,#5B4FE9,#4A3FCE);padding:28px 32px">
          <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em">Screeno</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:2px">${escapeHtml(companyName)}</div>
        </div>

        <!-- body -->
        <div style="padding:32px">
          <h2 style="margin:0 0 6px;font-size:20px;color:#0F172A;font-weight:700">Monthly Assessment Assigned</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#64748B">You have a new assessment scheduled for the upcoming period.</p>

          <p style="margin:0 0 20px;font-size:15px;color:#1E293B">Dear <strong>${escapeHtml(candidateName)}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7">
            ${escapeHtml(companyName)} has assigned you a monthly assessment. Please review the details below and prepare accordingly.
          </p>

          <!-- details card -->
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:20px;margin-bottom:24px">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="padding:6px 0;color:#64748B;width:110px;vertical-align:top">Subject</td>
                <td style="padding:6px 0;color:#0F172A;font-weight:600">${escapeHtml(subject)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748B;vertical-align:top">Start Date</td>
                <td style="padding:6px 0;color:#0F172A;font-weight:600">${escapeHtml(dateText)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748B;vertical-align:top">End Date</td>
                <td style="padding:6px 0;color:#0F172A;font-weight:600">${escapeHtml(endDate)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748B;vertical-align:top">Duration</td>
                <td style="padding:6px 0;color:#0F172A;font-weight:600">${durationMonths} month${durationMonths === 1 ? '' : 's'}</td>
              </tr>
            </table>
          </div>

          ${details ? `
          <div style="margin-bottom:24px">
            <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Study Material</div>
            <div style="background:#FAFAFE;border-left:4px solid #5B4FE9;border-radius:0 8px 8px 0;padding:16px;font-size:13px;color:#374151;white-space:pre-line;line-height:1.7">${escapeHtml(details).slice(0, 5000)}</div>
          </div>
          ` : ''}

          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:14px 16px;margin-bottom:24px">
            <p style="margin:0;font-size:13px;color:#1E40AF;line-height:1.6">
              <strong>Next step:</strong> Use the secure Screeno assessment link sent for this scheduled assessment. Please ensure you complete the assessment within the scheduled period.
            </p>
          </div>

          <p style="margin:0;font-size:14px;color:#374151;line-height:1.7">
            If you have any questions, please reach out to your manager directly.
          </p>
        </div>

        <!-- footer -->
        <div style="padding:16px 32px;border-top:1px solid #E2E8F0;background:#F8FAFC;text-align:center">
          <p style="margin:0;font-size:12px;color:#94A3B8">
            This is an automated notification from ${escapeHtml(companyName)} via Screeno. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  })
}

async function sendReportReady(to, { candidate, interviewId, companyName }) {
  const link = `${process.env.FRONTEND_URL}/manager/reports?interview=${interviewId}`
  const sender = senderLabel(companyName)

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
        <p style="color:#94A3B8;font-size:12px">This is an automated email from ${escapeHtml(sender)}. Please do not reply to this email.</p>
        <p style="color:#94A3B8;font-size:12px">Screeno &middot; ${companyName || ''}</p>
      </div>
    `,
  })
}

async function sendJDForResumeUpdate(to, { candidateName, clientName, jdText, deadline }) {
  const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-IN') : 'as soon as possible'
  const sender = senderLabel()

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
      `This is an automated email from ${sender}. Please do not reply.`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <h2 style="color:#0F172A">Update your resume</h2>
        <p>Hi <strong>${candidateName}</strong>,</p>
        <p>Your profile is being considered for a requirement at <strong>${clientName}</strong>.</p>
        <p>Please update your resume to highlight the relevant skills and upload it by <strong>${deadlineStr}</strong>.</p>
        ${jdText ? `<div style="background:#F8FAFC;border-left:4px solid #5B4FE9;padding:16px;margin:16px 0;font-size:14px;color:#374151;white-space:pre-line">${jdText.slice(0, 1500)}</div>` : ''}
        <p style="color:#94A3B8;font-size:12px">This is an automated email from ${escapeHtml(sender)}. Please do not reply.</p>
      </div>
    `,
  })
}

// JD email with a custom manager message included above the JD text
async function sendClientJDWithMessage(to, { candidateName, clientName, role, jdText, customMessage, frontendUrl }) {
  const portalLink = `${frontendUrl || process.env.FRONTEND_URL}/candidate/dashboard`
  await sendMail({
    to,
    subject: `[${clientName}] Job opportunity — ${role || 'see details below'}`,
    text: [
      `Hi ${candidateName},`,
      '',
      customMessage ? customMessage : `Your profile is being considered for a client requirement at ${clientName}.`,
      '',
      jdText ? `Job details:\n${'─'.repeat(40)}\n${jdText}\n${'─'.repeat(40)}` : '',
      '',
      'Log in to your Screeno portal to submit your resume for this opportunity:',
      portalLink,
      '',
      'This is an automated message. Please do not reply.',
    ].join('\n'),
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#5B4FE9,#4A3FCE);padding:28px 32px">
          <div style="font-size:20px;font-weight:700;color:#ffffff">Screeno</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:2px">${escapeHtml(clientName)}</div>
        </div>
        <div style="padding:32px">
          <h2 style="margin:0 0 6px;font-size:20px;color:#0F172A;font-weight:700">Client Opportunity</h2>
          <p style="margin:0 0 20px;font-size:13px;color:#64748B">${escapeHtml(role || '')}</p>
          <p style="font-size:15px;color:#1E293B">Dear <strong>${escapeHtml(candidateName)}</strong>,</p>
          ${customMessage
            ? `<div style="background:#F8FAFC;border-left:4px solid #5B4FE9;border-radius:0 8px 8px 0;padding:16px;margin:16px 0;font-size:14px;color:#374151;white-space:pre-line;line-height:1.7">${escapeHtml(customMessage)}</div>`
            : `<p style="font-size:14px;color:#374151">Your profile is being considered for a client requirement at <strong>${escapeHtml(clientName)}</strong>.</p>`
          }
          ${jdText ? `
          <div style="margin:20px 0">
            <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Job Description</div>
            <div style="background:#FAFAFE;border-left:4px solid #5B4FE9;border-radius:0 8px 8px 0;padding:16px;font-size:13px;color:#374151;white-space:pre-line;line-height:1.7">${escapeHtml(jdText).slice(0, 4000)}</div>
          </div>` : ''}
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:14px 16px;margin:20px 0">
            <p style="margin:0;font-size:13px;color:#1E40AF"><strong>Action required:</strong> Log in to your Screeno portal to submit your resume for this opportunity.</p>
          </div>
          <p style="margin:24px 0">
            <a href="${portalLink}" style="background:#5B4FE9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Go to Screeno Portal &rarr;</a>
          </p>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #E2E8F0;background:#F8FAFC;text-align:center">
          <p style="margin:0;font-size:12px;color:#94A3B8">Automated notification via Screeno. Please do not reply to this email.</p>
        </div>
      </div>
    `,
  })
}

// Notification email for an offline (in-person) interview
async function sendOfflineInterviewInvite(to, { candidateName, clientName, role, scheduledAt, location, notes }) {
  const dateStr = scheduledAt
    ? new Date(scheduledAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
    : 'Date to be confirmed'
  await sendMail({
    to,
    subject: `[${clientName}] Offline interview scheduled — ${role || ''}`,
    text: [
      `Hi ${candidateName},`,
      '',
      `An offline interview has been scheduled for you at ${clientName}.`,
      '',
      `Date & Time : ${dateStr}`,
      location ? `Location    : ${location}` : '',
      notes    ? `Notes       : ${notes}`    : '',
      '',
      'Please log in to your Screeno portal to view the full details.',
      '',
      'This is an automated message. Please do not reply.',
    ].join('\n'),
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#5B4FE9,#4A3FCE);padding:28px 32px">
          <div style="font-size:20px;font-weight:700;color:#ffffff">Screeno</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:2px">${escapeHtml(clientName)}</div>
        </div>
        <div style="padding:32px">
          <h2 style="margin:0 0 6px;font-size:20px;color:#0F172A;font-weight:700">Offline Interview Scheduled</h2>
          <p style="margin:0 0 20px;font-size:13px;color:#64748B">${escapeHtml(role || '')}</p>
          <p style="font-size:15px;color:#1E293B">Dear <strong>${escapeHtml(candidateName)}</strong>,</p>
          <p style="font-size:14px;color:#374151">An in-person interview has been scheduled for you at <strong>${escapeHtml(clientName)}</strong>. Please find the details below.</p>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:20px;margin:20px 0">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="padding:6px 0;color:#64748B;width:110px">Date &amp; Time</td>
                <td style="padding:6px 0;color:#0F172A;font-weight:600">${escapeHtml(dateStr)}</td>
              </tr>
              ${location ? `<tr><td style="padding:6px 0;color:#64748B">Location</td><td style="padding:6px 0;color:#0F172A;font-weight:600">${escapeHtml(location)}</td></tr>` : ''}
              ${notes    ? `<tr><td style="padding:6px 0;color:#64748B;vertical-align:top">Notes</td><td style="padding:6px 0;color:#374151">${escapeHtml(notes)}</td></tr>` : ''}
            </table>
          </div>
          <p style="font-size:13px;color:#374151">Please ensure you are present on time. If you have any questions, reach out to your manager directly.</p>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #E2E8F0;background:#F8FAFC;text-align:center">
          <p style="margin:0;font-size:12px;color:#94A3B8">Automated notification via Screeno. Please do not reply to this email.</p>
        </div>
      </div>
    `,
  })
}

module.exports = {
  sendMail,
  sendPasswordReset,
  sendMagicLink,
  sendMonthlyAssessmentInvite,
  sendReportReady,
  sendJDForResumeUpdate,
  sendClientJDWithMessage,
  sendOfflineInterviewInvite,
  getDeliveredRecipients,
}
