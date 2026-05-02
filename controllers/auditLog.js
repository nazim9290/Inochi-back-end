const { AuditLog } = require('../models');
const { Op } = require('sequelize');

// EN: List recent audit log entries with optional filters. Paginated by
//     ?limit + ?offset. Filters: ?entity, ?actorId, ?action, ?q (text match
//     against summary). Sorted newest-first.
// BN: Recent audit log entry list, optional filter সহ। ?limit + ?offset
//     দিয়ে paginate। Filter: ?entity, ?actorId, ?action, ?q (summary-তে
//     text match)। Newest-first sort।
exports.listAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const where = {};
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.actorId) where.actorId = req.query.actorId;
    if (req.query.action) where.action = req.query.action;
    if (req.query.q) where.summary = { [Op.iLike]: `%${req.query.q}%` };

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    res.json({ logs: rows, total: count, limit, offset });
  } catch (err) {
    console.error('Error listing audit logs:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
