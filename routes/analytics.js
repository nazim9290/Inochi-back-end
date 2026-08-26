/**
 * EN: Analytics read-only routes — all require auth + admin. Mounted under /api.
 *     Visitor numbers are not public information, so nothing here is open.
 * BN: Analytics-এর শুধু-পড়ার route — সব requireAuth + checkAdmin। /api-এ
 *     mounted। Visitor সংখ্যা public তথ্য নয়, তাই এখানে কিছুই খোলা নেই।
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const c = require('../controllers/analytics');

const admin = [requireAuth, checkAdmin];

router.get('/analytics/countries', ...admin, c.getCountryVisitors);

module.exports = router;
