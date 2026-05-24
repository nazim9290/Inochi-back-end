/**
 * EN: University — one partner Japanese language school powering /universities
 *     and /universities/[slug]. (Distinct from UniversityRanking, which is the
 *     ranked top-universities table.) tagline + highlights are multilingual;
 *     duration + intakes are JSONB string arrays. Public controller reshapes
 *     tagline back into {en,bn,ja}; highlights already store that shape.
 * BN: University — /universities ও /universities/[slug]-কে চালানো একটা partner
 *     জাপানি ল্যাঙ্গুয়েজ স্কুল। (UniversityRanking থেকে আলাদা — ওটা ranked
 *     top-university টেবিল।) tagline + highlights multilingual; duration +
 *     intakes JSONB string array। Public controller tagline-কে {en,bn,ja}-এ
 *     reshape করে; highlights ঐ shape-এই থাকে।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const University = sequelize.define(
  'University',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    kanji: { type: DataTypes.STRING(200), defaultValue: '' },
    city: { type: DataTypes.STRING(60), defaultValue: '' },
    established: { type: DataTypes.INTEGER, defaultValue: 0 },

    tagline: { type: DataTypes.TEXT, defaultValue: '' },
    taglineEn: { type: DataTypes.TEXT, defaultValue: '' },
    taglineJa: { type: DataTypes.TEXT, defaultValue: '' },

    tuitionAnnual: { type: DataTypes.STRING(60), defaultValue: '' },
    applicationFee: { type: DataTypes.STRING(60), defaultValue: '' },
    duration: { type: DataTypes.JSONB, defaultValue: [] },
    intakes: { type: DataTypes.JSONB, defaultValue: [] },
    jlptStart: { type: DataTypes.STRING(80), defaultValue: '' },
    studentCapacity: { type: DataTypes.INTEGER, defaultValue: 0 },

    // [{ en, bn, ja }]
    highlights: { type: DataTypes.JSONB, defaultValue: [] },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'partner_universities', timestamps: true }
);

module.exports = University;
