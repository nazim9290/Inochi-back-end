const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SuccessStory = sequelize.define(
  'SuccessStory',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentName: { type: DataTypes.STRING, allowNull: false }, // names stay
    university: { type: DataTypes.STRING, defaultValue: '' },
    location: { type: DataTypes.STRING, defaultValue: '' },
    locationEn: { type: DataTypes.STRING, defaultValue: '' },
    photoUrl: { type: DataTypes.STRING(500), defaultValue: '' },
    story: { type: DataTypes.TEXT, defaultValue: '' },
    storyEn: { type: DataTypes.TEXT, defaultValue: '' },
    batchYear: { type: DataTypes.STRING, defaultValue: '' },
    jlptLevel: { type: DataTypes.STRING, defaultValue: '' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },

    // EN: 5-phase journey for documented-success triptych. Each phase is
    //     {photoUrl, date} — optional. Frontend renders a phase only when
    //     photoUrl is set, so admin can fill them progressively as the
    //     student moves through the milestones. Adding a 6th phase later is
    //     just a new key — no migration needed.
    // BN: Documented-success triptych-এর জন্য 5-phase journey। প্রতিটা phase
    //     {photoUrl, date} — optional। photoUrl set থাকলেই frontend phase-টা
    //     দেখায়, তাই admin student-এর milestone অনুযায়ী একটা একটা করে যোগ
    //     করতে পারে। ভবিষ্যতে ৬ষ্ঠ phase যোগ করতে শুধু নতুন key — migration
    //     লাগবে না।
    //     Phase keys: class, coe, visa, arrival, firstDay
    journey: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    tableName: 'success_stories',
    timestamps: true,
  }
);

module.exports = SuccessStory;
