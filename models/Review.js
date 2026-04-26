const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define(
  'Review',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    postedby: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
    },
    review: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'approved'),
      defaultValue: 'pending',
      allowNull: false,
    },
  },
  {
    tableName: 'reviews',
    timestamps: true,
  }
);

module.exports = Review;
