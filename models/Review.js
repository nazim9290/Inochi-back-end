const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// EN: Public-facing student testimonials. Anyone can submit via the website
//     review form; status starts at 'pending' and only flips to 'approved'
//     after admin moderation. `published` is a separate gate — admin can
//     approve a review (acknowledged) but choose not to surface it publicly.
//     `postedby` is optional — public submitters aren't logged in.
// BN: Public-facing student testimonial। যে কেউ website-এর review form দিয়ে
//     submit করতে পারে; status 'pending' থেকে শুরু, admin moderate করলে
//     'approved' হয়। `published` আলাদা gate — admin approve করেও public-এ
//     না দেখানোর choice রাখতে পারে। `postedby` optional — public submitter
//     login করা না।
const Review = sequelize.define(
  'Review',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    postedby: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    // Identity (public)
    name: { type: DataTypes.STRING(150), defaultValue: '' },
    // Contact (private — admin-only fields, not exposed via /published-reviews)
    email: { type: DataTypes.STRING(150), defaultValue: '' },
    phone: { type: DataTypes.STRING(40), defaultValue: '' },
    // Body
    rating: { type: DataTypes.INTEGER, defaultValue: 5 }, // 1..5
    review: { type: DataTypes.TEXT, allowNull: false },
    reviewEn: { type: DataTypes.TEXT, defaultValue: '' },
    // Context
    location: { type: DataTypes.STRING(120), defaultValue: '' },
    locationEn: { type: DataTypes.STRING(120), defaultValue: '' },
    photoUrl: { type: DataTypes.STRING(500), defaultValue: '' },
    jlptLevel: { type: DataTypes.STRING(10), defaultValue: '' }, // N1..N5 or empty
    batchYear: { type: DataTypes.STRING(8), defaultValue: '' }, // "2024"
    // Moderation
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
    },
    published: { type: DataTypes.BOOLEAN, defaultValue: false }, // surface on /reviews?
    adminNotes: { type: DataTypes.TEXT, defaultValue: '' },
  },
  {
    tableName: 'reviews',
    timestamps: true,
  }
);

module.exports = Review;
