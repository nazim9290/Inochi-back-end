/**
 * EN: BlogTopicQueue — admin-curated queue of blog topics waiting to be
 *     turned into AI-generated posts. The daily scheduler dequeues the
 *     oldest pending row first; when empty, it falls back to AI-picked
 *     fresh topics from a built-in category pool.
 * BN: BlogTopicQueue — admin curated queue, যেখানে AI-generated post-এ
 *     রূপান্তরিত হওয়ার অপেক্ষায় topic থাকে। Daily scheduler প্রথমে সবচেয়ে
 *     পুরোনো pending row নেয়; queue খালি হলে built-in category pool থেকে
 *     AI-picked fresh topic fallback হিসেবে নেয়।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BlogTopicQueue = sequelize.define(
  'BlogTopicQueue',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // EN: Topic prompt the admin writes — short hint, e.g. "JLPT N5 প্রস্তুতি
    //     ৩০ দিনে"; the AI uses this as the brief for the full post.
    // BN: Admin-এর লেখা topic prompt — সংক্ষিপ্ত হিন্ট, যেমন "৩০ দিনে JLPT
    //     N5 প্রস্তুতি"; AI এই brief অনুযায়ী পুরো post লেখে।
    topic: { type: DataTypes.TEXT, allowNull: false },
    // EN: Optional category override; if blank, AI picks one from CATEGORY_POOL.
    // BN: Optional category override; খালি হলে AI CATEGORY_POOL থেকে বেছে নেয়।
    category: { type: DataTypes.STRING(80), defaultValue: '' },
    // EN: Optional comma-separated keyword hints to weave into the post for
    //     SEO. Bloggers know their long-tail keywords; let admin supply them.
    // BN: SEO-এর জন্য post-এ বুনে দেওয়ার মতো optional CSV keyword hint।
    //     Blogger নিজের long-tail keyword জানে; admin সরবরাহ করুক।
    keywordsCsv: { type: DataTypes.TEXT, defaultValue: '' },
    status: {
      type: DataTypes.ENUM('pending', 'used', 'failed'),
      defaultValue: 'pending',
    },
    usedAt: { type: DataTypes.DATE, allowNull: true },
    blogId: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: 'blog_topic_queue',
    timestamps: true,
    indexes: [{ fields: ['status', 'createdAt'] }],
  }
);

module.exports = BlogTopicQueue;
