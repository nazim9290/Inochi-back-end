const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// EN: Steps shown in the home-page Pathway section. `icon` is a lucide-react
//     icon name (string), so admin can pick from a curated dropdown without
//     touching code. `published` lets admin draft a step before going live.
// BN: Home page Pathway section-এ দেখানো step। `icon` lucide-react-এর icon
//     name (string) — admin code না ছুঁয়ে dropdown থেকে বাছাই করতে পারে।
//     `published` দিয়ে admin live-এ যাওয়ার আগে draft করতে পারে।
const HowItWorksStep = sequelize.define(
  'HowItWorksStep',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    stepNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    title: { type: DataTypes.STRING, allowNull: false },
    titleEn: { type: DataTypes.STRING, defaultValue: '' },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    descriptionEn: { type: DataTypes.TEXT, defaultValue: '' },
    icon: { type: DataTypes.STRING, defaultValue: 'compass' },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'how_it_works_steps',
    timestamps: true,
  }
);

module.exports = HowItWorksStep;
