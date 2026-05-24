/**
 * EN: School email-outreach controller. Powers the admin "Email Directory"
 *     (partner-school contacts + groups) and the "Send Email" composer.
 *       - Directory + group CRUD.
 *       - sendTest: one test mail to a chosen address (always before a real
 *         send, so the admin can eyeball it).
 *       - sendCampaign: an INDIVIDUAL mail per recipient (privacy + better
 *         deliverability), with {{school}}/{{name}}/{{city}} personalization
 *         and a small inter-send delay to respect SMTP limits. Writes an
 *         EmailLog audit row.
 *     Every outgoing mail sets Reply-To to MAIL_REPLY_TO (inochiedu@gmail.com)
 *     so all replies land in one inbox regardless of the SMTP From address.
 * BN: স্কুল email-outreach controller। Admin-এর "Email Directory"
 *     (partner-school contact + group) আর "Send Email" composer চালায়।
 *       - Directory + group CRUD।
 *       - sendTest: বেছে নেওয়া ঠিকানায় একটা test মেইল (আসল send-এর আগে
 *         সবসময়, যাতে admin চোখে দেখে নিতে পারে)।
 *       - sendCampaign: প্রতি প্রাপকে আলাদা মেইল (privacy + ভালো deliverability),
 *         {{school}}/{{name}}/{{city}} personalization সহ, SMTP limit মানতে
 *         প্রতি send-এ ছোট delay। EmailLog audit row লেখে।
 *     প্রতিটা মেইলে Reply-To = MAIL_REPLY_TO (inochiedu@gmail.com) — SMTP From
 *     যা-ই হোক, সব reply এক inbox-এ আসে।
 */

const { Op } = require('sequelize');
const { SchoolContact, EmailGroup, EmailLog, Subscriber, Contact } = require('../models');
const mailer = require('../helpers/mailer');

const REPLY_TO = process.env.MAIL_REPLY_TO || 'inochiedu@gmail.com';
const MAX_RECIPIENTS = 500; // Gmail SMTP daily-ish ceiling; split larger lists.
const SEND_DELAY_MS = Number(process.env.MAIL_SEND_DELAY_MS) || 250;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (e) => EMAIL_RE.test(String(e || '').trim());
const norm = (e) => String(e || '').trim().toLowerCase();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// EN: Replace {{token}} placeholders in subject/body from a contact's fields.
//     {{name}} falls back to the school name so "Dear {{name}}" is never blank.
// BN: contact-এর field থেকে subject/body-র {{token}} replace। {{name}} না
//     থাকলে school name fallback — "Dear {{name}}" কখনো খালি হয় না।
function personalize(text, c) {
  if (!text) return '';
  const map = {
    school: c.schoolName || '',
    schoolname: c.schoolName || '',
    name: c.contactName || c.schoolName || '',
    contactname: c.contactName || '',
    email: c.email || '',
    city: c.city || '',
    country: c.country || '',
  };
  return String(text).replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (m, key) => {
    const k = key.toLowerCase();
    return k in map ? map[k] : m;
  });
}

// EN: Build the final HTML for one recipient — personalize, then optionally
//     wrap in the Inochi branded shell.
// BN: এক প্রাপকের final HTML — personalize, তারপর চাইলে Inochi branded
//     shell-এ wrap।
function buildHtml(rawHtml, subject, contact, wrapBrand) {
  const personal = personalize(rawHtml, contact);
  if (wrapBrand) return mailer.brandWrap(personalize(subject, contact) || 'Inochi Global Education', personal);
  return personal;
}

/* --------------------------------- Groups -------------------------------- */

