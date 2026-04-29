const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const c = require('../controllers/users');

// EN: Admin-only user management. Self-signup still goes through
//     /register in userRoute.js — these endpoints are for the dashboard.
// BN: Admin-only user management। Self-signup এখনো userRoute.js-এর
//     /register দিয়ে — এই endpoint-গুলো dashboard-এর জন্য।
router.get('/users', requireAuth, checkAdmin, c.listUsers);
router.post('/users', requireAuth, checkAdmin, c.createUserByAdmin);
router.put('/users/:id', requireAuth, checkAdmin, c.updateUserByAdmin);
router.delete('/users/:id', requireAuth, checkAdmin, c.deleteUserByAdmin);

module.exports = router;
