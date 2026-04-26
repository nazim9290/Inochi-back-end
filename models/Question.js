const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Question = sequelize.define(
  'Question',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    questionName: { type: DataTypes.STRING, allowNull: false },
    first: { type: DataTypes.STRING, allowNull: false },
    second: { type: DataTypes.STRING, allowNull: false },
    third: { type: DataTypes.STRING, allowNull: false },
    answer: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    incorrectAnswer: {
      type: DataTypes.JSONB,
      field: 'incorrect_answer',
      defaultValue: [],
    },
  },
  {
    tableName: 'questions',
    timestamps: true,
  }
);

module.exports = Question;
