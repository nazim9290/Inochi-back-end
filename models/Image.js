const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Image = sequelize.define(
  'Image',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    url: { type: DataTypes.TEXT },
    publicId: { type: DataTypes.STRING, field: 'public_id', unique: true, allowNull: false },
  },
  {
    tableName: 'images',
    timestamps: true,
  }
);

module.exports = Image;
