const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContacPage = sequelize.define(
  'ContacPage',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING },
    content: { type: DataTypes.TEXT },
    image: { type: DataTypes.JSONB, defaultValue: null },
  },
  {
    tableName: 'contac_pages',
    timestamps: true,
  }
);

module.exports = ContacPage;
