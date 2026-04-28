const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Faq = sequelize.define(
  'Faq',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    question: { type: DataTypes.STRING(500), allowNull: false },
    questionEn: { type: DataTypes.STRING(500), defaultValue: '' },
    answer: { type: DataTypes.TEXT, defaultValue: '' },
    answerEn: { type: DataTypes.TEXT, defaultValue: '' },
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
