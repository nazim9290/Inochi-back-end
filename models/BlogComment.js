const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * EN: Threaded comments with admin moderation. New comments default to
 *     'pending' and only show on the public site after admin approves.
 *     parentId enables 1-level reply threading; replies inherit the
 *     same moderation flow as top-level comments.
 * BN: Admin moderation সহ thread comment। নতুন comment default-এ 'pending'
 *     — admin approve করলে public site-এ দেখা যাবে। parentId দিয়ে 1-level
 *     reply thread; reply-ও একই moderation flow follow করে।
 */
const BlogComment = sequelize.define(
  'BlogComment',
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
    parentId: {
      type: DataTypes.UUID,
      field: 'parent_id',
      allowNull: true,
      references: { model: 'blog_comments', key: 'id' },
      onDelete: 'CASCADE',
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    edited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'blog_comments',
    timestamps: true,
    indexes: [
      { fields: ['blog_id', 'status'] },
      { fields: ['parent_id'] },
      { fields: ['status', 'created_at'] },
    ],
  },
);

module.exports = BlogComment;
