const { Contact } = require('../models');

exports.contact = async (req, res) => {
  const { name, email, phone, msg } = req.body;
  try {
    await Contact.create({ name, email, phone, msg });
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
