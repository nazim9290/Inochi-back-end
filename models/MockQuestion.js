/**
 * EN: MockQuestion — one multiple-choice question of a /jlpt-mock-test level.
 *     prompt + explanation are trilingual; `options` is a JSONB array of
 *     { value, label:{en,bn,ja} } and `correct` is the winning option value.
 *     Kept in final shape so the public controller returns options untouched
 *     and the page's client-side scoring compares option.value to `correct`.
 * BN: MockQuestion — /jlpt-mock-test-এর একটা MCQ। prompt + explanation
 *     ত্রিভাষিক; `options` JSONB array — { value, label:{en,bn,ja} } আর
 *     `correct` সঠিক option-এর value। final shape-এ রাখা — public controller
 *     options অপরিবর্তিত ফেরত দেয়, page client-side scoring option.value-কে
 *     `correct`-এর সাথে মেলায়।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MockQuestion = sequelize.define(
  'MockQuestion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    level: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'N5' },
    category: { type: DataTypes.STRING(40), defaultValue: 'vocabulary' },
    prompt: { type: DataTypes.TEXT, defaultValue: '' },
    promptEn: { type: DataTypes.TEXT, defaultValue: '' },
    promptJa: { type: DataTypes.TEXT, defaultValue: '' },
    // [{ value, label: { en, bn, ja } }]
    options: { type: DataTypes.JSONB, defaultValue: [] },
    correct: { type: DataTypes.STRING(10), defaultValue: '' },
    explanation: { type: DataTypes.TEXT, defaultValue: '' },
    explanationEn: { type: DataTypes.TEXT, defaultValue: '' },
    explanationJa: { type: DataTypes.TEXT, defaultValue: '' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'mock_questions', timestamps: true }
);

module.exports = MockQuestion;
