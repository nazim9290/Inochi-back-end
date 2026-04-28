// EN: Brand — partner school / university Inochi has placed students into.
//     Renders as a logo strip on the public site (homepage + /partner-schools).
//     `image` is the standard {url, public_id} blob; `featured` controls whether
//     the brand shows up on the home strip vs. only on the dedicated page.
// BN: Brand — partner school / university যেখানে Inochi student placement
//     করেছে। Public site-এ logo strip হিসেবে দেখায় (homepage + /partner-schools)।
//     `image` standard {url, public_id} blob; `featured` flag কেবল home
//     strip-এ দেখাবে নাকি শুধু dedicated page-এ দেখাবে সেটা control করে।
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Brand = sequelize.define(
  'Brand',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    image: { type: DataTypes.JSONB, defaultValue: null },
    name: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Untitled' },
    nameJa: { type: DataTypes.STRING, defaultValue: '' },
    city: { type: DataTypes.STRING, defaultValue: '' },
    websiteUrl: { type: DataTypes.STRING(500), defaultValue: '' },
    partnerSince: { type: DataTypes.INTEGER, defaultValue: null },
    featured: { type: DataTypes.BOOLEAN, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'brands',
    timestamps: true,
  }
);

module.exports = Brand;
