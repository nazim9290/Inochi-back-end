const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const c = require('../controllers/reviews');

// EN: Public — no auth, anyone can submit + read approved reviews.
// BN: Public — auth নাই, যে কেউ submit + approved review দেখতে পারে।
router.post('/reviews', c.createReview);
router.get('/published-reviews', c.listPublishedReviews);

// EN: Admin — moderation queue.
// BN: Admin — moderation queue।
router.get('/reviews', requireAuth, checkAdmin, c.listReviews);
router.put('/reviews/:id', requireAuth, checkAdmin, c.updateReview);
router.delete('/reviews/:id', requireAuth, checkAdmin, c.deleteReview);

module.exports = router;
