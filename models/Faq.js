const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Faq = sequelize.define(
  'Faq',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    question: { type: DataTypes.STRING(500), allowNull: false },
    questionEn: { type: DataTypes.STRING(500), defaultValue: '' },
    // EN: Optional Japanese variant — Japanese audience reads native copy
    //     instead of English fallback. Empty = renderer falls back to BN/EN.
    // BN: Optional Japanese variant — Japanese audience English fallback-এর
    //     চেয়ে native copy পড়ে। Empty = renderer BN/EN-তে fall back।
    questionJa: { type: DataTypes.STRING(500), defaultValue: '' },
    answer: { type: DataTypes.TEXT, defaultValue: '' },
    answerEn: { type: DataTypes.TEXT, defaultValue: '' },
    answerJa: { type: DataTypes.TEXT, defaultValue: '' },
    category: { type: DataTypes.STRING, defaultValue: 'general' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'faqs',
    timestamps: true,
  }
);

module.exports = Faq;
