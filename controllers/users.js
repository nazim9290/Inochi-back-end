const { User } = require('../models');
const { hashPassword } = require('../helpers/auth');
const { logAudit } = require('../helpers/audit');

const ROLES = ['admin', 'student', 'gust', 'staff'];

// EN: Admin-side full user CRUD. The legacy register/login flow stays in
//     userAuth.js for self-signup. This is the dashboard view: list any
//     user, filter by role, edit name/email/phone/role/branch, optionally
//     reset password, delete. Always strips password from responses.
// BN: Admin-side full user CRUD। Legacy register/login flow self-signup-এর
//     জন্য userAuth.js-এ আছে। এটা dashboard view: যে কোনো user list, role
//     দিয়ে filter, name/email/phone/role/branch edit, password reset
//     (optional), delete। Response থেকে সবসময় password বাদ।
const stripPassword = (u) => {
  const j = u.toJSON ? u.toJSON() : { ...u };
  delete j.password;
  return j;
};

exports.listUsers = async (req, res) => {
  try {
    const where = {};
    if (req.query.role && ROLES.includes(req.query.role)) where.role = req.query.role;
    if (req.query.branch) where.branch = req.query.branch;
    const users = await User.findAll({
      where,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] },
    });
    res.json({ users });
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createUserByAdmin = async (req, res) => {
  try {
    const { name, email, phone, password, role, branch } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'নাম দিতে হবে' });
    if (!phone || !String(phone).trim()) return res.status(400).json({ error: 'ফোন নম্বর দিতে হবে' });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'কমপক্ষে ৬ অক্ষরের password দিন' });
    }
    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ error: `Role-এর মান এই গুলোর একটা হতে হবে: ${ROLES.join(', ')}` });
    }

    if (email) {
      const existsByEmail = await User.findOne({ where: { email } });
      if (existsByEmail) return res.status(409).json({ error: 'এই email আগে থেকে আছে' });
    }
    const existsByPhone = await User.findOne({ where: { phone } });
    if (existsByPhone) return res.status(409).json({ error: 'এই ফোন নম্বর আগে থেকে আছে' });

    const hashed = await hashPassword(password);
    const user = await User.create({
      name: String(name).trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      phone: String(phone).trim(),
      password: hashed,
      role: role || 'gust',
      branch: branch || 'A',
    });
    logAudit(req, {
      action: 'create',
      entity: 'User',
      entityId: user.id,
      summary: `Created ${user.role} account for ${user.name}`,
      details: { name: user.name, role: user.role, email: user.email },
    });
    res.status(201).json({ message: 'User created', user: stripPassword(user) });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.updateUserByAdmin = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { name, email, phone, role, branch, password } = req.body || {};
    const patch = {};
    if (typeof name === 'string' && name.trim()) patch.name = name.trim();
    if (typeof email === 'string') patch.email = email.trim().toLowerCase() || null;
    if (typeof phone === 'string' && phone.trim()) patch.phone = phone.trim();
    if (role && ROLES.includes(role)) patch.role = role;
    if (typeof branch === 'string') patch.branch = branch;
    let passwordChanged = false;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password কমপক্ষে ৬ অক্ষরের হতে হবে' });
      }
      patch.password = await hashPassword(password);
      passwordChanged = true;
    }
    await user.update(patch);
    const changedFields = Object.keys(patch).filter((k) => k !== 'password');
    logAudit(req, {
      action: 'update',
      entity: 'User',
      entityId: user.id,
      summary: `Updated ${user.name}${passwordChanged ? ' (password reset)' : changedFields.length ? ` — ${changedFields.join(', ')}` : ''}`,
      details: { changedFields, passwordChanged },
    });
    res.json({ message: 'User updated', user: stripPassword(user) });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

// EN: Refuse to delete the requesting admin's own account — prevents the
//     "I just locked myself out" support ticket.
// BN: Requesting admin-এর নিজের account delete করতে দেই না — "নিজেকে
//     লক করে ফেললাম" support ticket এড়াতে।
exports.deleteUserByAdmin = async (req, res) => {
  try {
    const selfId = req.user?._id || req.user?.id;
    if (selfId && String(selfId) === String(req.params.id)) {
      return res.status(400).json({ error: 'নিজের account নিজে delete করা যাবে না' });
    }
    const target = await User.findByPk(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    const snap = { name: target.name, role: target.role, email: target.email };
    await target.destroy();
    logAudit(req, {
      action: 'delete',
      entity: 'User',
      entityId: req.params.id,
      summary: `Deleted ${snap.role} account ${snap.name}`,
      details: snap,
    });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
