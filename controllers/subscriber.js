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
