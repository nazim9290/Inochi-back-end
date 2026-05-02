const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// EN: Append-only record of admin actions. Captures who did what, on which
//     entity, and a small detail blob (e.g. status change before→after, or
//     the entity name being deleted). Indexes on entity + actorId so the
//     timeline + per-actor filter stay fast as the table grows.
// BN: Admin action-এর append-only record। কে কী করল, কোন entity-তে, ছোট
//     detail blob (যেমন status change before→after, বা delete হওয়া
//     entity-র নাম)। entity + actorId-তে index — table বড় হলেও timeline ও
//     per-actor filter fast থাকবে।
const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    actorId: { type: DataTypes.UUID, allowNull: true },
    actorName: { type: DataTypes.STRING(150), defaultValue: '' },
    action: { type: DataTypes.STRING(40), allowNull: false }, // create | update | delete | publish | login etc.
    entity: { type: DataTypes.STRING(60), allowNull: false }, // Review, Application, User, ...
    entityId: { type: DataTypes.STRING(60), defaultValue: '' },
    summary: { type: DataTypes.STRING(300), defaultValue: '' }, // human-readable one-liner
    details: { type: DataTypes.JSONB, defaultValue: null },
    ip: { type: DataTypes.STRING(64), defaultValue: '' },
    userAgent: { type: DataTypes.STRING(300), defaultValue: '' },
  },
  {
    tableName: 'audit_logs',
    timestamps: true,
    indexes: [
      { fields: ['entity', 'created_at'] },
      { fields: ['actor_id'] },
    ],
  }
);

module.exports = AuditLog;
