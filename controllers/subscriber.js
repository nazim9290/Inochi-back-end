const crypto = require('crypto');
const { Subscriber } = require('../models');
const mailer = require('../helpers/mailer');

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://inochieducation.com').replace(/\/$/, '');

// EN: 32-byte URL-safe token. Long enough that brute-forcing the confirm
//     endpoint is infeasible; short enough to fit in a single email link.
// BN: 32-byte URL-safe token। এত লম্বা যে confirm endpoint brute-force
//     করা সম্ভব না; আবার single email link-এ ফিট হয়।
const newToken = () => crypto.randomBytes(24).toString('base64url');

// EN: Double opt-in subscribe — never inserts confirmed=true on first POST.
//     Three branches:
//       1) Already confirmed → 409 (real duplicate).
//       2) Pending confirm   → resend confirm email with new token (rate the
//          UX as success so the visitor doesn't think nothing happened).
//       3) Brand new         → insert + send confirm email.
// BN: Double opt-in subscribe — first POST-এ কখনো confirmed=true insert
//     করে না। তিনটে শাখা:
//       ১) আগে confirmed → 409 (সত্যিকারের duplicate)।
//       ২) Pending confirm → নতুন token দিয়ে আবার confirm email পাঠাই
//          (visitor যেন ভাবে ঘটেছে কিছু — UX success)।
//       ৩) একদম নতুন → insert + confirm email।
exports.subscriber = async (req, res) => {
  const { email } = req.body;
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return res.status(422).json({ error: 'Email is required' });

  try {
    const existing = await Subscriber.findOne({ where: { email: normalized } });

    if (existing && existing.confirmedAt) {
      return res.status(409).json({ error: 'Subscriber with this email already exists' });
    }

    const token = newToken();
    let row = existing;
    if (existing) {
      existing.confirmToken = token;
      await existing.save();
    } else {
      row = await Subscriber.create({ email: normalized, confirmToken: token, confirmedAt: null });
    }

    const confirmUrl = `${SITE_URL}/newsletter/confirm/${token}`;
    mailer.confirmSubscriber({ email: normalized, confirmUrl }).catch((e) => console.error('confirmSubscriber:', e));

    return res.status(202).json({
      message: 'Confirmation email sent. Please click the link to activate your subscription.',
      pending: true,
    });
  } catch (error) {
    console.error('Error adding subscriber:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Token-based confirm endpoint. One-shot: token cleared after use so
//     the link can't be reused. Idempotent for already-confirmed rows so a
//     double-click on the email link still feels like success.
// BN: Token-based confirm endpoint। One-shot: ব্যবহারের পর token clear —
//     link reuse নিষেধ। আগেই confirmed হলেও idempotent — double-click
//     করলেও success মনে হবে।
exports.confirmSubscriber = async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 16) {
    return res.status(400).json({ error: 'Invalid confirmation token' });
  }
  try {
    const row = await Subscriber.findOne({ where: { confirmToken: token } });
    if (!row) {
      return res.status(404).json({ error: 'Token not found or already used' });
    }
    if (!row.confirmedAt) {
      row.confirmedAt = new Date();
      // EN: Notify admin only on the first real confirmation.
      // BN: শুধু প্রথম সত্যিকারের confirm-এ admin-কে notify।
      mailer.notifySubscriber({ email: row.email }).catch((e) => console.error('notifySubscriber:', e));
    }
    row.confirmToken = null;
    await row.save();
    return res.status(200).json({ message: 'Subscription confirmed', email: row.email });
  } catch (error) {
    console.error('Error confirming subscriber:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.Allsubscriber = async (req, res) => {
  try {
    const subscribers = await Subscriber.findAll({ order: [['createdAt', 'DESC']] });
    return res.status(200).json({ subscribers });
  } catch (error) {
    console.error('Error getting subscribers:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Mass-send a newsletter to all subscribers. Body needs subject + html
//     (admin's compose UI sends raw HTML — sanitization lives in the form).
//     Returns sent/failed counts so the admin sees how the campaign landed.
//     Heavy operation: blocks until all batches resolved (admin needs the
//     count before navigating away).
// BN: সব subscriber-কে newsletter mass-send। Body subject + html (admin
//     compose UI raw HTML পাঠায় — sanitization form-এ)। Sent/failed count
//     return — admin দেখে campaign কেমন গেল। Heavy operation: সব batch
//     resolve হওয়ার আগে block (admin count না দেখে সরবে না)।
exports.sendNewsletter = async (req, res) => {
  try {
    const { subject, html } = req.body || {};
    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ error: 'Subject লিখতে হবে' });
    }
    if (!html || !String(html).trim()) {
      return res.status(400).json({ error: 'Body লিখতে হবে' });
    }
    // EN: Only confirmed subscribers receive newsletter — protects sender
    //     reputation and respects double opt-in. Older rows without a
    //     confirmedAt are excluded; admin can manually backfill in DB.
    // BN: শুধু confirmed subscriber-রা newsletter পাবে — sender reputation
    //     রক্ষা ও double opt-in respect। confirmedAt না থাকা পুরোনো row
    //     বাদ; admin দরকারে DB-তে manual backfill করতে পারে।
    const { Op } = require('sequelize');
    const subscribers = await Subscriber.findAll({
      attributes: ['email'],
      where: { confirmedAt: { [Op.ne]: null } },
    });
    const recipients = subscribers.map((s) => s.email).filter(Boolean);
    if (recipients.length === 0) {
      return res.status(400).json({ error: 'কোনো subscriber নেই' });
    }
    const result = await mailer.sendNewsletter({ subject, html, recipients });
    return res.status(result.ok ? 200 : 500).json({
      message: result.ok
        ? `${result.sent} জনকে পাঠানো হয়েছে${result.failed ? `, ${result.failed} জনে fail` : ''}।`
        : 'Newsletter পাঠানো যায়নি।',
      ...result,
    });
  } catch (err) {
    console.error('Error sending newsletter:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Delete a subscriber. Used by admin to remove bounced / unsubscribed
//     emails. Idempotent — 404 when nothing matched so the UI knows.
// BN: Subscriber delete — bounced / unsubscribed email admin সরাতে পারে।
//     Match না করলে 404, UI বুঝতে পারে।
exports.deleteSubscriber = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Subscriber.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Subscriber not found' });
    return res.status(200).json({ message: 'Subscriber deleted' });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
