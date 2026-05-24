// EN: School email-outreach routes — directory + groups CRUD and the
//     test/send composer endpoints. Everything here is admin-only.
// BN: স্কুল email-outreach route — directory + group CRUD এবং test/send
//     composer endpoint। সবগুলো admin-only।

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const c = require('../controllers/emailOutreach');

const router = express.Router();

const admin = [requireAuth, checkAdmin];

// Directory — school contacts
router.get('/school-contacts', ...admin, c.listContacts);
router.post('/school-contacts', ...admin, c.createContact);
router.post('/school-contacts/bulk', ...admin, c.bulkCreateContacts);
router.put('/school-contacts/:id', ...admin, c.updateContact);
router.delete('/school-contacts/:id', ...admin, c.deleteContact);

// Groups
router.get('/email-groups', ...admin, c.listGroups);
router.post('/email-groups', ...admin, c.createGroup);
router.put('/email-groups/:id', ...admin, c.updateGroup);
router.delete('/email-groups/:id', ...admin, c.deleteGroup);

// Import from existing in-system lists (subscribers / contact-form leads)
router.get('/email-outreach/import-preview', ...admin, c.importPreview);
router.post('/email-outreach/import', ...admin, c.importFromSource);

// Composer — status, test, send, history
router.get('/email-outreach/status', ...admin, c.status);
router.post('/email-outreach/test', ...admin, c.sendTest);
router.post('/email-outreach/send', ...admin, c.sendCampaign);
router.get('/email-outreach/logs', ...admin, c.listLogs);

module.exports = router;
