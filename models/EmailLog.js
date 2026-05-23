/**
 * EN: EmailLog — an audit record of every outreach send (and test). Lets the
 *     admin see what was sent, to how many, when, and how many failed. Stores
 *     the rendered subject + body so a campaign can be reviewed or re-used.
 * BN: EmailLog — প্রতিটা outreach send (এবং test)-এর audit record। admin
 *     দেখতে পারে কী পাঠানো হয়েছে, কতজনকে, কখন, কতগুলো fail। rendered
 *     subject + body রাখে যাতে campaign পর্যালোচনা/পুনঃব্যবহার করা যায়।
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmailLog = sequelize.define(
  'EmailLog',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    subject: { type: DataTypes.STRING(300), defaultValue: '' },
    bodyHtml: { type: DataTypes.TEXT, defaultValue: '' },

    // EN: How recipients were chosen: 'test' | 'group' | 'single' | 'selected'.
    // BN: প্রাপক কীভাবে বাছা হলো: 'test' | 'group' | 'single' | 'selected'।
    mode: { type: DataTypes.STRING(20), defaultValue: '' },

    // EN: Group name when mode === 'group' (blank otherwise).
    // BN: mode === 'group' হলে group-এর নাম (নয়তো খালি)।
    groupName: { type: DataTypes.STRING(120), defaultValue: '' },

    recipientsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    sentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    failedCount: { type: DataTypes.INTEGER, defaultValue: 0 },

    // EN: Array of { email, reason } for recipients that failed.
    // BN: যেসব প্রাপকে fail করেছে তাদের { email, reason }-এর array।
    failedEmails: { type: DataTypes.JSONB, defaultValue: [] },

    replyTo: { type: DataTypes.STRING(200), defaultValue: '' },

    // EN: Admin user id who triggered the send (plain id, no FK to stay simple).
    // BN: যে admin send করেছে তার user id (plain id, simple রাখতে FK নেই)।
    sentBy: { type: DataTypes.STRING(120), defaultValue: '' },

    // EN: 'sent' | 'partial' | 'failed' | 'test'.
    // BN: 'sent' | 'partial' | 'failed' | 'test'।
    status: { type: DataTypes.STRING(20), defaultValue: '' },
  },
  {
    tableName: 'email_logs',
    timestamps: true,
  }
);

module.exports = EmailLog;
