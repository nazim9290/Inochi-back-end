/**
 * EN: ChecklistItem — single line in the document checklist that powers
 *     /document-checklist on the public site. The page groups items by
 *     `category` (personal / academic / financial / japan / ...). We keep
 *     items as flat rows rather than a nested category-with-items model
 *     because flat rows are simpler to reorder, toggle, and audit — the
 *     page-level renderer does the grouping.
 *
 *     `categoryKey` is a free string so admins can introduce new groups
 *     without schema change. `categoryLabel` (+En, +Ja) is denormalised
 *     onto each item so the controller can read every item once and emit
 *     the legacy nested `categories[].items[]` shape directly. We pick
 *     the first item of each group's category labels as the canonical
 *     label (admins editing the same group should keep them in sync; the
 *     admin form will auto-fill them from the first sibling).
 *
 * BN: ChecklistItem — /document-checklist পেজের document checklist-এর
 *     একটা line। পেজ item-গুলো `category` (personal / academic /
 *     financial / japan / …) দিয়ে group করে। Nested category-with-items
 *     model না করে flat row রেখেছি — flat row reorder/toggle/audit করা
 *     সহজ; page-level renderer group করে।
 *
 *     `categoryKey` free string — admin schema পরিবর্তন ছাড়াই নতুন group
 *     আনতে পারে। `categoryLabel` (+En, +Ja) প্রতিটা item-এ denormalised —
 *     controller সব item একবার পড়ে সরাসরি legacy nested
 *     `categories[].items[]` shape emit করতে পারে। প্রতিটা group-এর
 *     প্রথম item-এর label canonical (admin form সহ-form-গুলোতে auto-fill
 *     করবে যাতে sync থাকে)।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChecklistItem = sequelize.define(
  'ChecklistItem',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: Group key — drives the section the item appears in.
    // BN: Group key — কোন section-এ item দেখাবে।
    categoryKey: { type: DataTypes.STRING(40), allowNull: false },
    categoryLabel: { type: DataTypes.STRING(120), defaultValue: '' },
    categoryLabelEn: { type: DataTypes.STRING(120), defaultValue: '' },
    categoryLabelJa: { type: DataTypes.STRING(120), defaultValue: '' },

    // EN: The item line itself — trilingual.
    // BN: Item-এর লাইন — তিন ভাষায়।
    label: { type: DataTypes.TEXT, allowNull: false },
    labelEn: { type: DataTypes.TEXT, defaultValue: '' },
    labelJa: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: Optional helper note (e.g. "notarise within 6 months of issue").
    // BN: Optional helper note (যেমন "জারির ৬ মাসের মধ্যে notarise")।
    note: { type: DataTypes.TEXT, defaultValue: '' },
    noteEn: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: Categories ordered by groupOrder; items inside a category by sortOrder.
    // BN: Category groupOrder দিয়ে sort; category-র ভিতরে item sortOrder।
    groupOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'checklist_items',
    timestamps: true,
  }
);

module.exports = ChecklistItem;
