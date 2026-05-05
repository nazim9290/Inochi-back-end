const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// EN: AgencyMoment — Cloudinary photos of office life, classes, JLPT batches,
//     ceremonies, partner-school visits, and Japan trips. Rendered as an
//     auto-flow horizontal marquee right below the home Hero so visitors get
//     immediate visual proof without slowing the LCP (the Hero stays text).
//     Bilingual caption is optional — most photos read fine without one.
// BN: AgencyMoment — অফিস জীবন, ক্লাস, JLPT batch, অনুষ্ঠান, partner-school
//     visit, জাপান trip-এর Cloudinary ছবি। Home Hero-এর ঠিক নিচে auto-flow
//     horizontal marquee হিসেবে render — Hero text-based থাকে বলে LCP slow
//     হয় না, কিন্তু visitor সাথে সাথে visual proof পায়। Bilingual caption
//     optional — অনেক ছবি caption ছাড়াই বোঝা যায়।
const AgencyMoment = sequelize.define(
  'AgencyMoment',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    photoUrl: { type: DataTypes.STRING(500), allowNull: false },

    caption: { type: DataTypes.STRING(300), defaultValue: '' },
    captionEn: { type: DataTypes.STRING(300), defaultValue: '' },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'agency_moments',
    timestamps: true,
  }
);

module.exports = AgencyMoment;
