const { AuditLog } = require('../models');

// EN: Fire-and-forget audit logger. Caller passes the Express req plus the
//     action context; we extract actor + IP + user-agent automatically. Never
//     awaits — a failure to log must not break the actual write.
//     Usage:
//       logAudit(req, { action: 'update', entity: 'Review', entityId: r.id,
//                       summary: `Approved review by ${r.name}`,
//                       details: { from: 'pending', to: 'approved' } });
// BN: Fire-and-forget audit logger। Caller Express req + action context
//     pass করে; আমরা actor + IP + user-agent automatically extract করি।
//     Await করি না — log fail করলেও আসল write কখনো ভাঙবে না।
function logAudit(req, { action, entity, entityId, summary, details }) {
  try {
    const actor = req?.user || {};
    const actorId = actor._id || actor.id || null;
    const actorName = actor.name || actor.email || '';
    const ip = req?.clientIp || req?.ip || req?.headers?.['x-forwarded-for'] || '';
    const userAgent = String(req?.headers?.['user-agent'] || '').slice(0, 300);

    AuditLog.create({
      actorId,
      actorName,
      action,
      entity,
      entityId: entityId ? String(entityId).slice(0, 60) : '',
      summary: (summary || '').slice(0, 300),
      details: details || null,
      ip: String(ip).slice(0, 64),
      userAgent,
    }).catch((err) => {
      console.error('AuditLog write failed:', err.message);
    });
  } catch (err) {
    console.error('AuditLog helper error:', err.message);
  }
}

module.exports = { logAudit };
