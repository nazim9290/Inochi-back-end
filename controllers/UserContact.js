const { Contact } = require('../models');
const mailer = require('../helpers/mailer');

// EN: Cap stored message body so bots can't pump huge payloads through the
//     form (DB bloat + mail provider rejections downstream).
// BN: stored message body cap — bot বিশাল payload pump করতে না পারে
//     (DB bloat + mail provider reject)।
const MAX_MSG_LEN = 4000;
const MAX_NAME_LEN = 200;

exports.contact = async (req, res) => {
  // EN: Honeypot — bots fill every visible input. `website` is hidden from
  //     real users via CSS; if it has any value, silently accept and drop.
  // BN: Honeypot — bot সব visible input fill করে। `website` CSS দিয়ে real
  //     user-এর কাছে hidden; value থাকলে নীরবে accept করে discard।
  if (req.body && req.body.website) {
    return res.status(201).json({ message: 'Your message sent successfully' });
  }

  const name = String(req.body?.name || '').trim().slice(0, MAX_NAME_LEN);
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 200);
  const phone = String(req.body?.phone || '').trim().slice(0, 50);
  const msg = String(req.body?.msg || '').trim().slice(0, MAX_MSG_LEN);

  if (!name || !msg) {
    return res.status(422).json({ error: 'Name and message are required' });
  }

  try {
    await Contact.create({ name, email, phone, msg });
    // Fire-and-forget — never let mail failures block the form submit.
    mailer.notifyContact({ name, email, phone, msg }).catch((e) => console.error('notifyContact:', e));
    if (email) mailer.thankContact({ name, email }).catch((e) => console.error('thankContact:', e));
    return res.status(201).json({ message: 'Your message sent successfully' });
  } catch (error) {
    console.error('Error inserting contact:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllContact = async (req, res) => {
  try {
    const contacts = await Contact.findAll({ order: [['createdAt', 'DESC']] });
    return res.status(200).json({ contacts });
  } catch (error) {
    console.error('Error getting contacts:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.changeAnswerStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const [affected] = await Contact.update({ status: 'Answered' }, { where: { id } });
    if (affected > 0) {
      return res.status(200).json({ message: 'Answer status updated successfully' });
    }
    return res.status(404).json({ error: 'Answer not found' });
  } catch (error) {
    console.error('Error updating answer status:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.singleContact = async (req, res) => {
  const { id } = req.params;
  try {
    const contact = await Contact.findByPk(id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    return res.status(200).json({ contact });
  } catch (error) {
    console.error('Error getting single contact:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Hard delete a contact row — admin uses this to clear spam / processed
//     entries. No soft-delete column on the model, so this is permanent.
// BN: Contact row hard delete — spam / processed entry সরাতে admin ব্যবহার
//     করে। Model-এ soft-delete column নেই, তাই এটা permanent।
exports.deleteContact = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Contact.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Contact not found' });
    return res.status(200).json({ message: 'Contact deleted' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
