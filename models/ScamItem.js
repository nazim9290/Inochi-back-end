/**
 * EN: ScamItem — single entry on /anti-scam. The page mixes two kinds of
 *     content: long-form "red flag" warnings (title + body) and short
 *     verification "checks" (title only). Rather than two near-identical
 *     models, one row carries both via a `kind` discriminator. The
 *     controller reshapes flat rows into the legacy
 *     `{ redFlags: [...], checks: [...] }` JSON shape so the existing
 *     Next.js page renderer doesn't need to change.
 *
 * BN: ScamItem — /anti-scam পেজের একটা entry। পেজে দুই ধরনের content
 *     আছে: লম্বা "red flag" সতর্কতা (title + body) এবং ছোট verification
 *     "check" (শুধু title)। দুইটা প্রায়-একই model না করে, একটা row-এ
 *     `kind` discriminator দিয়ে দুটোই রাখা। Controller flat row-গুলোকে
 *     legacy `{ redFlags: [...], checks: [...] }` JSON shape-এ reshape
 *     করে — existing Next.js page renderer পরিবর্তনের দরকার নেই।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ScamItem = sequelize.define(
  'ScamItem',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: Either "redflag" (title + body) or "check" (title-only question).
    // BN: হয় "redflag" (title + body) অথবা "check" (শুধু title-question)।
    kind: { type: DataTypes.STRING(20), defaultValue: 'redflag' },

    // EN: Optional stable key — handy for deep-linking and analytics.
    // BN: Optional stable key — deep-link আর analytics-এ কাজে লাগে।
    itemKey: { type: DataTypes.STRING(60), defaultValue: '' },

    // EN: Title trio — for "check" rows, this IS the question.
    // BN: Title trio — "check" row-এ এটাই প্রশ্ন।
    title: { type: DataTypes.STRING(255), allowNull: false },
    titleEn: { type: DataTypes.STRING(255), defaultValue: '' },
    titleJa: { type: DataTypes.STRING(255), defaultValue: '' },

    // EN: Body trio — only meaningful for "redflag" rows; checks leave empty.
    // BN: Body trio — শুধু "redflag" row-এ অর্থপূর্ণ; check ফাঁকা রাখে।
    body: { type: DataTypes.TEXT, defaultValue: '' },
    bodyEn: { type: DataTypes.TEXT, defaultValue: '' },
    bodyJa: { type: DataTypes.TEXT, defaultValue: '' },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'scam_items',
    timestamps: true,
  }
);

module.exports = ScamItem;
