/**
 * EN: /api/me/* — endpoints scoped to the logged-in user. Powers the public-
 *     site /account dashboard. requireAuth on every route.
 * BN: /api/me/* — logged-in user-এর scoped endpoint। Public-site /account
 *     dashboard চালায়। প্রতিটা route-এ requireAuth।
 */

const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const m = require('../controllers/meController');

// Profile
router.get('/me/profile', requireAuth, m.getProfile);
router.put('/me/profile', requireAuth, m.updateProfile);
router.put('/me/password', requireAuth, m.changePassword);

// Lists
router.get('/me/applications', requireAuth, m.listApplications);
router.get('/me/bookmarks', requireAuth, m.listBookmarks);
router.get('/me/comments', requireAuth, m.listComments);

// Bookmark toggle (per-blog path)
router.get('/blogs/:id/bookmark', requireAuth, m.getBookmarkStatus);
router.post('/blogs/:id/bookmark', requireAuth, m.addBookmark);
router.delete('/blogs/:id/bookmark', requireAuth, m.removeBookmark);

module.exports = router;
