const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CaruselModel = sequelize.define(
  'CaruselModel',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING },
    content: { type: DataTypes.TEXT },
    image: { type: DataTypes.JSONB, defaultValue: null },
    category: { type: DataTypes.STRING },
    status: {
      type: DataTypes.ENUM('draft', 'published'),
      defaultValue: 'draft',
    },
  },
  {
    tableName: 'carusels',
    timestamps: true,
  }
);

module.exports = CaruselModel;
