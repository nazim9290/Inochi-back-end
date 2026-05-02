const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const { listAuditLogs } = require('../controllers/auditLog');

router.get('/audit-logs', requireAuth, checkAdmin, listAuditLogs);

module.exports = router;
