// EN: Application routes — public POST + admin-protected list/detail/update/delete.
// BN: Application route — public POST + admin-protected list/detail/update/delete।
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const c = require('../controllers/applications');

const router = express.Router();

router.post('/applications', c.createApplication);

router.get('/applications', requireAuth, checkAdmin, c.listApplications);
router.get('/applications/:id', requireAuth, checkAdmin, c.getApplication);
router.put('/applications/:id', requireAuth, checkAdmin, c.updateApplication);
router.delete('/applications/:id', requireAuth, checkAdmin, c.deleteApplication);

module.exports = router;
