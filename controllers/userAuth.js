const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;

const { User, SeminerBooking, StudentDetails, LoginAttempt, sequelize } = require('../models');
const mailer = require('../helpers/mailer');
const { hashPassword, comparePassword } = require('../helpers/auth');

// EN: Lockout policy — 5 wrong passwords inside the window puts the email on
//     a 15-minute timeout. Success resets the row, so honest users with the
//     occasional typo never notice.
// BN: Lockout policy — window-এর মধ্যে 5টা ভুল password হলে email-টা
//     15 মিনিট timeout-এ। সফল login row reset করে; মাঝে মধ্যে typo করা
//     legitimate user-এ কোনো প্রভাব পড়ে না।
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// EN: Password complexity rule — 8+ chars and at least one digit. Tighter
//     than the old `length >= 6` and resists most dictionary lists.
// BN: Password complexity — 8+ char এবং অন্তত একটা digit। পুরোনো
//     `length >= 6`-এর চেয়ে কড়া; বেশিরভাগ dictionary list resist করে।
function passwordWeakReason(pw) {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters';
  if (!/\d/.test(pw)) return 'Password must contain at least one digit';
  return null;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name) return res.json({ error: 'Name is required' });
  const weak = passwordWeakReason(password);
  if (weak) return res.json({ error: weak });
  if (!phone) return res.json({ error: 'Phone is required' });

  try {
    if (email) {
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.json({ error: 'email is taken' });
    }
    // EN: phone is unique on the User table — surface a nice error before insert.
    // BN: User table-এ phone unique — insert-এর আগে ভাল error message দেখাই।
    const phoneExists = await User.findOne({ where: { phone } });
    if (phoneExists) return res.json({ error: 'phone is taken' });

    const hashedPassword = await hashPassword(password);
    const created = await User.create({ name, password: hashedPassword, phone, email });
    // EN: Auto-login on signup — return token + user so the public site can keep the session.
    // BN: Signup-এর সাথে auto-login — token + user return করি যাতে public site session রাখতে পারে।
    const token = jwt.sign({ _id: created.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userData = created.toJSON();
    delete userData.password;
    return res.json({ ok: true, token, user: userData });
  } catch (err) {
    console.error('REGISTER FAILED =>', err);
    return res.status(400).send('Error. Try again.');
  }
};

exports.BookSeminer = async (req, res) => {
  const { name, email, phone, date, time, seminar, source, attribution } = req.body;
  try {
    await SeminerBooking.create({
      name,
      phone,
      email,
      source: String(source || '').slice(0, 120),
      attribution: String(attribution || '').slice(0, 600),
    });
    mailer
      .notifyBooking({ name, email, phone, date, time, seminar })
      .catch((e) => console.error('notifyBooking:', e));
    return res.json({ ok: true });
  } catch (err) {
    console.error('Booking Seminer FAILED =>', err);
    return res.status(400).send('Error. Try again.');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !password) {
      return res.json({ error: 'Email and password required' });
    }

    // EN: Lockout gate — runs BEFORE the DB user lookup so a locked email
    //     can't be probed for "user exists vs not" by timing the response.
    // BN: Lockout gate — DB user lookup-এর আগে চলে যাতে locked email-এ
    //     response time দেখে "user আছে কিনা" probe করা না যায়।
    const attempt = await LoginAttempt.findOne({ where: { email: normalized } });
    if (attempt && attempt.lockedUntil && attempt.lockedUntil > new Date()) {
      const waitMin = Math.ceil((attempt.lockedUntil - new Date()) / 60000);
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${waitMin} minute(s).`,
      });
    }

    const user = await User.findOne({ where: { email: normalized } });
    // EN: Generic message for both "user not found" and "wrong password" so
    //     an attacker can't enumerate valid emails through the login form.
    // BN: "user নেই" + "wrong password" — দু'টোর জন্য একই generic message
    //     যাতে attacker login form দিয়ে valid email enumerate করতে না পারে।
    const fail = async () => {
      await recordLoginFailure(normalized);
      return res.json({ error: 'Invalid email or password' });
    };
    if (!user) return fail();

    const match = await comparePassword(password, user.password);
    if (!match) return fail();

    // Reset attempt counter on success.
    if (attempt) await attempt.destroy();

    const token = jwt.sign({ _id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userData = user.toJSON();
    delete userData.password;
    res.json({ token, user: userData });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(400).send('Error. Try again.');
  }
};

// EN: Upsert the failure counter; lock when it exceeds MAX_FAILS within the
//     window. Window is reset on long gaps so honest users with one mistake
//     a day don't accumulate toward a lockout.
// BN: Failure counter upsert; window-এর মধ্যে MAX_FAILS অতিক্রম করলে lock।
//     Long gap-এ window reset — যে user দিনে একবার ভুল করে তাকে lockout
//     accumulate করে না।
async function recordLoginFailure(email) {
  const now = new Date();
  let row = await LoginAttempt.findOne({ where: { email } });
  if (!row) {
    return LoginAttempt.create({ email, failures: 1, lastAttempt: now });
  }
  const stale = now - new Date(row.lastAttempt) > FAIL_WINDOW_MS;
  const nextFailures = stale ? 1 : row.failures + 1;
  row.failures = nextFailures;
  row.lastAttempt = now;
  if (nextFailures >= MAX_FAILS) {
    row.lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);
    row.failures = 0;
  }
  return row.save();
}

exports.currentUser = async (req, res) => {
  try {
    // EN: requireAuth middleware already loaded & validated the user; reuse it.
    //     Strip password before returning so the field never reaches the wire.
    // BN: requireAuth middleware আগেই user load + validate করেছে; reuse করি।
    //     Password strip করে return — wire-এ যাতে কখনো leak না হয়।
    const user = req.user.toJSON();
    delete user.password;
    res.json({ ok: true, user });
  } catch (err) {
    console.error('currentUser error:', err);
    res.sendStatus(400);
  }
};

exports.createStudentdetails = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { fName, lname, address, classOf, branch, studentId, action } = req.body;
    const userId = req.params.id;

    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    await StudentDetails.create(
      {
        userId,
        Fname: fName,
        Lname: lname,
        address,
        classOf,
        branch,
        studentId,
        action,
      },
      { transaction }
    );

    await transaction.commit();
    res.status(201).json({ message: 'Student details created successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating student details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const allUser = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    res.json({ allUser });
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.upDateProfile = async (req, res) => {
  try {
    // EN: Ownership / admin gate — caller may only edit their own profile
    //     unless they are admin. Without this any logged-in user could
    //     overwrite anyone else's record by passing a different :id.
    // BN: Ownership / admin gate — caller শুধু নিজের profile edit করতে
    //     পারবে (admin ছাড়া)। এটা না থাকলে যেকোনো logged-in user অন্য
    //     কারো :id দিয়ে তার profile overwrite করতে পারত।
    const callerId = String(req.user?.id || '');
    const targetId = String(req.params.id || '');
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && callerId !== targetId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    Object.assign(user, {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      father: req.body.father,
      mother: req.body.mother,
      paddress: req.body.paddress,
      parent: req.body.permanent,
      education: req.body.education,
      image: req.body.image,
    });
    await user.save();

    const userData = user.toJSON();
    delete userData.password;
    res.json({ message: 'Profile updated successfully', user: userData });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const findByBranch = (branch) => async (req, res) => {
  try {
    const users = await User.findAll({
      where: { branch },
      attributes: { exclude: ['password'] },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching by branch:', error);
    res.status(500).send('Internal Server Error');
  }
};

const findByRole = (role) => async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role },
      attributes: { exclude: ['password'] },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching by role:', error);
    res.status(500).send('Internal Server Error');
  }
};

exports.getBranchA = findByBranch('A');
exports.getBranchB = findByBranch('B');
exports.allFree = findByRole('gust');
exports.AllStudent = findByRole('student');

exports.userRole = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (req.body.role) user.role = req.body.role;
    if (req.body.branch) user.branch = req.body.branch;
    await user.save();

    const userData = user.toJSON();
    delete userData.password;
    res.json({ message: 'Profile updated successfully', user: userData });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.files.image.path);
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
};

exports.BookSeminerGet = async (req, res) => {
  try {
    const pendingSeminer = await SeminerBooking.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ pendingSeminer });
  } catch (err) {
    console.error('Error fetching seminer bookings:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// EN: Delete a seminar booking — admin uses this once attendance is recorded
//     elsewhere or the entry is a duplicate / spam.
// BN: Seminar booking delete — attendance অন্যত্র record হলে অথবা duplicate /
//     spam হলে admin ব্যবহার করে।
exports.deleteBookSeminer = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await SeminerBooking.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Booking not found' });
    res.status(200).json({ message: 'Booking deleted' });
  } catch (err) {
    console.error('Error deleting seminer booking:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
