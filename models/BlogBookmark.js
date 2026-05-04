const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * EN: One bookmark per (user, blog) pair. Lets a logged-in visitor save
 *     blog posts to come back to from /account → Saved tab.
 * BN: প্রতি (user, blog) যুগলের জন্য একটাই bookmark। Logged-in visitor
 *     blog post save করতে পারে — পরে /account → Saved tab-এ এসে দেখবে।
 */
const BlogBookmark = sequelize.define(
  'BlogBookmark',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      field: 'user_id',
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    blogId: {
      type: DataTypes.UUID,
      field: 'blog_id',
      allowNull: false,
      references: { model: 'blogs', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    tableName: 'blog_bookmarks',
    timestamps: true,
    indexes: [
      // EN: One bookmark per (user, blog).
      // BN: এক user, এক blog — একটাই bookmark।
      { unique: true, fields: ['user_id', 'blog_id'] },
      { fields: ['user_id'] },
    ],
  },
);

module.exports = BlogBookmark;
