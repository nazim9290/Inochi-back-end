const { verify } = require('jsonwebtoken');
const { User } = require('../models');

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Token missing' });
  }

  try {
    const decoded = verify(token.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findByPk(decoded._id || decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

module.exports = { requireAuth };
