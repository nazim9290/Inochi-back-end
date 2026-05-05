const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscriber = sequelize.define(
  'Subscriber',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue('email', String(value).trim().toLowerCase());
      },
    },
    // EN: confirmedAt = null until the visitor clicks the confirm link in the
    //     verification email. sendNewsletter only delivers to confirmed rows.
    // BN: confirmedAt = null যতক্ষণ না visitor confirm-link click করে।
    //     sendNewsletter শুধু confirmed row-এ পাঠায়।
    confirmedAt: { type: DataTypes.DATE, allowNull: true },
    // EN: One-time confirmation token. Cleared after use so the link can't
    //     be reused. Indexed for fast lookup on confirm.
    // BN: One-time confirmation token। ব্যবহারের পর clear — link পুনরায়
    //     ব্যবহারযোগ্য না। দ্রুত lookup-এর জন্য index।
    confirmToken: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: 'subscribers',
    timestamps: true,
    indexes: [{ fields: ['confirmToken'] }],
  }
);

module.exports = Subscriber;
