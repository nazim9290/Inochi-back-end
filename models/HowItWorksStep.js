const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HowItWorksStep = sequelize.define(
  'HowItWorksStep',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    stepNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    title: { type: DataTypes.STRING, allowNull: false },
    titleEn: { type: DataTypes.STRING, defaultValue: '' },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    descriptionEn: { type: DataTypes.TEXT, defaultValue: '' },
    icon: { type: DataTypes.STRING, defaultValue: 'compass' },
  },
  {
    tableName: 'how_it_works_steps',
    timestamps: true,
  }
);

module.exports = HowItWorksStep;
