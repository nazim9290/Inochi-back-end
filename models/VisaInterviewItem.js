/**
 * EN: VisaInterviewItem — one Q&A row on /visa-interview. The public page
 *     groups rows by categoryKey into themed categories; each row therefore
 *     carries its category's label + intro (denormalised, like ChecklistItem).
 *     Every text field is multilingual (bn primary + En/Ja); the controller
 *     reshapes into the nested {categories:[{questions:[…]}]} shape the page
 *     already consumes.
 * BN: VisaInterviewItem — /visa-interview-এর একটা Q&A row। Public page
 *     categoryKey দিয়ে row-গুলো theme-ভিত্তিক category-তে group করে; তাই
 *     প্রতিটা row তার category-র label + intro বহন করে (denormalised,
 *     ChecklistItem-এর মতো)। প্রতিটা text field multilingual (bn primary +
 *     En/Ja); controller page-এর expected nested
 *     {categories:[{questions:[…]}]} shape-এ reshape করে।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const T = { type: DataTypes.TEXT, defaultValue: '' };

const VisaInterviewItem = sequelize.define(
  'VisaInterviewItem',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: Category grouping key + its label/intro (repeated across its rows).
    // BN: Category group key + তার label/intro (ঐ category-র row-গুলোয় পুনরাবৃত্ত)।
    categoryKey: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'general' },
    categoryLabel: { type: DataTypes.STRING(160), defaultValue: '' },
    categoryLabelEn: { type: DataTypes.STRING(160), defaultValue: '' },
    categoryLabelJa: { type: DataTypes.STRING(160), defaultValue: '' },
    categoryIntro: T,
    categoryIntroEn: T,
    categoryIntroJa: T,

    // EN: The question + coaching fields.
    // BN: প্রশ্ন + coaching field।
    question: T, questionEn: T, questionJa: T,
    tip: T, tipEn: T, tipJa: T,
    modelAnswer: T, modelAnswerEn: T, modelAnswerJa: T,
    redFlag: T, redFlagEn: T, redFlagJa: T,

    groupOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'visa_interview_items', timestamps: true }
);

module.exports = VisaInterviewItem;
