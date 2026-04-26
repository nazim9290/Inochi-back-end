const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Video = sequelize.define(
  'Video',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false, unique: true },
    playlistTitle: { type: DataTypes.STRING, field: 'playlist_title', unique: true },
  },
  {
    tableName: 'videos',
    timestamps: true,
  }
);

module.exports = Video;
