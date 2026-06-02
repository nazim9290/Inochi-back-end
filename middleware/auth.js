const { verify } = require('jsonwebtoken');
const { User } = require('../models');

const requireAuth = async (req, res, next) => {
  const raw = req.headers.authorization || '';
  if (!raw) {
    return res.status(401).json({ error: 'Unauthorized - Token missing' });
  }

  // EN: Accept both "Bearer <token>" and bare "<token>" headers. Old admin
  //     clients send the raw JWT; new ones use the Bearer prefix. Splitting
  //     blindly on space previously broke the bare form.
  // BN: "Bearer <token>" এবং শুধু "<token>" — দু'টোই accept করি। পুরোনো
  //     admin client raw JWT পাঠায়, নতুনগুলো Bearer prefix। আগে blind
  //     space-split bare token break করত।
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Token missing' });
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded._id || decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    // EN: Don't leak which validation step failed — keep error generic.
    // BN: কোন validation step fail হলো leak না করে — error generic রাখি।
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

module.exports = { requireAuth };
