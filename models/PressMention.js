/**
 * EN: PressMention — one media-coverage entry on /press. Outlet + logo text +
 *     link + date are plain; headline and excerpt are multilingual (bn primary
 *     + En/Ja). Public controller reshapes them into {en,bn,ja} objects.
 * BN: PressMention — /press-এর একটা media-coverage entry। Outlet + logo text +
 *     link + date plain; headline ও excerpt multilingual (bn primary +
 *     En/Ja)। Public controller এদের {en,bn,ja} object-এ reshape করে।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PressMention = sequelize.define(
  'PressMention',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    outlet: { type: DataTypes.STRING(120), allowNull: false },
    logoText: { type: DataTypes.STRING(20), defaultValue: '' },
    url: { type: DataTypes.STRING(500), defaultValue: '' },
    // EN: ISO date string ("2025-11-12") — kept as text to match the seed.
    // BN: ISO date string ("2025-11-12") — seed-এর সাথে মিল রাখতে text।
    date: { type: DataTypes.STRING(20), defaultValue: '' },

    headline: { type: DataTypes.TEXT, defaultValue: '' },
    headlineEn: { type: DataTypes.TEXT, defaultValue: '' },
    headlineJa: { type: DataTypes.TEXT, defaultValue: '' },

    excerpt: { type: DataTypes.TEXT, defaultValue: '' },
    excerptEn: { type: DataTypes.TEXT, defaultValue: '' },
    excerptJa: { type: DataTypes.TEXT, defaultValue: '' },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'press_mentions', timestamps: true }
);

module.exports = PressMention;
