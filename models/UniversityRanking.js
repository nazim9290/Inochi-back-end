/**
 * EN: UniversityRanking — one row of the /university-rankings table (top
 *     Japanese universities for international students). Numeric facts are
 *     plain columns; the one-line highlight is multilingual (bn primary +
 *     En/Ja). The public controller reshapes highlight back into the
 *     {en,bn,ja} object the page expects.
 * BN: UniversityRanking — /university-rankings টেবিলের একটা row (international
 *     student-দের জন্য শীর্ষ জাপানি বিশ্ববিদ্যালয়)। সংখ্যাগত তথ্য plain
 *     column; এক-লাইন highlight multilingual (bn primary + En/Ja)। Public
 *     controller highlight-কে page-এর expected {en,bn,ja} object-এ reshape করে।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UniversityRanking = sequelize.define(
  'UniversityRanking',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    rank: { type: DataTypes.INTEGER, defaultValue: 0 },
    name: { type: DataTypes.STRING(200), allowNull: false },
    city: { type: DataTypes.STRING(60), defaultValue: '' },
    type: { type: DataTypes.STRING(20), defaultValue: 'national' }, // national | private
    qsAsia: { type: DataTypes.INTEGER, defaultValue: 0 },
    intlStudents: { type: DataTypes.INTEGER, defaultValue: 0 },
    englishPrograms: { type: DataTypes.BOOLEAN, defaultValue: true },
    jlptRequired: { type: DataTypes.STRING(120), defaultValue: '' },
    tuitionAnnual: { type: DataTypes.STRING(60), defaultValue: '' },

    // EN: One-line highlight, three languages (Bangla primary).
    // BN: এক-লাইন highlight, তিন ভাষায় (Bangla primary)।
    highlight: { type: DataTypes.TEXT, defaultValue: '' },
    highlightEn: { type: DataTypes.TEXT, defaultValue: '' },
    highlightJa: { type: DataTypes.TEXT, defaultValue: '' },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'university_rankings', timestamps: true }
);

module.exports = UniversityRanking;
