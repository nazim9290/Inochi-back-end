/**
 * EN: AI blog admin routes — all require auth + admin. Mounted under /api.
 * BN: AI blog admin route — সব requireAuth + checkAdmin। /api-এ mounted।
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const c = require('../controllers/aiBlog');

const admin = [requireAuth, checkAdmin];

router.get('/ai-blog/status', ...admin, c.status);
router.get('/ai-blog/queue', ...admin, c.listQueue);
router.post('/ai-blog/queue', ...admin, c.addQueueItem);
router.delete('/ai-blog/queue/:id', ...admin, c.deleteQueueItem);
router.get('/ai-blog/runs', ...admin, c.listRuns);
router.post('/ai-blog/run', ...admin, c.triggerManual);

module.exports = router;
