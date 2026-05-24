/**
 * EN: QuizTier — one result band of the /eligibility quiz. `min` is the
 *     score threshold; the page picks the highest tier whose min the score
 *     meets. label + body are trilingual; `tone` drives the result colour
 *     (success | info | warning).
 * BN: QuizTier — /eligibility কুইজের একটা result band। `min` হলো score
 *     threshold; score যে tier-এর min ছোঁয় তার মধ্যে সর্বোচ্চটা page বেছে
 *     নেয়। label + body ত্রিভাষিক; `tone` result-এর রঙ ঠিক করে
 *     (success | info | warning)।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuizTier = sequelize.define(
  'QuizTier',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tierKey: { type: DataTypes.STRING(40), defaultValue: '' },
    min: { type: DataTypes.INTEGER, defaultValue: 0 },
    label: { type: DataTypes.STRING(160), defaultValue: '' },
    labelEn: { type: DataTypes.STRING(160), defaultValue: '' },
    labelJa: { type: DataTypes.STRING(160), defaultValue: '' },
    body: { type: DataTypes.TEXT, defaultValue: '' },
    bodyEn: { type: DataTypes.TEXT, defaultValue: '' },
    bodyJa: { type: DataTypes.TEXT, defaultValue: '' },
    tone: { type: DataTypes.STRING(20), defaultValue: 'info' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'quiz_tiers', timestamps: true }
);

module.exports = QuizTier;
