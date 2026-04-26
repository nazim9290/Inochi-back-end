// route/subscriberRoute.js
const express = require("express");

const { checkAdmin } = require("../middleware/admin");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

// controllers
const { subscriber, Allsubscriber } = require("../controllers/subscriber");

router.post("/subscriber",  subscriber);
router.get('/subscriber', requireAuth, checkAdmin, Allsubscriber);

module.exports = router;
