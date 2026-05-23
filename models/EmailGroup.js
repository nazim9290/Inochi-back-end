/**
 * EN: EmailGroup — the canonical list of mailing groups the admin can target
 *     (e.g. "Tokyo schools", "Language schools", "Universities"). A
 *     SchoolContact references a group by its name in its `groups` array.
 *     Keeping groups in their own table means a group can exist (and show in
 *     the "send to group" dropdown) even before any contact is assigned to it.
 * BN: EmailGroup — admin যেসব mailing group-এ পাঠাতে পারে তার canonical
 *     তালিকা (যেমন "Tokyo schools", "Language schools", "Universities")।
 *     SchoolContact তার `groups` array-তে নাম দিয়ে group reference করে।
 *     আলাদা table-এ রাখায় কোনো contact assign না হলেও group থাকতে পারে
 *     (এবং "send to group" dropdown-এ দেখায়)।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmailGroup = sequelize.define(
  'EmailGroup',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(300), defaultValue: '' },
  },
  {
    tableName: 'email_groups',
    timestamps: true,
  }
);

module.exports = EmailGroup;
