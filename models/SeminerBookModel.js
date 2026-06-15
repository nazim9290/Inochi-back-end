const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SeminerBooking = sequelize.define(
  'SeminerBooking',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    // EN: Lead-source attribution (where this booking came from — FB ad, etc.).
    // BN: Lead-source attribution (এই booking কোথা থেকে এল — FB ad ইত্যাদি)।
    source: { type: DataTypes.STRING(120), defaultValue: '' },
    attribution: { type: DataTypes.TEXT, defaultValue: '' },
  },
  {
    tableName: 'seminer_bookings',
    timestamps: true,
  }
);

module.exports = SeminerBooking;
