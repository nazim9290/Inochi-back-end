const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Brand = sequelize.define(
  'Brand',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    image: { type: DataTypes.JSONB, defaultValue: null },
  },
  {
    tableName: 'brands',
    timestamps: true,
  }
);

module.exports = Brand;
