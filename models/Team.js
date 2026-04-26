const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Team = sequelize.define(
  'Team',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    image: { type: DataTypes.JSONB, defaultValue: null },
    facebook: { type: DataTypes.STRING },
    twiter: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    position: { type: DataTypes.INTEGER },
    linkdin: { type: DataTypes.STRING },
    youtube: { type: DataTypes.STRING },
    designation: { type: DataTypes.STRING, allowNull: false },
    authorId: {
      type: DataTypes.UUID,
      field: 'author_id',
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
  },
  {
    tableName: 'teams',
    timestamps: true,
  }
);

module.exports = Team;
