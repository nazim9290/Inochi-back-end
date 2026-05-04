const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * EN: One reaction per (blog, user) pair. Type stores which emoji the user
 *     picked. Switching reaction types updates the same row, so a user can
 *     never have two reactions on the same post.
 * BN: প্রতি (blog, user) যুগলের জন্য একটাই reaction। Type field রাখে কোন
 *     emoji বাছল। Type পরিবর্তন করলে একই row update হয় — একজন user-এর
 *     একই post-এ দুইটা reaction কখনোই হবে না।
 */
const BlogReaction = sequelize.define(
  'BlogReaction',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    blogId: {
      type: DataTypes.UUID,
      field: 'blog_id',
      allowNull: false,
      references: { model: 'blogs', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      field: 'user_id',
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('like', 'love', 'celebrate', 'insightful'),
      allowNull: false,
      defaultValue: 'like',
    },
  },
  {
    tableName: 'blog_reactions',
    timestamps: true,
    indexes: [
      // EN: One reaction per user per blog.
      // BN: এক user, এক blog — এক reaction।
      { unique: true, fields: ['blog_id', 'user_id'] },
      { fields: ['blog_id'] },
    ],
  },
);

module.exports = BlogReaction;
