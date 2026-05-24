/**
 * EN: JlptSession — one JLPT exam sitting on /jlpt-calendar. Dates are ISO
 *     strings (kept as text to match the seed); title + city are multilingual.
 *     `levels` is a JSONB array (["N5","N4",…]). The public controller
 *     reshapes title/city back into {en,bn,ja} objects.
 * BN: JlptSession — /jlpt-calendar-এর একটা JLPT পরীক্ষা session। তারিখ ISO
 *     string (seed-এর সাথে মিল রাখতে text); title + city multilingual।
 *     `levels` JSONB array (["N5","N4",…])। Public controller title/city-কে
 *     {en,bn,ja} object-এ reshape করে।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JlptSession = sequelize.define(
  'JlptSession',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    session: { type: DataTypes.STRING(40), defaultValue: '' },
    examDate: { type: DataTypes.STRING(20), defaultValue: '' },
    registrationOpen: { type: DataTypes.STRING(20), defaultValue: '' },
    registrationClose: { type: DataTypes.STRING(20), defaultValue: '' },

    title: { type: DataTypes.STRING(160), defaultValue: '' },
    titleEn: { type: DataTypes.STRING(160), defaultValue: '' },
    titleJa: { type: DataTypes.STRING(160), defaultValue: '' },

    city: { type: DataTypes.STRING(160), defaultValue: '' },
    cityEn: { type: DataTypes.STRING(160), defaultValue: '' },
    cityJa: { type: DataTypes.STRING(160), defaultValue: '' },

    levels: { type: DataTypes.JSONB, defaultValue: ['N5', 'N4', 'N3', 'N2', 'N1'] },
    registrationUrl: { type: DataTypes.STRING(500), defaultValue: '' },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'jlpt_sessions', timestamps: true }
);

module.exports = JlptSession;
