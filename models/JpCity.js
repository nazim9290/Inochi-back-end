/**
 * EN: JpCity — Japan-side city guides for Bangladeshi students. Drives
 *     /japan-cities (list) and /japan-cities/<slug> (detail) on the public
 *     site. Captures the practical numbers a student weighs city-to-city:
 *     monthly living cost, rent, part-time wage, transport pass, climate,
 *     top language schools, lifestyle highlights, trade-offs.
 *
 *     Multilingual fields follow the project convention: <field> = Bangla
 *     primary, <field>En = English mirror. For city name, tagline, climate
 *     we ALSO carry a Japanese variant (<field>Ja) — Japanese parents
 *     reading the page will recognise 東京 / 大阪, English fallback is
 *     ugly. Free-form numeric strings (monthlyLiving etc.) stay flat —
 *     admin types them as a single human-readable string per row.
 *
 *     Array-shaped fields (topSchools, highlights, tradeOffs) live in JSONB.
 *     Controller reshapes rows into the legacy {bn,en,ja} object shape so
 *     the existing Next.js page renderer doesn't need to change.
 *
 * BN: JpCity — বাংলাদেশি ছাত্রদের জন্য জাপান-পক্ষের শহর গাইড।
 *     /japan-cities (list) এবং /japan-cities/<slug> (detail) public পেজ
 *     চালায়। শহর-তুলনায় ছাত্রদের যেসব practical number দেখা লাগে — মাসিক
 *     খরচ, ভাড়া, পার্ট-টাইম মজুরি, transport pass, জলবায়ু, top
 *     ল্যাঙ্গুয়েজ স্কুল, lifestyle highlight, trade-off — সব ধরে রাখে।
 *
 *     Multilingual field-এ project convention: <field> = Bangla primary,
 *     <field>En = English mirror। শহরের নাম, tagline, climate-এ Japanese
 *     variant (<field>Ja)-ও — Japanese অভিভাবকরা 東京 / 大阪 চিনবেন,
 *     English fallback বিচ্ছিরি। Free-form numeric string (monthlyLiving
 *     ইত্যাদি) flat — admin row-প্রতি একটামাত্র human-readable string লেখেন।
 *
 *     Array-shaped field (topSchools, highlights, tradeOffs) JSONB-এ।
 *     Controller row-গুলোকে legacy {bn,en,ja} object shape-এ reshape করে
 *     — existing Next.js page renderer পাল্টানোর দরকার নেই।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JpCity = sequelize.define(
  'JpCity',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },

    // EN: City name in three languages.
    // BN: শহরের নাম তিন ভাষায়।
    name: { type: DataTypes.STRING(120), allowNull: false },
    nameEn: { type: DataTypes.STRING(120), defaultValue: '' },
    nameJa: { type: DataTypes.STRING(120), defaultValue: '' },

    // EN: Kanji used as a decorative chip on the card.
    // BN: কার্ডে decorative chip হিসেবে kanji।
    kanji: { type: DataTypes.STRING(8), defaultValue: '' },

    // EN: Short tagline trio.
    // BN: ছোট tagline trio।
    tagline: { type: DataTypes.TEXT, defaultValue: '' },
    taglineEn: { type: DataTypes.TEXT, defaultValue: '' },
    taglineJa: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: Practical numeric strings — admin types as single readable line.
    //     Stored verbatim so admins can localise currency/format freely
    //     (e.g. "৳1,30,000 – 1,80,000" or "$900 – 1,200").
    // BN: Practical numeric string — admin একটামাত্র readable line হিসেবে
    //     লেখেন। যেমনটা টাইপ করা হয় তেমনই save — admin currency/format
    //     নিজের মত localise করতে পারে।
    monthlyLiving: { type: DataTypes.STRING(80), defaultValue: '' },
    monthlyRent: { type: DataTypes.STRING(80), defaultValue: '' },
    partTimeWage: { type: DataTypes.STRING(80), defaultValue: '' },
    transportPass: { type: DataTypes.STRING(80), defaultValue: '' },

    // EN: Climate description trio.
    // BN: জলবায়ুর বিবরণ trio।
    climate: { type: DataTypes.TEXT, defaultValue: '' },
    climateEn: { type: DataTypes.TEXT, defaultValue: '' },
    climateJa: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: Hero image — Cloudinary URL.
    // BN: Hero image — Cloudinary URL।
    heroImage: { type: DataTypes.STRING(500), defaultValue: '' },

    // EN: Plain string array of language-school names.
    // BN: ল্যাঙ্গুয়েজ স্কুলের নামের plain string array।
    topSchools: { type: DataTypes.JSONB, defaultValue: [] },

    // EN: Highlights — JSONB array of {bn, en, ja}.
    // BN: Highlights — {bn, en, ja}-এর JSONB array।
    highlights: { type: DataTypes.JSONB, defaultValue: [] },

    // EN: Trade-offs — same shape as highlights, rendered as caveats.
    // BN: Trade-off — highlights-এর মত, caveat হিসেবে দেখানো।
    tradeOffs: { type: DataTypes.JSONB, defaultValue: [] },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'jp_cities',
    timestamps: true,
  }
);

module.exports = JpCity;
