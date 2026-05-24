/**
 * EN: GlossaryTerm — one Japan-study glossary entry powering /glossary. Each
 *     row is a long-tail SEO target (COE, JLPT, Zairyū card…). Category is a
 *     fixed taxonomy key (visa/test/school/scholarship/life/inochi) the public
 *     page groups by. Definition is stored in three languages (en/bn/ja) as
 *     flat columns because the page reads g.en / g.bn / g.ja directly.
 * BN: GlossaryTerm — /glossary-এর একটা term। প্রতিটা row long-tail SEO target
 *     (COE, JLPT, Zairyū card…)। Category একটা fixed taxonomy key
 *     (visa/test/school/scholarship/life/inochi) — public page তা দিয়ে group
 *     করে। সংজ্ঞা তিন ভাষায় (en/bn/ja) flat column-এ — page সরাসরি
 *     g.en / g.bn / g.ja পড়ে।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GlossaryTerm = sequelize.define(
  'GlossaryTerm',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: Stable slug used as the DOM id + DefinedTerm @id anchor (e.g. "coe").
    // BN: stable slug — DOM id + DefinedTerm @id anchor (যেমন "coe")।
    termKey: { type: DataTypes.STRING(80), allowNull: false, unique: true },

    // EN: Canonical term text (English/romaji) + optional Japanese form.
    // BN: Canonical term (English/romaji) + optional Japanese রূপ।
    term: { type: DataTypes.STRING(160), allowNull: false },
    termJa: { type: DataTypes.STRING(160), defaultValue: '' },

    // EN: One of the fixed category keys the page renders sections for.
    // BN: page যে fixed category key দিয়ে section বানায় তার একটা।
    category: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'visa' },

    // EN: Definition in three languages (Bangla primary per convention).
    // BN: তিন ভাষায় সংজ্ঞা (convention অনুযায়ী Bangla primary)।
    bn: { type: DataTypes.TEXT, defaultValue: '' },
    en: { type: DataTypes.TEXT, defaultValue: '' },
    ja: { type: DataTypes.TEXT, defaultValue: '' },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'glossary_terms', timestamps: true }
);

module.exports = GlossaryTerm;
