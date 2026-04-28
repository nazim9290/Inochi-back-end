// Centralised email helper — single transporter, two helpers (notify admin /
// reply to user). All address/credential info comes from env so the same code
// works against Gmail, Brevo, SendGrid, or any SMTP provider.

const nodemailer = require('nodemailer');

let cachedTransporter = null;

const buildTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cachedTransporter;
};

const fromAddress = () =>
  process.env.SMTP_FROM ||
  `Inochi Global Education <${process.env.SMTP_USER || 'no-reply@inochieducation.com'}>`;

const adminAddress = () =>
  process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'info@inochieducation.com';

// Wrap message body in a simple branded HTML shell.
const wrap = (title, contentHtml) => `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr><td style="background:#0F2D52;padding:20px 24px;color:#fff;">
          <h1 style="margin:0;font-size:18px;letter-spacing:0.5px;">Inochi Global Education</h1>
          <p style="margin:4px 0 0;font-size:12px;color:#7FCED4;">${title}</p>
        </td></tr>
        <tr><td style="padding:24px;color:#475569;font-size:14px;line-height:1.6;">
          ${contentHtml}
        </td></tr>
        <tr><td style="background:#f0fafc;padding:14px 24px;color:#475569;font-size:11px;text-align:center;">
          © ${new Date().getFullYear()} Inochi Global Education Institute · inochieducation.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const escapeHtml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');

// Send a generic mail. Resolves with `{sent:true}` on success or
// `{sent:false, reason}` so callers can stay non-blocking — a missing SMTP
// config should NOT make the contact form fail.
const send = async ({ to, subject, html, replyTo }) => {
  const transporter = buildTransporter();
  if (!transporter) return { sent: false, reason: 'smtp-not-configured' };
  try {
    await transporter.sendMail({
      from: fromAddress(),
      to,
      subject,
      html,
      replyTo,
    });
    return { sent: true };
  } catch (err) {
    console.error('Mailer error:', err);
    return { sent: false, reason: err.message };
  }
};

exports.notifyContact = ({ name, email, phone, msg }) => {
  const html = wrap(
    'New contact form submission',
    `
    <p style="margin-top:0"><strong>You have a new message from your website.</strong></p>
    <table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr><td style="background:#f0fafc;font-weight:bold;width:120px;">Name</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(name)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Email</td><td style="background:#fff;border-bottom:1px solid #eee;"><a href="mailto:${escapeHtml(email)}" style="color:#29B5C4">${escapeHtml(email)}</a></td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Phone</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(phone)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;vertical-align:top">Message</td><td style="background:#fff;">${escapeHtml(msg)}</td></tr>
    </table>
    <p style="margin-top:18px;font-size:12px;color:#94a3b8">Reply directly to this email to respond to ${escapeHtml(name)}.</p>
    `
  );
  return send({
    to: adminAddress(),
    subject: `[Contact] ${name} — ${(msg || '').slice(0, 40)}…`,
    html,
    replyTo: email,
  });
};

exports.thankContact = ({ name, email }) => {
  const html = wrap(
    'We received your message',
    `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thank you for reaching out to Inochi Global Education. Our counselor team usually replies within <strong>1 business day</strong>.</p>
    <p>If your question is urgent, you can also message us on WhatsApp via the floating button on our website.</p>
    <p style="margin-top:24px">Warm regards,<br><strong>Inochi Global Education Institute</strong></p>
    `
  );
  return send({
    to: email,
    subject: 'Thank you for contacting Inochi Global Education',
    html,
  });
};

exports.notifyBooking = ({ name, email, phone, date, time, seminar }) => {
  const html = wrap(
    'New seminar booking',
    `
    <p style="margin-top:0"><strong>A user has booked a seminar slot.</strong></p>
    <table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr><td style="background:#f0fafc;font-weight:bold;width:120px;">Name</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(name)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Email</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(email)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Phone</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(phone)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Seminar</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(seminar || '—')}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Date / Time</td><td style="background:#fff;">${escapeHtml(date)} ${escapeHtml(time || '')}</td></tr>
    </table>
    `
  );
  return send({
    to: adminAddress(),
    subject: `[Seminar] booking — ${name}`,
    html,
    replyTo: email,
  });
};

exports.notifyApplication = (app) => {
  const html = wrap(
    'New student application',
    `
    <p style="margin-top:0"><strong>A new application has been submitted via /apply.</strong></p>
    <table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr><td style="background:#f0fafc;font-weight:bold;width:140px;">Name</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(app.fullName)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Email</td><td style="background:#fff;border-bottom:1px solid #eee;"><a href="mailto:${escapeHtml(app.email)}" style="color:#29B5C4">${escapeHtml(app.email)}</a></td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Phone</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(app.phone)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Education</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(app.highestEducation)} ${app.passingYear ? `(${app.passingYear})` : ''} ${app.gpaOrGrade ? `· ${escapeHtml(app.gpaOrGrade)}` : ''}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Target program</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(app.targetProgram)} · ${escapeHtml(app.targetIntake)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">JLPT level</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(app.jlptLevel)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Sponsor</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(app.sponsor)}</td></tr>
      ${app.notes ? `<tr><td style="background:#f0fafc;font-weight:bold;vertical-align:top">Notes</td><td style="background:#fff;">${escapeHtml(app.notes)}</td></tr>` : ''}
    </table>
    <p style="margin-top:18px;font-size:12px;color:#94a3b8">Open the admin panel to review documents and update status.</p>
    `
  );
  return send({
    to: adminAddress(),
    subject: `[Application] ${app.fullName} — ${app.targetProgram || 'program?'}`,
    html,
    replyTo: app.email,
  });
};

exports.notifySubscriber = ({ email }) => {
  const html = wrap(
    'New newsletter subscriber',
    `<p>A new visitor subscribed to the newsletter:</p>
     <p style="font-size:16px;"><strong>${escapeHtml(email)}</strong></p>`
  );
  return send({
    to: adminAddress(),
    subject: `[Newsletter] new subscriber — ${email}`,
    html,
  });
};

exports.testConnection = async () => {
  const transporter = buildTransporter();
  if (!transporter) return { ok: false, reason: 'smtp-not-configured' };
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
};
