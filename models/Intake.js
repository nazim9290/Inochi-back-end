/**
 * EN: Intake — one per-intake SEO landing entry powering /intake and
 *     /intake/[slug] (April 2026, October 2026…). Dates are ISO strings;
 *     season/title/tagline/coePeriod/visaWindow/departureWindow are
 *     trilingual; highlights is a JSONB array of {en,bn,ja}. The public
 *     controller reshapes the trilingual columns back into {en,bn,ja} objects
 *     the page already consumes. The generic 6-step "timeline" stays bundled
 *     in the frontend (process, not per-intake).
 * BN: Intake — /intake ও /intake/[slug]-কে চালানো per-intake SEO entry
 *     (April 2026, October 2026…)। তারিখ ISO string; season/title/tagline/
 *     coePeriod/visaWindow/departureWindow ত্রিভাষিক; highlights {en,bn,ja}-র
 *     JSONB array। Public controller ত্রিভাষিক column-কে page-এর expected
 *     {en,bn,ja} object-এ reshape করে। জেনেরিক ৬-ধাপ "timeline" frontend-এ
 *     bundled থাকে (process, per-intake নয়)।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const T = { type: DataTypes.TEXT, defaultValue: '' };

const Intake = sequelize.define(
  'Intake',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    examDate: { type: DataTypes.STRING(20), defaultValue: '' },
    applicationDeadline: { type: DataTypes.STRING(20), defaultValue: '' },
    isPast: { type: DataTypes.BOOLEAN, defaultValue: false },

    season: T, seasonEn: T, seasonJa: T,
    title: T, titleEn: T, titleJa: T,
    tagline: T, taglineEn: T, taglineJa: T,
    coePeriod: T, coePeriodEn: T, coePeriodJa: T,
    visaWindow: T, visaWindowEn: T, visaWindowJa: T,
    departureWindow: T, departureWindowEn: T, departureWindowJa: T,

    // [{ en, bn, ja }]
    highlights: { type: DataTypes.JSONB, defaultValue: [] },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'intakes', timestamps: true }
);

module.exports = Intake;
