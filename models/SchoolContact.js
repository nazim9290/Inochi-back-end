/**
 * EN: SchoolContact — the email directory of partner / known schools the
 *     admin sends outreach to. One row per email address. A contact can
 *     belong to several groups (e.g. "Tokyo schools", "Language schools")
 *     via the `groups` JSONB array, so the admin can send to a whole group
 *     or to a single school. `active=false` keeps a record without mailing it.
 *     Personalization tokens in the email body ({{school}}, {{name}}, {{city}})
 *     are filled from these columns at send time.
 * BN: SchoolContact — admin যেসব পরিচিত/partner স্কুলে outreach মেইল পাঠায়
 *     তাদের email directory। প্রতি email-এ একটা row। একটা contact একাধিক
 *     group-এ থাকতে পারে (যেমন "Tokyo schools", "Language schools") —
 *     `groups` JSONB array দিয়ে — তাই পুরো group-এ বা single স্কুলে পাঠানো
 *     যায়। `active=false` রাখলে record থাকে কিন্তু মেইল যায় না। মেইল বডির
 *     personalization token ({{school}}, {{name}}, {{city}}) send-এর সময় এই
 *     column থেকে ভরা হয়।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SchoolContact = sequelize.define(
  'SchoolContact',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    // EN: School / institution name — also the {{school}} personalization token.
    // BN: স্কুল/প্রতিষ্ঠানের নাম — {{school}} personalization token-ও।
    schoolName: { type: DataTypes.STRING(200), allowNull: false },

    // EN: Optional contact person at the school — the {{name}} token.
    // BN: স্কুলের optional যোগাযোগ ব্যক্তি — {{name}} token।
    contactName: { type: DataTypes.STRING(150), defaultValue: '' },

    // EN: Destination email address (required).
    // BN: গন্তব্য email ঠিকানা (আবশ্যক)।
    email: { type: DataTypes.STRING(200), allowNull: false },

    city: { type: DataTypes.STRING(120), defaultValue: '' },
    country: { type: DataTypes.STRING(120), defaultValue: '' },

    // EN: Group names this contact belongs to — JSONB array of strings that
    //     reference EmailGroup.name. Send-to-group filters on this.
    // BN: এই contact যেসব group-এ আছে — string-এর JSONB array, EmailGroup.name
    //     reference করে। Send-to-group এর উপর filter করে।
    groups: { type: DataTypes.JSONB, defaultValue: [] },

    notes: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: Inactive contacts are kept but skipped when sending.
    // BN: Inactive contact রাখা হয় কিন্তু পাঠানোর সময় বাদ যায়।
    active: { type: DataTypes.BOOLEAN, defaultValue: true },

    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: 'school_contacts',
    timestamps: true,
  }
);

module.exports = SchoolContact;
