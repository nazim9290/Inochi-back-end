const express = require('express');
const router = express.Router();
const { contact, getAllContact, changeAnswerStatus, singleContact, deleteContact } = require('../controllers/UserContact');
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');

// EN: Public endpoint — visitors fill the lead form on the public site.
// BN: Public endpoint — visitor public site-এর lead form fill করে।
router.post('/contact', contact);

// EN: Admin-only — list / view / mark-answered / delete inbox entries.
//     getAllContact previously had no auth; tightened to admin since these
//     contain visitor PII (email/phone).
// BN: শুধু admin — inbox entry list / দেখা / mark-answered / delete।
//     getAllContact-এ আগে কোনো auth ছিল না; visitor PII (email/phone)
//     থাকায় admin-only-তে tighten করা হয়েছে।
router.get('/all-contact-request', requireAuth, checkAdmin, getAllContact);
router.get('/single-contact/:id', requireAuth, checkAdmin, singleContact);
router.put('/answare-contact/:id', requireAuth, checkAdmin, changeAnswerStatus);
router.delete('/contact/:id', requireAuth, checkAdmin, deleteContact);

module.exports = router;
