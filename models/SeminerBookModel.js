const mongoose = require('mongoose');
const { Schema } = mongoose;
const SeminerBookModel = new Schema(
  {
    name: {
      
      trim: true,
      required: true,
    },
    email: {
      
      trim: true,
    },
    phone: {
      trim:true
    }
 
  
    

},
  { timestamps: true }
);
module.exports = mongoose.model('SeminerBooking', SeminerBookModel);

