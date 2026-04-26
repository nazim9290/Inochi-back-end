const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Blog = sequelize.define(
  'Blog',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    image: { type: DataTypes.JSONB, defaultValue: null },
    category: { type: DataTypes.STRING, allowNull: false },
    authorId: {
      type: DataTypes.UUID,
      field: 'author_id',
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM('draft', 'published'),
      defaultValue: 'draft',
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: { blogs: false, study: false, service: false },
    },
  },
  {
    tableName: 'blogs',
    timestamps: true,
  }
);

module.exports = Blog;
