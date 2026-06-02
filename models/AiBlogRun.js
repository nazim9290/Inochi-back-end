/**
 * EN: AiBlogRun — per-execution audit row for the daily AI blog scheduler.
 *     Records the resolved topic, source (queue/auto), success/failure,
 *     the resulting blog id, and any error message. Admin reads this on
 *     the manage page to see whether yesterday's post actually went out.
 * BN: AiBlogRun — Daily AI blog scheduler-এর প্রতিটা execution-এর audit row।
 *     Resolved topic, source (queue/auto), success/failure, resulting blog
 *     id, এবং কোনো error message — সব record করে। Admin manage page-এ এটা
 *     দেখে বুঝতে পারে গতকালের post সত্যিই গেছে কিনা।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiBlogRun = sequelize.define(
  'AiBlogRun',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    topic: { type: DataTypes.TEXT, defaultValue: '' },
    source: { type: DataTypes.STRING(20), defaultValue: 'auto' }, // 'queue' | 'auto' | 'manual'
    status: {
      type: DataTypes.ENUM('success', 'failed'),
      allowNull: false,
    },
    blogId: { type: DataTypes.UUID, allowNull: true },
    errorMessage: { type: DataTypes.TEXT, defaultValue: '' },
    durationMs: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: 'ai_blog_runs',
    timestamps: true,
    // EN: snake_case for index col refs (see BlogTopicQueue note).
    // BN: index col ref snake_case (BlogTopicQueue-এর note দেখুন)।
    indexes: [{ fields: ['created_at'] }],
  }
);

module.exports = AiBlogRun;
