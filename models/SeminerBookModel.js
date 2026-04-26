const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SeminerBooking = sequelize.define(
  'SeminerBooking',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
  },
  {
    tableName: 'seminer_bookings',
    timestamps: true,
  }
);

module.exports = SeminerBooking;
