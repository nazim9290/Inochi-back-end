// EN: Branch — physical office location (city, address, phones). Bangla is the
//     primary language; English mirrors live in *En suffixed columns. Phones
//     are stored as a JSONB array so admins can add/remove without schema
//     changes. The slug doubles as the public URL segment when we later add
//     /branches/<slug> deep links.
// BN: Branch — physical office (city, address, phone)। Bangla primary;
//     English-এর copy *En suffix-এ। Phones JSONB array — admin schema বদল
//     ছাড়াই যোগ/বিয়োগ করতে পারে। Slug পরবর্তীতে /branches/<slug> deep
//     link হিসেবেও কাজ করবে।
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Branch = sequelize.define(
  'Branch',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    city: { type: DataTypes.STRING, allowNull: false },
    cityBn: { type: DataTypes.STRING, defaultValue: '' },
    // EN: Optional Japanese — Japan-side parents see katakana city names.
    // BN: Optional Japanese — Japan-পক্ষের অভিভাবক katakana শহরের নাম দেখেন।
    cityJa: { type: DataTypes.STRING, defaultValue: '' },
    address: { type: DataTypes.TEXT, defaultValue: '' },
    addressBn: { type: DataTypes.TEXT, defaultValue: '' },
    addressJa: { type: DataTypes.TEXT, defaultValue: '' },
    // EN: Phones — array of strings, e.g. ["+880 1784-889646", "+880 1896-214840"].
    // BN: Phone-এর array — যেমন ["+880 1784-889646", "+880 1896-214840"]।
    phones: { type: DataTypes.JSONB, defaultValue: [] },
    mapEmbedUrl: { type: DataTypes.STRING(500), defaultValue: '' },
    isHeadOffice: { type: DataTypes.BOOLEAN, defaultValue: false },
    isJapanOffice: { type: DataTypes.BOOLEAN, defaultValue: false },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'branches',
    timestamps: true,
  }
);

module.exports = Branch;
