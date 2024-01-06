const User = require("../models/userModel")
const { hashPassword, comparePassword } = require("../helper/auth")
const jwt = require("jsonwebtoken")
const StudentDetails = require("../models/StudentDetailModel")
const mongoose = require('mongoose');

exports.register = async (req, res) => {
  //  console.log("REGISTER ENDPOINT => ", req.body);
  const { name, email, password, phone } = req.body;
  // validation
  if (!name) {
    return res.json({
      error: "Name is required",
    });
  }
  if (!password || password.length < 6) {
    return res.json({
      error: "Password is required and should be 6 characters long",
    });
  }

  const exist = await User.findOne({ phone });
  if (exist) {
    return res.json({
      error: "phone is taken",
    });
  }
  // id
  const randomInteger = Math.floor(Math.random() * 10);
  // console.log(randomInteger);
  // hash password
  const hashedPassword = await hashPassword(password);

  const user = new User({
    name,
    email,
    password: hashedPassword,
    phone: phone,
  });
  try {
    await user.save();
    // console.log("REGISTERED USE => ", user);
    return res.json({
      ok: true,
    });
  } catch (err) {
    console.log("REGISTER FAILED => ", err);
    return res.status(400).send("Error. Try again.");
  }
};

exports.login = async (req, res) => {
  // console.log(req.body);
  try {
    const { email, password } = req.body;
    // check if our db has user with that email
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        error: "no user found",
      });
    }
    // check password
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.json({
        error: "Wrong password",
      });
    }
    // create signed token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    user.password = undefined;
    res.json({
      token,
      user,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send("Error. Try again.");
  }
};


exports.currentUser = async (req, res) => {
  // console.log("test ")
  try {
    const user = await User.findById(req.user._id);
    // res.json(user);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
};


exports.createStudentdetails = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      fName,
      lname,
      address,
      classOf,
      branch,
      studentId,
      action,
    } = req.body;

    const user_id = req.params.id;
    const user = await User.findById(user_id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'User not found' });
    }
    const studentDetails = new StudentDetails({
      postedBy: user_id,
      fName,
      lName,
      address,
      classOf,
      branch,
      studentId,
      action,
    });

    // Save the student details
    await studentDetails.save({ session });

    // Optionally, update the user's details
    user.Fname = fName;
    user.Lname = lname;
    user.address = address;
    user.classOf = classOf;
    user.branch = branch;
    user.studentId = studentId;
    user.action = action;

    // Update the userDetails field in the User model
    user.userDetails.push(studentDetails._id);
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'Student details created successfully' });
  } catch (error) {
    console.error('Error creating student details:', error);

    await session.abortTransaction();
    session.endSession();

    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET route to fetch all student details
exports.getAllStudents = async (req, res) => {
  try {
    const allUsersWithStudentDetails = await User.find().populate('userDetails', 'name address class branch studentId accountType');
    const users = allUsersWithStudentDetails.map(user => user.userDetails);

    res.json({ users });
  } catch (error) {
    console.error('Error fetching all users with student details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
// 

// Route for updating user profile

exports.upDateProfile = async (req, res) => {
  const {
    name,
    email,
    phone,
    father,
    mother,
    paddress,
    parent,
    education,
    public_id
  } = req.body;
  const userId = req.user._id; // Assuming you have authentication middleware that sets req.user

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the user's profile information
    user.name = name;
    user.email = email;
    user.phone = phone;
    user.father = father;
    user.mother = mother;
    user.paddress = paddress;
    user.parent = parent;
    user.education = education;
    user.image = {
            url: `data:image/png;base64,${public_id}`,
            public_id,
        };
    // Save the updated user document
    await user.save();

    // Send a response indicating success
    res.json({ message: 'Profile updated successfully', user: user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}


