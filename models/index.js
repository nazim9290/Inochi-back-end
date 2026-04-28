const sequelize = require('../config/database');

const User = require('./userModel');
const Blog = require('./blogModel');
const Question = require('./Question');
const StudentDetails = require('./StudentDetailModel');
const Contact = require('./contactModel');
const Subscriber = require('./subscriberModel');
const Team = require('./Team');
const Brand = require('./Brand');
const CaruselModel = require('./CaruselModel');
const Review = require('./Review');
const Seminer = require('./Seminer');
const SeminerBooking = require('./SeminerBookModel');
const Video = require('./Video');
const Document = require('./Document');
const ContacPage = require('./ContacPageModel');
const ImageTopCarousel = require('./imageTopCarousel');
const Rpage = require('./pageData');
const Image = require('./Image');
const SiteSettings = require('./SiteSettings');
const HowItWorksStep = require('./HowItWorksStep');
const JlptCourse = require('./JlptCourse');
const SuccessStory = require('./SuccessStory');
const Faq = require('./Faq');
const Branch = require('./Branch');
const Application = require('./Application');

// Associations
User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });
Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

User.hasMany(StudentDetails, { foreignKey: 'userId', as: 'userDetails' });
StudentDetails.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Team, { foreignKey: 'authorId', as: 'teams' });
Team.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

User.hasMany(Review, { foreignKey: 'postedby', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'postedby', as: 'postedByUser' });

module.exports = {
  sequelize,
  User,
  Blog,
  Question,
  StudentDetails,
  Contact,
  Subscriber,
  Team,
  Brand,
  CaruselModel,
  Review,
  Seminer,
  SeminerBooking,
  Video,
  Document,
  ContacPage,
  ImageTopCarousel,
  Rpage,
  Image,
  SiteSettings,
  HowItWorksStep,
  JlptCourse,
  SuccessStory,
  Faq,
  Branch,
  Application,
};
