/**
 * EN: Blog comments. Public list (approved only). Auth-required create,
 *     edit, delete (own comment, or admin override). Admin moderation under
 *     /admin/comments.
 * BN: Blog comment। Public list (শুধু approved)। Create/edit/delete-এর জন্য
 *     auth দরকার (নিজের comment বা admin override)। Admin moderation
 *     /admin/comments-এ।
 */

const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const ctrl = require('../controllers/commentController');

// Public
router.get('/blogs/:id/comments', ctrl.listPublic);

// Auth — own comments
router.post('/blogs/:id/comments', requireAuth, ctrl.create);
router.put('/comments/:id', requireAuth, ctrl.update);
router.delete('/comments/:id', requireAuth, ctrl.remove);

// Admin moderation
router.get('/admin/comments', requireAuth, checkAdmin, ctrl.adminList);
router.get('/admin/comments/counts', requireAuth, checkAdmin, ctrl.adminCounts);
router.put('/admin/comments/:id/status', requireAuth, checkAdmin, ctrl.adminSetStatus);

module.exports = router;
