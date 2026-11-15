/**
 * EN: One row: Inochi's own student numbers (totals only, no names), written
 *     monthly by a cloud routine that reads Agency Book, shown on the public
 *     statistics guide. Shape is checked in routes/studentReport.js.
 * BN: একটা row: Inochi-র নিজস্ব ছাত্র-সংখ্যা (শুধু মোট, কোনো নাম নয়)। প্রতি
 *     মাসে Agency Book পড়ে একটা cloud routine লেখে, public পরিসংখ্যান guide-এ
 *     দেখায়। গঠন যাচাই হয় routes/studentReport.js-এ।
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define(
  'StudentReport',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
    data: { type: DataTypes.JSONB, defaultValue: {} },
  },
  { tableName: 'student_report', timestamps: true }
);
