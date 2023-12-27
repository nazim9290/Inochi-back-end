const User =require("../models/userModel")
const { hashPassword, comparePassword}=require("../helper/auth")
const  jwt =require( "jsonwebtoken")
const StudentDetails=require("../models/StudentDetailModel")

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
    phone:phone,
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
  try {
    const user = await User.findById(req.user._id);
    // res.json(user);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
};
// 
// POST route to create student details for a user
exports.createStudentdetails = async (req, res) => {
  try {
    const {
      user_id,
      fName,
      lname,
      address,
      classOf,
      branch,
      studentId,
      action,
    } = req.body;

    // Check if the user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create student details
    const studentDetails = new StudentDetails({
      postedBy: user_id,
      fName,
      lname,
      address,
      classOf,
      branch,
      studentId,
      action,
    });

    // Save the student details
    await studentDetails.save();

    // Optionally, you can update the user's details as well
    user.fname = fName;
    user.lname = lname;
    user.address = address;
    user.classOf = classOf;
    user.branch = branch;
    user.studentId = studentId;
    user.action = action;
    // Update the userDetails field in the User model
    user.userDetails.push(studentDetails._id);
    await user.save();
    res.status(201).json({ message: 'Student details created successfully' });
  } catch (error) {
    console.error('Error creating student details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET route to fetch all student details
exports.getAllStudents = async (req, res) => {
  try {
    const allUsersWithStudentDetails = await User.find().populate('userDetails');
    res.json({ users: allUsersWithStudentDetails });
  } catch (error) {
    console.error('Error fetching all users with student details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};