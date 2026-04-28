const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;

const { User, SeminerBooking, StudentDetails, sequelize } = require('../models');
const mailer = require('../helpers/mailer');
const { hashPassword, comparePassword } = require('../helpers/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name) return res.json({ error: 'Name is required' });
  if (!password || password.length < 6) {
    return res.json({ error: 'Password is required and should be 6 characters long' });
  }

  try {
    if (email) {
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.json({ error: 'email is taken' });
    }

    const hashedPassword = await hashPassword(password);
    await User.create({ name, password: hashedPassword, phone, email });
    return res.json({ ok: true });
  } catch (err) {
    console.error('REGISTER FAILED =>', err);
    return res.status(400).send('Error. Try again.');
  }
};

exports.BookSeminer = async (req, res) => {
  const { name, email, phone, date, time, seminar } = req.body;
  try {
    await SeminerBooking.create({ name, phone, email });
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
    const user = await User.findOne({ where: { email } });
    if (!user) return res.json({ error: 'no user found' });

    const match = await comparePassword(password, user.password);
    if (!match) return res.json({ error: 'Wrong password' });

    const token = jwt.sign({ _id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userData = user.toJSON();
    delete userData.password;
    res.json({ token, user: userData });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(400).send('Error. Try again.');
  }
};

exports.currentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user._id || req.user.id);
    if (!user) return res.sendStatus(404);
    res.json({ ok: true });
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
