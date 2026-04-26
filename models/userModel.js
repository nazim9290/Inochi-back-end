const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false, unique: true },
    father: { type: DataTypes.STRING },
    mother: { type: DataTypes.STRING },
    paddress: { type: DataTypes.STRING },
    parent: { type: DataTypes.STRING },
    education: { type: DataTypes.STRING },
    externalId: { type: DataTypes.STRING, field: 'external_id' },
    image: { type: DataTypes.JSONB, defaultValue: null },
    branch: { type: DataTypes.STRING, defaultValue: 'A' },
    imagePublicId: { type: DataTypes.STRING },
    classrool: { type: DataTypes.INTEGER, unique: true },
    role: { type: DataTypes.STRING, defaultValue: 'gust' },
  },
  {
    tableName: 'users',
    timestamps: true,
  }
);

module.exports = User;
