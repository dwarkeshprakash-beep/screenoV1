function doGet() {
  return jsonResponse_({ ok: true, service: 'screeno-password-reset' });
}

function doPost(event) {
  try {
    const payload = JSON.parse(event && event.postData ? event.postData.contents : '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('SCREENO_WEBHOOK_SECRET');

    if (!expectedSecret || !constantTimeEqual_(payload.secret, expectedSecret)) {
      return jsonResponse_({ ok: false, error: 'Unauthorized' });
    }
    if (payload.type !== 'password_reset') {
      return jsonResponse_({ ok: false, error: 'Unsupported message type' });
    }

    const recipient = String(payload.to || '').trim();
    const resetLink = String(payload.resetLink || '').trim();
    const expiresMinutes = Math.max(1, Math.min(120, Number(payload.expiresMinutes) || 60));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return jsonResponse_({ ok: false, error: 'Invalid recipient' });
    }
    if (!/^https:\/\/screeno-v1\.vercel\.app\/login\?reset=/.test(resetLink)) {
      return jsonResponse_({ ok: false, error: 'Invalid reset link' });
    }

    const name = String(payload.name || 'there').slice(0, 120);
    const safeName = escapeHtml_(name);
    const safeLink = escapeHtml_(resetLink);
    const text = [
      'Hi ' + name + ',',
      '',
      'We received a request to reset your Screeno password.',
      'Reset link: ' + resetLink,
      '',
      'This link expires in ' + expiresMinutes + ' minutes.',
      'If you did not request this, you can ignore this email.'
    ].join('\n');
    const html = '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px">' +
      '<h2 style="color:#0F172A">Reset your password</h2>' +
      '<p>Hi ' + safeName + ',</p>' +
      '<p>We received a request to reset your Screeno password.</p>' +
      '<p style="margin:24px 0"><a href="' + safeLink + '" style="background:#5B4FE9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a></p>' +
      '<p style="color:#475569;font-size:14px;line-height:1.6">This link expires in ' + expiresMinutes + ' minutes. If the button does not work, copy and paste this link:<br><a href="' + safeLink + '" style="color:#5B4FE9;word-break:break-all">' + safeLink + '</a></p>' +
      '<p style="color:#94A3B8;font-size:12px">If you did not request this, you can ignore this email.</p>' +
      '</div>';

    MailApp.sendEmail({
      to: recipient,
      subject: 'Reset your Screeno password',
      body: text,
      htmlBody: html,
      name: 'Screeno'
    });
    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: 'Could not send email' });
  }
}

function constantTimeEqual_(left, right) {
  left = String(left || '');
  right = String(right || '');
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index % Math.max(1, left.length)) || 0) ^
      (right.charCodeAt(index % Math.max(1, right.length)) || 0);
  }
  return mismatch === 0;
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
