const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SuccessStory = sequelize.define(
  'SuccessStory',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentName: { type: DataTypes.STRING, allowNull: false }, // names stay
    university: { type: DataTypes.STRING, defaultValue: '' },
    location: { type: DataTypes.STRING, defaultValue: '' },
    locationEn: { type: DataTypes.STRING, defaultValue: '' },
    photoUrl: { type: DataTypes.STRING(500), defaultValue: '' },
    story: { type: DataTypes.TEXT, defaultValue: '' },
    storyEn: { type: DataTypes.TEXT, defaultValue: '' },
    batchYear: { type: DataTypes.STRING, defaultValue: '' },
    jlptLevel: { type: DataTypes.STRING, defaultValue: '' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'success_stories',
    timestamps: true,
  }
);

module.exports = SuccessStory;
