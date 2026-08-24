const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SuccessStory = sequelize.define(
  'SuccessStory',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentName: { type: DataTypes.STRING, allowNull: false }, // names stay
    // EN: Optional admin-written headline. It becomes the share/OG title on
    //     /success/<id> and the headline of the Facebook auto-post, so it is
    //     the one line most people read. Left empty, the site composes one
    //     from the student's name, school and city — the admin never has to
    //     fill it in.
    // BN: Optional admin-লেখা headline। /success/<id>-এর share/OG title আর
    //     Facebook auto-post-এর headline হিসেবে যায় — বেশিরভাগ মানুষ এই এক
    //     লাইনই পড়ে। খালি রাখলে student-এর নাম, স্কুল আর শহর থেকে নিজেই
    //     বানিয়ে নেয় — admin-কে কখনো ভরতে হয় না।
    headline: { type: DataTypes.STRING(200), defaultValue: '' },
    headlineEn: { type: DataTypes.STRING(200), defaultValue: '' },
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
