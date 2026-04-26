const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define(
  'Document',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING },
    studentNid: { type: DataTypes.STRING, field: 'student_nid' },
    branch: { type: DataTypes.STRING },
    markSheetSSC: { type: DataTypes.STRING, field: 'mark_sheet_ssc' },
    markSheetHSC: { type: DataTypes.STRING, field: 'mark_sheet_hsc' },
  },
  {
    tableName: 'documents',
    timestamps: true,
  }
);

module.exports = Document;
