const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Team = sequelize.define(
  'Team',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    nameEn: { type: DataTypes.STRING, defaultValue: '' },
    // EN: Optional Japanese variant — for the Japan-side audience.
    // BN: Optional Japanese variant — Japan-পক্ষের audience-এর জন্য।
    nameJa: { type: DataTypes.STRING, defaultValue: '' },
    image: { type: DataTypes.JSONB, defaultValue: null },
    facebook: { type: DataTypes.STRING },
    twiter: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    position: { type: DataTypes.INTEGER },
    linkdin: { type: DataTypes.STRING },
    youtube: { type: DataTypes.STRING },
    designation: { type: DataTypes.STRING, allowNull: false },
    designationEn: { type: DataTypes.STRING, defaultValue: '' },
    designationJa: { type: DataTypes.STRING, defaultValue: '' },
    bio: { type: DataTypes.TEXT, defaultValue: '' },
    bioEn: { type: DataTypes.TEXT, defaultValue: '' },
    bioJa: { type: DataTypes.TEXT, defaultValue: '' },
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
