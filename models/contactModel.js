const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contact = sequelize.define(
  'Contact',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING },
    msg: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' },
  },
  {
    tableName: 'contacts',
    timestamps: true,
  }
);

module.exports = Contact;
