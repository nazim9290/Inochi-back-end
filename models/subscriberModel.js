const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscriber = sequelize.define(
  'Subscriber',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue('email', String(value).trim().toLowerCase());
      },
    },
  },
  {
    tableName: 'subscribers',
    timestamps: true,
  }
);

module.exports = Subscriber;
