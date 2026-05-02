const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// EN: Achievements — visa wins, Japan reception, events, classroom moments.
//     `photos` stays JSON for multi-image gallery; `type` drives filter tabs.
// BN: অর্জন — ভিসা প্রাপ্তি, জাপানে অভ্যর্থনা, event, ক্লাসরুম মুহূর্ত।
//     photos JSON রাখা হয়েছে যাতে একাধিক ছবি গ্যালারি হয়; type দিয়ে filter ট্যাব চলে।
const Achievement = sequelize.define(
  'Achievement',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: Type drives the filter tabs (visa-win / arrival / event / class).
    // BN: type-ই filter ট্যাব ঠিক করে — visa-win / arrival / event / class।
    type: {
      type: DataTypes.ENUM('visa-win', 'arrival', 'event', 'class'),
      allowNull: false,
      defaultValue: 'visa-win',
    },

    studentName: { type: DataTypes.STRING, defaultValue: '' },
    school: { type: DataTypes.STRING, defaultValue: '' },

    // EN: Event date — admin enters; falls back to createdAt for sorting.
    // BN: ঘটনার তারিখ — admin দেয়; না দিলে createdAt দিয়ে sort হবে।
    eventDate: { type: DataTypes.DATEONLY, allowNull: true },

    // EN: photos = array of Cloudinary URLs (JSON column).
    //     videoUrl is a single optional YouTube/Cloudinary link.
    // BN: photos = Cloudinary URL-এর array (JSON)। videoUrl optional।
    photos: { type: DataTypes.JSON, defaultValue: [] },
    videoUrl: { type: DataTypes.STRING(500), defaultValue: '' },

    captionBn: { type: DataTypes.TEXT, defaultValue: '' },
    captionEn: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: featured = surfaced on Home "Recent Wins" strip.
    // BN: featured হলে Home page-এ "Recent Wins"-এ দেখাবে।
    featured: { type: DataTypes.BOOLEAN, defaultValue: false },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'achievements',
    timestamps: true,
  }
);

module.exports = Achievement;
