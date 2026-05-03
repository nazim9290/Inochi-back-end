const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// EN: HomeVideo — admin-curated YouTube videos for the public home-page video
//     section. youtubeUrl accepts any YouTube URL form (watch?v=, youtu.be/,
//     /embed/, /shorts/); the frontend extracts the video ID at render time.
//     Title/description are bilingual to match the rest of the public site.
// BN: HomeVideo — public home page-এর video section-এর জন্য admin-curated
//     YouTube video। youtubeUrl যেকোনো YouTube URL form গ্রহণ করে (watch?v=,
//     youtu.be/, /embed/, /shorts/); frontend render-এর সময় video ID extract
//     করে। Title/description bilingual — site-এর বাকিদের সাথে মানানসই।
const HomeVideo = sequelize.define(
  'HomeVideo',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: Pasted as-is from YouTube; frontend resolves to embed src.
    // BN: YouTube থেকে যেমন paste তেমন save; frontend embed src-এ resolve।
    youtubeUrl: { type: DataTypes.STRING(500), allowNull: false },

    title: { type: DataTypes.STRING(300), defaultValue: '' },
    titleEn: { type: DataTypes.STRING(300), defaultValue: '' },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    descriptionEn: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: Optional override — if blank, frontend uses YouTube's auto thumbnail
    //     (img.youtube.com/vi/{id}/hqdefault.jpg).
    // BN: Optional override — খালি থাকলে YouTube-এর auto thumbnail use হবে।
    thumbnailUrl: { type: DataTypes.STRING(500), defaultValue: '' },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'home_videos',
    timestamps: true,
  }
);

module.exports = HomeVideo;
