const { Subscriber } = require('../models');
const mailer = require('../helpers/mailer');

exports.subscriber = async (req, res) => {
  const { email } = req.body;
  try {
    const existing = await Subscriber.findOne({ where: { email: String(email).trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Subscriber with this email already exists' });
    }
    await Subscriber.create({ email });
    mailer.notifySubscriber({ email }).catch((e) => console.error('notifySubscriber:', e));
    return res.status(201).json({ message: 'Subscriber added successfully' });
  } catch (error) {
    console.error('Error adding subscriber:', error);
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
    const subscribers = await Subscriber.findAll({ attributes: ['email'] });
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
