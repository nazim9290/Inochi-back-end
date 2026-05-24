/**
 * EN: MockTest — per-level config for the /jlpt-mock-test page (N5, N4…):
 *     duration, passing score, and a trilingual description. Questions live in
 *     MockQuestion keyed by `level`; totalQuestions is computed from the count.
 * BN: MockTest — /jlpt-mock-test পেজের প্রতি-level config (N5, N4…): সময়,
 *     pass স্কোর, ত্রিভাষিক বিবরণ। প্রশ্ন MockQuestion-এ `level` দিয়ে;
 *     totalQuestions গণনা থেকে আসে।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MockTest = sequelize.define(
  'MockTest',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    level: { type: DataTypes.STRING(10), allowNull: false, unique: true },
    duration: { type: DataTypes.INTEGER, defaultValue: 15 },
    passingScore: { type: DataTypes.INTEGER, defaultValue: 6 },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    descriptionEn: { type: DataTypes.TEXT, defaultValue: '' },
    descriptionJa: { type: DataTypes.TEXT, defaultValue: '' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'mock_tests', timestamps: true }
);

module.exports = MockTest;
