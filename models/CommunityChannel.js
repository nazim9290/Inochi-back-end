/**
 * EN: CommunityChannel — one row of the /community channel hub (FB group,
 *     Telegram, YouTube, etc.). name + description are multilingual (bn
 *     primary + En/Ja); the rest are plain. Public controller reshapes name +
 *     description into {en,bn,ja} objects the page expects.
 * BN: CommunityChannel — /community channel hub-এর একটা row (FB group,
 *     Telegram, YouTube ইত্যাদি)। name + description multilingual (bn primary
 *     + En/Ja); বাকিগুলো plain। Public controller name + description-কে
 *     page-এর expected {en,bn,ja} object-এ reshape করে।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommunityChannel = sequelize.define(
  'CommunityChannel',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: Channel key drives the icon/colour mapping on the page (e.g. "facebook").
    // BN: channelKey page-এ icon/colour mapping চালায় (যেমন "facebook")।
    channelKey: { type: DataTypes.STRING(40), defaultValue: '' },

    name: { type: DataTypes.STRING(160), allowNull: false },
    nameEn: { type: DataTypes.STRING(160), defaultValue: '' },
    nameJa: { type: DataTypes.STRING(160), defaultValue: '' },

    description: { type: DataTypes.TEXT, defaultValue: '' },
    descriptionEn: { type: DataTypes.TEXT, defaultValue: '' },
    descriptionJa: { type: DataTypes.TEXT, defaultValue: '' },

    url: { type: DataTypes.STRING(500), defaultValue: '' },
    members: { type: DataTypes.STRING(60), defaultValue: '' },
    language: { type: DataTypes.STRING(60), defaultValue: '' },
    color: { type: DataTypes.STRING(20), defaultValue: 'blue' },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'community_channels', timestamps: true }
);

module.exports = CommunityChannel;
