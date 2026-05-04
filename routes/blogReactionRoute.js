/**
 * EN: Reactions on blog posts. GET is public + optional auth (so it returns
 *     "your own reaction" if you're logged in). POST requires auth.
 * BN: Blog post-এর reaction। GET public + optional auth (logged-in হলে
 *     "আপনার নিজের reaction" return করে)। POST-এর জন্য auth required।
 */

const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/optionalAuth');
const { getReactions, setReaction } = require('../controllers/reactionController');

router.get('/blogs/:id/reactions', optionalAuth, getReactions);
router.post('/blogs/:id/reactions', requireAuth, setReaction);

module.exports = router;
