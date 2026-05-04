// EN: Application routes — public POST + admin-protected list/detail/update/delete.
// BN: Application route — public POST + admin-protected list/detail/update/delete।
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/optionalAuth');
const { checkAdmin } = require('../middleware/admin');
const c = require('../controllers/applications');

const router = express.Router();

// EN: Public POST — accepts anonymous submissions, but if the visitor sent
//     a Bearer token we link the application to their user via optionalAuth.
// BN: Public POST — anonymous submission accept; visitor Bearer token পাঠালে
//     optionalAuth দিয়ে user-এর সাথে application link করা হয়।
router.post('/applications', optionalAuth, c.createApplication);

router.get('/applications', requireAuth, checkAdmin, c.listApplications);
router.get('/applications/:id', requireAuth, checkAdmin, c.getApplication);
router.put('/applications/:id', requireAuth, checkAdmin, c.updateApplication);
router.delete('/applications/:id', requireAuth, checkAdmin, c.deleteApplication);

module.exports = router;
