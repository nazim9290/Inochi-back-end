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
const send = async ({ to, subject, html, replyTo, bcc }) => {
  const transporter = buildTransporter();
  if (!transporter) return { sent: false, reason: 'smtp-not-configured' };
  try {
    await transporter.sendMail({
      from: fromAddress(),
      to,
      bcc,
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

// EN: Friendly Bangla acknowledgement to the applicant the moment they submit.
//     Reassures them the application reached us + sets reply expectation.
// BN: Submit করার সাথে সাথে applicant-এর কাছে friendly Bangla acknowledgement।
//     নিশ্চিত করে আবেদন পৌঁছেছে + reply timeline জানায়।
exports.thankApplicant = (app) => {
  if (!app?.email) return Promise.resolve({ sent: false, reason: 'no-email' });
  const html = wrap(
    'Application received',
    `
    <p>প্রিয় ${escapeHtml(app.fullName)},</p>
    <p>আপনার আবেদন <strong>Inochi Global Education Institute</strong>-এ পৌঁছেছে। ✓</p>

    <table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:14px">
      <tr><td style="background:#f0fafc;font-weight:bold;width:140px;">Application ID</td><td style="background:#fff;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${escapeHtml(app.id)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Target program</td><td style="background:#fff;border-bottom:1px solid #eee;">${escapeHtml(app.targetProgram || '—')}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">Target intake</td><td style="background:#fff;">${escapeHtml(app.targetIntake || '—')}</td></tr>
    </table>

    <p style="margin-top:18px">আমাদের counselor team আপনার সাথে <strong>১ business day-এর মধ্যে</strong> phone / email / WhatsApp-এ যোগাযোগ করবে।</p>
    <p>জরুরি প্রশ্ন থাকলে এখনই WhatsApp-এ message দিতে পারেন আমাদের website-এর floating button থেকে।</p>

    <p style="margin-top:22px">শুভকামনা,<br><strong>Inochi Global Education Institute</strong></p>
    `
  );
  return send({
    to: app.email,
    subject: '✓ আপনার আবেদন পেয়েছি — Inochi Global Education',
    html,
  });
};

// EN: Status-change email to applicant. Bangla-led with English summary so
//     parents / non-IT family members can also read it. Each status has its
//     own tone — accepted is celebratory, rejected is warm, reviewing is calm.
// BN: Applicant-কে status-change email। Bangla প্রধান + English summary —
//     parent / non-IT family-ও পড়তে পারবে। প্রতি status-এর tone আলাদা —
//     accepted celebratory, rejected warm, reviewing calm।
exports.statusUpdateApplicant = (app, newStatus) => {
  if (!app?.email) return Promise.resolve({ sent: false, reason: 'no-email' });

  const COPY = {
    reviewing: {
      subject: '📋 আপনার আবেদনটি review হচ্ছে — Inochi',
      title: 'Application under review',
      icon: '📋',
      heading: 'আপনার আবেদনটি এখন review হচ্ছে',
      body: `আমাদের counselor team আপনার application দেখছে। কোনো অতিরিক্ত document বা তথ্যের দরকার হলে আমরা সরাসরি আপনার সাথে যোগাযোগ করব।`,
      action: '',
    },
    accepted: {
      subject: '🎉 অভিনন্দন! আপনার আবেদন accepted — Inochi',
      title: 'Application ACCEPTED',
      icon: '🎉',
      heading: 'অভিনন্দন! আপনার আবেদন গ্রহণ করা হয়েছে',
      body: `আপনার নথিপত্র এবং প্রোফাইল আমাদের admission team approved করেছে। পরবর্তী step (counseling, school selection, visa documentation) সম্পর্কে শীঘ্রই আমাদের counselor আপনার সাথে যোগাযোগ করবেন।`,
      action: 'নিচের button ব্যবহার করে আমাদের office visit-এর জন্য schedule করতে পারেন:',
    },
    rejected: {
      subject: 'আপনার আবেদন সম্পর্কে — Inochi Global Education',
      title: 'Application update',
      icon: 'ℹ️',
      heading: 'এই মুহূর্তে আবেদনটি এগিয়ে নিতে পারছি না',
      body: `আমরা আপনার আবেদন carefully দেখেছি। দুঃখিত, এই মুহূর্তে নির্বাচিত program-এর জন্য আবেদনটি এগিয়ে নেওয়া যাচ্ছে না। তবে এর মানে এই নয় যে ভবিষ্যতে সম্ভাবনা শেষ — যোগ্যতা, বছর, বা target program বদলে আবার চেষ্টা করতে পারেন। কারণ জানতে চাইলে নিচের button দিয়ে আমাদের সাথে কথা বলুন।`,
      action: '',
    },
    withdrawn: {
      subject: 'আপনার আবেদন withdrawn — Inochi',
      title: 'Application withdrawn',
      icon: '✖',
      heading: 'আপনার আবেদন withdraw করা হয়েছে',
      body: `আপনার অনুরোধ অনুযায়ী আবেদনটি withdraw করা হয়েছে। ভবিষ্যতে আবার আবেদন করতে চাইলে যেকোনো সময় আমাদের website-এ এসে পারেন।`,
      action: '',
    },
  };

  const conf = COPY[newStatus];
  if (!conf) return Promise.resolve({ sent: false, reason: 'unknown-status' });

  const html = wrap(
    conf.title,
    `
    <p style="font-size:42px;margin:0 0 6px">${conf.icon}</p>
    <h2 style="margin:0 0 10px;color:#0F2D52;">${escapeHtml(conf.heading)}</h2>
    <p>প্রিয় ${escapeHtml(app.fullName)},</p>
    <p>${escapeHtml(conf.body)}</p>

    ${
      newStatus === 'accepted'
        ? `
    <p style="margin-top:18px">${escapeHtml(conf.action)}</p>
    <p style="margin-top:12px;text-align:center">
      <a href="https://inochieducation.com/contact" style="display:inline-block;background:#29B5C4;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:bold">আমাদের সাথে যোগাযোগ করুন</a>
    </p>`
        : ''
    }

    <table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:18px">
      <tr><td style="background:#f0fafc;font-weight:bold;width:140px;">Application ID</td><td style="background:#fff;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${escapeHtml(app.id)}</td></tr>
      <tr><td style="background:#f0fafc;font-weight:bold;">নতুন status</td><td style="background:#fff;text-transform:capitalize;">${escapeHtml(newStatus)}</td></tr>
    </table>

    <p style="margin-top:22px">শুভকামনা,<br><strong>Inochi Global Education Institute</strong></p>
    `
  );

  return send({
    to: app.email,
    subject: conf.subject,
    html,
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

// EN: Double-opt-in confirmation email — visitor must click before they're
//     added to the newsletter list. Plain layout, single CTA, link visible
//     beneath in case the button gets swallowed by a strict mail client.
// BN: Double-opt-in confirmation email — newsletter list-এ যোগ হওয়ার আগে
//     visitor-কে click করতে হবে। সাধারণ layout, একটাই CTA; কঠোর mail
//     client button render না করলেও নিচে link দেখাই।
exports.confirmSubscriber = ({ email, confirmUrl }) => {
  if (!email || !confirmUrl) return Promise.resolve({ sent: false, reason: 'missing-args' });
  const html = wrap(
    'Confirm your subscription',
    `
    <p>Hello,</p>
    <p>Thank you for subscribing to the Inochi Global Education newsletter. To finish the process, please confirm your email address by clicking the button below.</p>
    <p style="margin:24px 0;text-align:center">
      <a href="${escapeHtml(confirmUrl)}" style="display:inline-block;background:#29B5C4;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Confirm subscription</a>
    </p>
    <p style="font-size:12px;color:#64748b">If the button doesn't work, copy and paste this link into your browser:<br><a href="${escapeHtml(confirmUrl)}" style="color:#29B5C4;word-break:break-all">${escapeHtml(confirmUrl)}</a></p>
    <p style="margin-top:18px;font-size:12px;color:#94a3b8">If you did not request this, you can ignore this email — no subscription will be created.</p>
    `
  );
  return send({
    to: email,
    subject: 'Please confirm your Inochi newsletter subscription',
    html,
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

// EN: Mass-send a newsletter to a list of subscriber emails. Chunks into
//     BCC batches so a single send doesn't blow past per-message recipient
//     caps (Gmail/Brevo typically allow ~50). Returns counts so admin sees
//     exactly what happened. Each batch awaited sequentially to stay under
//     SMTP throttle limits.
// BN: Subscriber email list-এ newsletter mass-send। BCC batch-এ break — এক
//     message-এ recipient cap (Gmail/Brevo সাধারণত ~50) cross না হয়। Count
//     return — admin দেখে ঠিক কী হয়েছে। Batch sequential await — SMTP
//     throttle limit-এ থাকতে।
exports.sendNewsletter = async ({ subject, html, recipients }) => {
  const transporter = buildTransporter();
  if (!transporter) return { ok: false, reason: 'smtp-not-configured', sent: 0, failed: 0 };
  const list = Array.from(new Set((recipients || []).filter(Boolean).map((e) => String(e).trim().toLowerCase())));
  if (list.length === 0) return { ok: false, reason: 'no-recipients', sent: 0, failed: 0 };

  const BATCH = 50;
  const wrapped = wrap('Newsletter', html);
  let sent = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const result = await send({
      to: adminAddress(),
      bcc: batch.join(','),
      subject,
      html: wrapped,
    });
    if (result.sent) {
      sent += batch.length;
    } else {
      failed += batch.length;
      errors.push(result.reason);
    }
  }

  return { ok: sent > 0, sent, failed, total: list.length, errors };
};

exports.notifyReview = (review) => {
  const stars = '★'.repeat(review.rating || 0) + '☆'.repeat(5 - (review.rating || 0));
  const html = wrap(
    'New review submitted',
    `<p>A visitor submitted a review awaiting moderation:</p>
     <p><strong>Name:</strong> ${escapeHtml(review.name)}</p>
     <p><strong>Rating:</strong> ${stars} (${review.rating}/5)</p>
     ${review.email ? `<p><strong>Email:</strong> ${escapeHtml(review.email)}</p>` : ''}
     ${review.phone ? `<p><strong>Phone:</strong> ${escapeHtml(review.phone)}</p>` : ''}
     ${review.location ? `<p><strong>Location:</strong> ${escapeHtml(review.location)}</p>` : ''}
     ${review.jlptLevel ? `<p><strong>JLPT:</strong> ${escapeHtml(review.jlptLevel)}</p>` : ''}
     <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
     <p style="background:#f0fafc;padding:12px;border-radius:8px;line-height:1.5;">
       ${escapeHtml(review.review)}
     </p>
     <p style="margin-top:16px;font-size:12px;color:#64748b;">
       Open the admin → Reviews tab to approve or reject.
     </p>`
  );
  return send({
    to: adminAddress(),
    subject: `[Review] ${review.rating}★ — ${review.name}`,
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

// EN: Low-level generic send for the school-outreach feature, where the admin
//     supplies the full subject + HTML body and (optionally) a Reply-To. The
//     outreach controller owns the recipient loop + personalization; this just
//     hands one message to the transporter. Resolves {sent} / {sent:false,reason}.
// BN: school-outreach feature-এর জন্য low-level generic send — admin নিজে
//     subject + HTML body + (optional) Reply-To দেয়। recipient loop +
//     personalization controller সামলায়; এটা শুধু একটা message transporter-কে
//     দেয়। {sent} / {sent:false,reason} resolve করে।
exports.sendMail = (opts) => send(opts);

// EN: Wrap arbitrary content HTML in the Inochi-branded shell (navy header +
//     footer). Exposed so outreach mails can optionally look on-brand.
// BN: যেকোনো content HTML-কে Inochi-branded shell-এ (navy header + footer)
//     wrap করে। Outreach মেইল চাইলে on-brand দেখাতে expose করা।
exports.brandWrap = (title, contentHtml) => wrap(title, contentHtml);

// EN: True when SMTP credentials are present so the UI can warn early.
// BN: SMTP credential থাকলে true — UI আগেই warn করতে পারে।
exports.smtpReady = () => Boolean(buildTransporter());