exports.listGroups = async (req, res) => {
  try {
    const groups = await EmailGroup.findAll({ order: [['name', 'ASC']] });
    // EN: Attach a live member count per group for the UI dropdown.
    // BN: UI dropdown-এর জন্য প্রতি group-এ live member count।
    const contacts = await SchoolContact.findAll({ attributes: ['groups', 'active'] });
    const counts = {};
    contacts.forEach((c) => {
      if (c.active === false) return;
      (Array.isArray(c.groups) ? c.groups : []).forEach((g) => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });
    res.json({ groups: groups.map((g) => ({ ...g.toJSON(), memberCount: counts[g.name] || 0 })) });
  } catch (err) {
    console.error('listGroups:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Group name is required.' });
    const group = await EmailGroup.create({ name, description: req.body.description || '' });
    res.status(201).json({ message: 'Group created', group });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'A group with that name already exists.' });
    }
    console.error('createGroup:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const group = await EmailGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const oldName = group.name;
    const newName = req.body.name !== undefined ? String(req.body.name).trim() : group.name;
    await group.update({
      ...(req.body.name !== undefined && { name: newName }),
      ...(req.body.description !== undefined && { description: req.body.description }),
    });
    // EN: Rename cascades into contacts' groups arrays so links don't break.
    // BN: Rename হলে contact-দের groups array-তেও বদলায় — link ভাঙে না।
    if (newName && newName !== oldName) {
      const affected = await SchoolContact.findAll();
      await Promise.all(
        affected
          .filter((c) => Array.isArray(c.groups) && c.groups.includes(oldName))
          .map((c) => c.update({ groups: c.groups.map((g) => (g === oldName ? newName : g)) }))
      );
    }
    res.json({ message: 'Group updated', group });
  } catch (err) {
    console.error('updateGroup:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const group = await EmailGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const name = group.name;
    await group.destroy();
    // EN: Strip the deleted group name from every contact's groups array.
    // BN: Deleted group-এর নাম প্রতিটা contact-এর groups array থেকে সরাও।
    const affected = await SchoolContact.findAll();
    await Promise.all(
      affected
        .filter((c) => Array.isArray(c.groups) && c.groups.includes(name))
        .map((c) => c.update({ groups: c.groups.filter((g) => g !== name) }))
    );
    res.json({ message: 'Group deleted' });
  } catch (err) {
    console.error('deleteGroup:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* -------------------------------- Contacts ------------------------------- */

exports.listContacts = async (req, res) => {
  try {
    const where = {};
    if (req.query.active === 'true') where.active = true;
    const contacts = await SchoolContact.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['schoolName', 'ASC']],
    });
    res.json({ contacts });
  } catch (err) {
    console.error('listContacts:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createContact = async (req, res) => {
  try {
    const email = norm(req.body.email);
    const schoolName = String(req.body.schoolName || '').trim();
    if (!schoolName) return res.status(400).json({ error: 'School name is required.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });
    const contact = await SchoolContact.create({
      schoolName,
      contactName: req.body.contactName || '',
      email,
      city: req.body.city || '',
      country: req.body.country || '',
      groups: Array.isArray(req.body.groups) ? req.body.groups : [],
      notes: req.body.notes || '',
      active: req.body.active !== false,
      sortOrder: Number(req.body.sortOrder) || 0,
    });
    res.status(201).json({ message: 'Contact created', contact });
  } catch (err) {
    console.error('createContact:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const contact = await SchoolContact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    const b = req.body;
    if (b.email !== undefined && !isEmail(b.email)) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }
    await contact.update({
      ...(b.schoolName !== undefined && { schoolName: String(b.schoolName).trim() }),
      ...(b.contactName !== undefined && { contactName: b.contactName }),
      ...(b.email !== undefined && { email: norm(b.email) }),
      ...(b.city !== undefined && { city: b.city }),
      ...(b.country !== undefined && { country: b.country }),
      ...(b.groups !== undefined && { groups: Array.isArray(b.groups) ? b.groups : [] }),
      ...(b.notes !== undefined && { notes: b.notes }),
      ...(b.active !== undefined && { active: !!b.active }),
      ...(b.sortOrder !== undefined && { sortOrder: Number(b.sortOrder) || 0 }),
    });
    res.json({ message: 'Contact updated', contact });
  } catch (err) {
    console.error('updateContact:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const deleted = await SchoolContact.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Contact not found' });
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    console.error('deleteContact:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Bulk add — accepts { contacts: [{schoolName,email,...}] }. Skips invalid
//     emails and addresses already in the directory; returns counts.
// BN: Bulk add — { contacts: [{schoolName,email,...}] } নেয়। অবৈধ email আর
//     directory-তে আগে থেকে থাকা ঠিকানা skip করে; count return করে।
exports.bulkCreateContacts = async (req, res) => {
  try {
    const rows = Array.isArray(req.body.contacts) ? req.body.contacts : [];
    if (rows.length === 0) return res.status(400).json({ error: 'No contacts provided.' });
    const existing = new Set((await SchoolContact.findAll({ attributes: ['email'] })).map((c) => norm(c.email)));
    const seen = new Set();
    const toCreate = [];
    let skipped = 0;
    rows.forEach((r) => {
      const email = norm(r.email);
      const schoolName = String(r.schoolName || '').trim();
      if (!isEmail(email) || !schoolName || existing.has(email) || seen.has(email)) {
        skipped += 1;
        return;
      }
      seen.add(email);
      toCreate.push({
        schoolName,
        contactName: r.contactName || '',
        email,
        city: r.city || '',
        country: r.country || '',
        groups: Array.isArray(r.groups) ? r.groups : [],
        notes: r.notes || '',
        active: true,
      });
    });
    const created = toCreate.length ? await SchoolContact.bulkCreate(toCreate) : [];
    res.status(201).json({ message: 'Bulk import complete', created: created.length, skipped, total: rows.length });
  } catch (err) {
    console.error('bulkCreateContacts:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* --------------------------------- Sending ------------------------------- */

// EN: Resolve the recipient list from the send mode + payload.
// BN: send mode + payload থেকে প্রাপক তালিকা resolve।
async function resolveRecipients({ mode, group, contactIds, email, schoolName, contactName }) {
  if (mode === 'single') {
    if (!isEmail(email)) return { error: 'A valid recipient email is required.' };
    return { recipients: [{ email: norm(email), schoolName: schoolName || '', contactName: contactName || '', city: '', country: '' }] };
  }
  if (mode === 'selected') {
    const ids = Array.isArray(contactIds) ? contactIds : [];
    if (ids.length === 0) return { error: 'No contacts selected.' };
    const rows = await SchoolContact.findAll({ where: { id: { [Op.in]: ids }, active: true } });
    return { recipients: rows.map(toRecipient) };
  }
  if (mode === 'group') {
    if (!group) return { error: 'No group selected.' };
    const rows = await SchoolContact.findAll({ where: { active: true } });
    return { recipients: rows.filter((c) => Array.isArray(c.groups) && c.groups.includes(group)).map(toRecipient) };
  }
  if (mode === 'all') {
    const rows = await SchoolContact.findAll({ where: { active: true } });
    return { recipients: rows.map(toRecipient) };
  }
  return { error: 'Unknown send mode.' };
}

const toRecipient = (c) => ({
  email: c.email,
  schoolName: c.schoolName || '',
  contactName: c.contactName || '',
  city: c.city || '',
  country: c.country || '',
});

// EN: Send ONE test email so the admin can verify look + tokens before a real
//     blast. Uses an optional `sample` contact to render the personalization.
// BN: একটা test মেইল পাঠায় — আসল blast-এর আগে admin look + token যাচাই
//     করতে পারে। personalization render করতে optional `sample` contact।
exports.sendTest = async (req, res) => {
  try {
    const { subject, html, testEmail, sample, wrapBrand = true } = req.body;
    if (!subject || !html) return res.status(400).json({ error: 'Subject and body are required.' });
    if (!isEmail(testEmail)) return res.status(400).json({ error: 'A valid test email is required.' });
    if (!mailer.smtpReady()) return res.status(503).json({ error: 'Email (SMTP) is not configured on the server.' });

    const sampleContact = {
      schoolName: (sample && sample.schoolName) || 'Sample School',
      contactName: (sample && sample.contactName) || '',
      city: (sample && sample.city) || '',
      country: (sample && sample.country) || '',
      email: norm(testEmail),
    };
    const finalSubject = `[TEST] ${personalize(subject, sampleContact)}`;
    const finalHtml = buildHtml(html, subject, sampleContact, wrapBrand);

    const result = await mailer.sendMail({ to: norm(testEmail), subject: finalSubject, html: finalHtml, replyTo: REPLY_TO });
    if (!result.sent) return res.status(502).json({ error: result.reason || 'Send failed' });

    await EmailLog.create({
      subject, bodyHtml: html, mode: 'test', recipientsCount: 1, sentCount: 1, failedCount: 0,
      replyTo: REPLY_TO, sentBy: String(req.user?._id || req.user?.id || ''), status: 'test',
    });
    res.json({ message: `Test email sent to ${testEmail}`, sent: 1 });
  } catch (err) {
    console.error('sendTest:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Send an individual, personalized mail to each resolved recipient. Awaits
//     each send sequentially with a small delay (SMTP throttle), collects
//     success/failure, and records an EmailLog. Returns a summary the UI shows.
// BN: প্রতিটি resolve করা প্রাপকে আলাদা, personalized মেইল পাঠায়। প্রতিটা
//     send sequential await + ছোট delay (SMTP throttle), success/failure জমা
//     করে, EmailLog রাখে। UI-তে দেখানোর summary return করে।
exports.sendCampaign = async (req, res) => {
  try {
    const { subject, html, mode, wrapBrand = true } = req.body;
    if (!subject || !html) return res.status(400).json({ error: 'Subject and body are required.' });
    if (!mode) return res.status(400).json({ error: 'Send mode is required.' });
    if (!mailer.smtpReady()) return res.status(503).json({ error: 'Email (SMTP) is not configured on the server.' });

    const { recipients, error } = await resolveRecipients(req.body);
    if (error) return res.status(400).json({ error });

    // EN: De-dupe by email.  BN: email দিয়ে de-dupe।
    const unique = [];
    const seen = new Set();
    (recipients || []).forEach((r) => {
      const e = norm(r.email);
      if (isEmail(e) && !seen.has(e)) { seen.add(e); unique.push({ ...r, email: e }); }
    });

    if (unique.length === 0) return res.status(400).json({ error: 'No valid recipients found.' });
    if (unique.length > MAX_RECIPIENTS) {
      return res.status(400).json({ error: `Too many recipients (${unique.length}). Max ${MAX_RECIPIENTS} per send — please split into smaller groups.` });
    }

    let sent = 0;
    const failed = [];
    for (const r of unique) {
      const finalSubject = personalize(subject, r);
      const finalHtml = buildHtml(html, subject, r, wrapBrand);
      // eslint-disable-next-line no-await-in-loop
      const result = await mailer.sendMail({ to: r.email, subject: finalSubject, html: finalHtml, replyTo: REPLY_TO });
      if (result.sent) sent += 1;
      else failed.push({ email: r.email, reason: result.reason || 'unknown' });
      // eslint-disable-next-line no-await-in-loop
      if (SEND_DELAY_MS > 0) await delay(SEND_DELAY_MS);
    }

    const status = failed.length === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial';
    await EmailLog.create({
      subject, bodyHtml: html, mode, groupName: mode === 'group' ? (req.body.group || '') : '',
      recipientsCount: unique.length, sentCount: sent, failedCount: failed.length, failedEmails: failed,
      replyTo: REPLY_TO, sentBy: String(req.user?._id || req.user?.id || ''), status,
    });

    res.json({ message: `Sent to ${sent} of ${unique.length} recipient(s)`, sent, failed: failed.length, failedEmails: failed, total: unique.length });
  } catch (err) {
    console.error('sendCampaign:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.listLogs = async (req, res) => {
  try {
    const logs = await EmailLog.findAll({ order: [['createdAt', 'DESC']], limit: 50 });
    res.json({ logs });
  } catch (err) {
    console.error('listLogs:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Lightweight status for the composer to warn if SMTP isn't set up + show
//     the fixed Reply-To address.
// BN: Composer-এর জন্য হালকা status — SMTP set না থাকলে warn + fixed Reply-To
//     ঠিকানা দেখায়।
exports.status = async (req, res) => {
  res.json({ smtpReady: mailer.smtpReady(), replyTo: REPLY_TO, maxRecipients: MAX_RECIPIENTS });
};

/* ----------------------- Import from existing lists ---------------------- */

// EN: Gather importable rows from an in-system source. Subscribers → only
//     CONFIRMED (double-opt-in) ones, mapped with the email as the school
//     label (no name on file). Contacts (contact-form leads) → mapped with
//     their name. Returns de-duped rows + a count of how many are NOT already
//     in the directory.
// BN: সিস্টেমের একটা source থেকে import-যোগ্য row সংগ্রহ। Subscriber → শুধু
//     CONFIRMED (double-opt-in), email-কে school label হিসেবে (নাম নেই)।
//     Contact (contact-form lead) → নাম সহ। directory-তে নেই এমন কতগুলো,
//     তার count সহ de-duped row ফেরত।
async function gatherSource(source, group) {
  const rows = [];
  if (source === 'subscribers') {
    const subs = await Subscriber.findAll();
    subs.forEach((s) => {
      if (!s.confirmedAt) return; // only opted-in
      const email = norm(s.email);
      if (!isEmail(email)) return;
      rows.push({ email, schoolName: email, contactName: '', groups: group ? [group] : [] });
    });
  } else if (source === 'contacts') {
    const cs = await Contact.findAll();
    cs.forEach((c) => {
      const email = norm(c.email);
      if (!isEmail(email)) return;
      rows.push({ email, schoolName: c.name || email, contactName: c.name || '', groups: group ? [group] : [] });
    });
  } else {
    return null;
  }
  return rows;
}

// EN: Preview how many NEW emails each in-system source could add.
// BN: প্রতিটি in-system source থেকে কতগুলো নতুন email যোগ করা যাবে তার preview।
exports.importPreview = async (req, res) => {
  try {
    const existing = new Set((await SchoolContact.findAll({ attributes: ['email'] })).map((c) => norm(c.email)));
    const countNew = (rows) => {
      const seen = new Set();
      rows.forEach((r) => {
        if (!existing.has(r.email) && !seen.has(r.email)) seen.add(r.email);
      });
      return seen.size;
    };
    const subs = await gatherSource('subscribers', '');
    const contacts = await gatherSource('contacts', '');
    res.json({ subscribers: countNew(subs), contacts: countNew(contacts) });
  } catch (err) {
    console.error('importPreview:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Import a source's emails into the directory. Skips addresses already
//     present + duplicates within the source. Optional group assignment.
// BN: একটা source-এর email directory-তে import। আগে থেকে থাকা ঠিকানা +
//     source-এর ভিতরের duplicate skip। Optional group assignment।
exports.importFromSource = async (req, res) => {
  try {
    const { source, group } = req.body;
    const rows = await gatherSource(source, group || '');
    if (rows === null) return res.status(400).json({ error: 'Unknown source. Use "subscribers" or "contacts".' });
    if (rows.length === 0) return res.json({ message: 'Nothing to import', created: 0, skipped: 0, total: 0 });

    const existing = new Set((await SchoolContact.findAll({ attributes: ['email'] })).map((c) => norm(c.email)));
    const seen = new Set();
    const toCreate = [];
    let skipped = 0;
    rows.forEach((r) => {
      if (existing.has(r.email) || seen.has(r.email)) { skipped += 1; return; }
      seen.add(r.email);
      toCreate.push({ ...r, active: true });
    });
    const created = toCreate.length ? await SchoolContact.bulkCreate(toCreate) : [];
    res.status(201).json({ message: 'Import complete', created: created.length, skipped, total: rows.length });
  } catch (err) {
    console.error('importFromSource:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
