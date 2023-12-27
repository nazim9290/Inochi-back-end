const mongoose = require('mongoose');


const StudentDetailsSchema = new mongoose.Schema(
  {
    fname: {
      type: String, // Assuming fName is a string, change the type accordingly
    },
    lname: {
        type: String, // Assuming fName is a string, change the type accordingly

    },
    address: {
      type: String,
    },
    classOf: {
      type: String,
    },
    branch: {
      type: String,
    },
    studentId: {
      type: String,
    },
    action: {
      type: String, // Assuming action is a string, change the type accordingly
    },
  },
  { timestamps: true }
);

const StudentDetails = mongoose.model('StudentDetails', StudentDetailsSchema);

module.exports = StudentDetails;