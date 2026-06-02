// route/subscriberRoute.js
const express = require("express");

const { checkAdmin } = require("../middleware/admin");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

// controllers
const { subscriber, Allsubscriber, deleteSubscriber, sendNewsletter, confirmSubscriber, cleanupUnconfirmed } = require("../controllers/subscriber");

router.post("/subscriber",  subscriber);
router.get('/subscriber/confirm/:token', confirmSubscriber);
router.get('/subscriber', requireAuth, checkAdmin, Allsubscriber);
router.delete('/subscriber/:id', requireAuth, checkAdmin, deleteSubscriber);
router.post('/newsletter-send', requireAuth, checkAdmin, sendNewsletter);
// EN: Admin housekeeping — sweep unconfirmed pending rows older than ?days.
// BN: Admin housekeeping — ?days-এর চেয়ে পুরোনো unconfirmed pending সরায়।
router.post('/subscriber/cleanup', requireAuth, checkAdmin, cleanupUnconfirmed);

module.exports = router;
