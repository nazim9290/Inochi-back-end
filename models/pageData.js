const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Rpage = sequelize.define(
  'Rpage',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING },
    subtitile: { type: DataTypes.STRING },
    Address: { type: DataTypes.STRING },
    Contactinfo: { type: DataTypes.STRING },
    timeSchedule: { type: DataTypes.STRING, field: 'time_schedule' },
  },
  {
    tableName: 'page_data',
    timestamps: true,
  }
);

module.exports = Rpage;
