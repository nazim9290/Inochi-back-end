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
const BdCity = require('./BdCity');
const JpCity = require('./JpCity');
const Event = require('./Event');
const ChecklistItem = require('./ChecklistItem');
const ScamItem = require('./ScamItem');
const Application = require('./Application');
const AuditLog = require('./AuditLog');
const Achievement = require('./Achievement');
const HomeVideo = require('./HomeVideo');
const AgencyMoment = require('./AgencyMoment');
const BlogReaction = require('./BlogReaction');
const BlogComment = require('./BlogComment');
const BlogBookmark = require('./BlogBookmark');
const SchoolContact = require('./SchoolContact');
const EmailGroup = require('./EmailGroup');
const EmailLog = require('./EmailLog');
const GlossaryTerm = require('./GlossaryTerm');
const UniversityRanking = require('./UniversityRanking');
const PressMention = require('./PressMention');
const CommunityChannel = require('./CommunityChannel');
const JlptSession = require('./JlptSession');
const VisaInterviewItem = require('./VisaInterviewItem');
const QuizQuestion = require('./QuizQuestion');
const QuizTier = require('./QuizTier');

// Associations
User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });
Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

User.hasMany(StudentDetails, { foreignKey: 'userId', as: 'userDetails' });
StudentDetails.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Team, { foreignKey: 'authorId', as: 'teams' });
Team.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

User.hasMany(Review, { foreignKey: 'postedby', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'postedby', as: 'postedByUser' });

// EN: Blog reactions — one per (blog, user); cascade on blog/user delete.
// BN: Blog reaction — প্রতি (blog, user) যুগলে একটা; blog/user delete-এ cascade।
Blog.hasMany(BlogReaction, { foreignKey: 'blogId', as: 'reactions', onDelete: 'CASCADE' });
BlogReaction.belongsTo(Blog, { foreignKey: 'blogId', as: 'blog' });
User.hasMany(BlogReaction, { foreignKey: 'userId', as: 'blogReactions', onDelete: 'CASCADE' });
BlogReaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// EN: Blog comments — threaded (1 level). Cascade on blog/user/parent delete.
// BN: Blog comment — 1-level thread। blog/user/parent delete-এ cascade।
Blog.hasMany(BlogComment, { foreignKey: 'blogId', as: 'comments', onDelete: 'CASCADE' });
BlogComment.belongsTo(Blog, { foreignKey: 'blogId', as: 'blog' });
User.hasMany(BlogComment, { foreignKey: 'userId', as: 'blogComments', onDelete: 'CASCADE' });
BlogComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
BlogComment.hasMany(BlogComment, { foreignKey: 'parentId', as: 'replies', onDelete: 'CASCADE' });
BlogComment.belongsTo(BlogComment, { foreignKey: 'parentId', as: 'parent' });

// EN: Blog bookmarks — saved posts per logged-in user.
// BN: Blog bookmark — logged-in user-এর saved post।
User.hasMany(BlogBookmark, { foreignKey: 'userId', as: 'blogBookmarks', onDelete: 'CASCADE' });
BlogBookmark.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Blog.hasMany(BlogBookmark, { foreignKey: 'blogId', as: 'bookmarks', onDelete: 'CASCADE' });
BlogBookmark.belongsTo(Blog, { foreignKey: 'blogId', as: 'blog' });

// EN: Applications optionally linked to a User (for /account tracker).
// BN: Application optionally User-এর সাথে link (/account tracker-এর জন্য)।
User.hasMany(Application, { foreignKey: 'userId', as: 'applications', onDelete: 'SET NULL' });
Application.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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
  BdCity,
  JpCity,
  Event,
  ChecklistItem,
  ScamItem,
  Application,
  AuditLog,
  Achievement,
  HomeVideo,
  AgencyMoment,
  BlogReaction,
  BlogComment,
  BlogBookmark,
  SchoolContact,
  EmailGroup,
  EmailLog,
  GlossaryTerm,
  UniversityRanking,
  PressMention,
  CommunityChannel,
  JlptSession,
  VisaInterviewItem,
  QuizQuestion,
  QuizTier,
};
