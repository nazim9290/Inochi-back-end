/**
 * EN: QuizQuestion — one question of the /eligibility quiz. Question + help
 *     are trilingual; `options` is a JSONB array of
 *     { value, score, label:{en,bn,ja} } (kept in final shape so the public
 *     controller returns it untouched and the page's client-side scoring
 *     reads option.score directly). maxScore is computed (sum of each
 *     question's top option score), not stored.
 * BN: QuizQuestion — /eligibility কুইজের একটা প্রশ্ন। question + help
 *     ত্রিভাষিক; `options` JSONB array — { value, score, label:{en,bn,ja} }
 *     (final shape-এ রাখা, public controller অপরিবর্তিত ফেরত দেয়, page-এর
 *     client-side scoring সরাসরি option.score পড়ে)। maxScore হিসাব করা হয়
 *     (প্রতি প্রশ্নের সর্বোচ্চ option score-এর যোগফল), store করা হয় না।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuizQuestion = sequelize.define(
  'QuizQuestion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    questionKey: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    question: { type: DataTypes.TEXT, defaultValue: '' },
    questionEn: { type: DataTypes.TEXT, defaultValue: '' },
    questionJa: { type: DataTypes.TEXT, defaultValue: '' },
    help: { type: DataTypes.TEXT, defaultValue: '' },
    helpEn: { type: DataTypes.TEXT, defaultValue: '' },
    helpJa: { type: DataTypes.TEXT, defaultValue: '' },
    // [{ value, score, label: { en, bn, ja } }]
    options: { type: DataTypes.JSONB, defaultValue: [] },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'quiz_questions', timestamps: true }
);

module.exports = QuizQuestion;
