/**
 * EN: PreDepartureItem — one checklist item on the new /pre-departure page,
 *     grouped by category (documents, money, packing, arrival…). Each row
 *     carries its category label (denormalised, like ChecklistItem) plus the
 *     item text and an optional note — all trilingual. The public controller
 *     groups rows into {categories:[{items}]}.
 * BN: PreDepartureItem — নতুন /pre-departure পেজের একটা checklist item,
 *     category অনুযায়ী group (documents, money, packing, arrival…)। প্রতিটা
 *     row তার category label বহন করে (denormalised, ChecklistItem-এর মতো) +
 *     item টেক্সট ও optional note — সব ত্রিভাষিক। Public controller row-গুলো
 *     {categories:[{items}]}-এ group করে।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const T = { type: DataTypes.TEXT, defaultValue: '' };

const PreDepartureItem = sequelize.define(
  'PreDepartureItem',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    categoryKey: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'documents' },
    categoryLabel: { type: DataTypes.STRING(160), defaultValue: '' },
    categoryLabelEn: { type: DataTypes.STRING(160), defaultValue: '' },
    categoryLabelJa: { type: DataTypes.STRING(160), defaultValue: '' },
    item: T, itemEn: T, itemJa: T,
    note: T, noteEn: T, noteJa: T,
    groupOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'predeparture_items', timestamps: true }
);

module.exports = PreDepartureItem;
