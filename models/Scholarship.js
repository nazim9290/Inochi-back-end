/**
 * EN: Scholarship — one entry on the new /scholarships page (MEXT, JASSO,
 *     university waivers…). name/coverage/eligibility/howToApply are
 *     trilingual; provider/amount/deadline/link are plain. The public
 *     controller reshapes the trilingual columns into {en,bn,ja} objects.
 * BN: Scholarship — নতুন /scholarships পেজের একটা entry (MEXT, JASSO,
 *     university waiver…)। name/coverage/eligibility/howToApply ত্রিভাষিক;
 *     provider/amount/deadline/link plain। Public controller ত্রিভাষিক
 *     column-কে {en,bn,ja} object-এ reshape করে।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const T = { type: DataTypes.TEXT, defaultValue: '' };

const Scholarship = sequelize.define(
  'Scholarship',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    scholarshipKey: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(200), defaultValue: '' },
    nameEn: { type: DataTypes.STRING(200), defaultValue: '' },
    nameJa: { type: DataTypes.STRING(200), defaultValue: '' },
    provider: { type: DataTypes.STRING(200), defaultValue: '' },
    amount: { type: DataTypes.STRING(200), defaultValue: '' },
    deadline: { type: DataTypes.STRING(120), defaultValue: '' },
    link: { type: DataTypes.STRING(500), defaultValue: '' },
    coverage: T, coverageEn: T, coverageJa: T,
    eligibility: T, eligibilityEn: T, eligibilityJa: T,
    howToApply: T, howToApplyEn: T, howToApplyJa: T,
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'scholarships', timestamps: true }
);

module.exports = Scholarship;
