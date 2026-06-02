/**
 * EN: LoginAttempt — one row per failed login attempt. Used to rate-limit
 *     brute-force password guessing per email. Successful login wipes the
 *     row, so the counter never grows unbounded.
 * BN: LoginAttempt — প্রতিটা failed login attempt-এ একটা row। Email-প্রতি
 *     brute-force password guessing rate-limit করতে। Successful login
 *     row delete করে, তাই counter কখনো unbounded বাড়ে না।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoginAttempt = sequelize.define(
  'LoginAttempt',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // EN: lower-cased email — match the same shape we look up users by.
    // BN: lower-case email — user lookup-এর shape-এর সাথে match।
    email: { type: DataTypes.STRING(200), allowNull: false },
    // EN: Number of consecutive failures for this email since last reset.
    // BN: Last reset-এর পর এই email-এ পর পর failure count।
    failures: { type: DataTypes.INTEGER, defaultValue: 0 },
    // EN: When the current lockout window expires (null = not locked).
    // BN: Current lockout window কখন শেষ হবে (null = locked না)।
    lockedUntil: { type: DataTypes.DATE, allowNull: true },
    // EN: Last attempt timestamp — used to age out stale counters.
    // BN: Last attempt timestamp — পুরোনো counter age out করতে।
    lastAttempt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: 'login_attempts',
    timestamps: true,
    indexes: [{ fields: ['email'], unique: true }],
  }
);

module.exports = LoginAttempt;
