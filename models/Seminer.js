const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Seminer = sequelize.define(
  'Seminer',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    subtitle: { type: DataTypes.STRING },
    image: { type: DataTypes.JSONB, defaultValue: null },
    time: { type: DataTypes.STRING },
    date: { type: DataTypes.STRING },
  },
  {
    tableName: 'seminers',
    timestamps: true,
  }
);

module.exports = Seminer;
