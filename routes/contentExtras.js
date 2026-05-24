// EN: Routes for the four newly admin-editable content sections. Public GET
//     (reshaped) + admin POST/PUT/DELETE. Router-level IndexNow auto-ping
//     re-crawls the matching public page on a successful mutation.
// BN: চারটি নতুন admin-editable section-এর route। Public GET (reshaped) +
//     admin POST/PUT/DELETE। Router-level IndexNow auto-ping সফল mutation-এ
//     সংশ্লিষ্ট public page re-crawl করায়।

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const c = require('../controllers/contentExtras');
const indexnow = require('../helpers/indexnow');

const router = express.Router();

router.use(
  indexnow.autoPing({
    glossary: { paths: ['/glossary'] },
    'university-rankings': { paths: ['/university-rankings'] },
    press: { paths: ['/press'] },
    community: { paths: ['/community'] },
  })
);

const admin = [requireAuth, checkAdmin];

// Glossary
router.get('/glossary', c.listGlossary);
router.post('/glossary', ...admin, c.createGlossary);
router.put('/glossary/:id', ...admin, c.updateGlossary);
router.delete('/glossary/:id', ...admin, c.deleteGlossary);

// University rankings
router.get('/university-rankings', c.listRankings);
router.post('/university-rankings', ...admin, c.createRanking);
router.put('/university-rankings/:id', ...admin, c.updateRanking);
router.delete('/university-rankings/:id', ...admin, c.deleteRanking);

// Press mentions
router.get('/press', c.listPress);
router.post('/press', ...admin, c.createPress);
router.put('/press/:id', ...admin, c.updatePress);
router.delete('/press/:id', ...admin, c.deletePress);

// Community channels
router.get('/community', c.listCommunity);
router.post('/community', ...admin, c.createCommunity);
router.put('/community/:id', ...admin, c.updateCommunity);
router.delete('/community/:id', ...admin, c.deleteCommunity);

module.exports = router;
