const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudentDetails = sequelize.define(
  'StudentDetails',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    Lname: { type: DataTypes.STRING },
    userId: {
      type: DataTypes.UUID,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
    },
    Fname: { type: DataTypes.STRING },
    address: { type: DataTypes.STRING },
    classOf: { type: DataTypes.STRING, field: 'class_of' },
    branch: { type: DataTypes.STRING },
    studentId: { type: DataTypes.STRING, field: 'student_id' },
    action: { type: DataTypes.STRING },
  },
  {
    tableName: 'student_details',
    timestamps: true,
  }
);

module.exports = StudentDetails;
