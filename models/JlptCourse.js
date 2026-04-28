const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JlptCourse = sequelize.define(
  'JlptCourse',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    level: { type: DataTypes.STRING, allowNull: false }, // N5, N4, N3, N2 — language-agnostic
    title: { type: DataTypes.STRING, allowNull: false },
    titleEn: { type: DataTypes.STRING, defaultValue: '' },
    tagline: { type: DataTypes.STRING, defaultValue: '' },
    taglineEn: { type: DataTypes.STRING, defaultValue: '' },
    duration: { type: DataTypes.STRING, defaultValue: '' },
    durationEn: { type: DataTypes.STRING, defaultValue: '' },
    price: { type: DataTypes.STRING, defaultValue: '' }, // currency stays
    schedule: { type: DataTypes.STRING, defaultValue: '' },
    scheduleEn: { type: DataTypes.STRING, defaultValue: '' },
    features: { type: DataTypes.JSONB, defaultValue: [] },
    featuresEn: { type: DataTypes.JSONB, defaultValue: [] },
    nextBatch: { type: DataTypes.STRING, defaultValue: '' },
    nextBatchEn: { type: DataTypes.STRING, defaultValue: '' },
    highlight: { type: DataTypes.BOOLEAN, defaultValue: false },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: 'jlpt_courses',
    timestamps: true,
  }
);

module.exports = JlptCourse;
