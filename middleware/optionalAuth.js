/**
 * EN: Like requireAuth, but does NOT 401 when the token is missing or
 *     invalid. Used by endpoints that want to *enrich* the response when
 *     the visitor is logged in (e.g. include "your own reaction") but
 *     should still serve anonymous traffic.
 * BN: requireAuth-এর মত, কিন্তু token না থাকলে বা invalid হলেও 401 দেয় না।
 *     যেসব endpoint logged-in হলে response enrich করে (যেমন "আপনার নিজের
 *     reaction") কিন্তু anonymous visitor-কেও serve করে — তাদের জন্য।
 */

const { verify } = require('jsonwebtoken');
const { User } = require('../models');

const optionalAuth = async (req, _res, next) => {
  const token = req.headers.authorization;
  if (!token) return next();

  try {
    const decoded = verify(token.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findByPk(decoded._id || decoded.id);
    if (user) req.user = user;
  } catch {
    /* invalid token → treat as anonymous */
  }
  return next();
};

module.exports = { optionalAuth };
