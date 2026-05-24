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
    'jlpt-sessions': { paths: ['/jlpt-calendar'] },
    'visa-interview': { paths: ['/visa-interview'] },
    'quiz-questions': { paths: ['/eligibility'] },
    'quiz-tiers': { paths: ['/eligibility'] },
    'mock-tests': { paths: ['/jlpt-mock-test'] },
    'mock-questions': { paths: ['/jlpt-mock-test'] },
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

// JLPT exam sessions (/jlpt-calendar)
router.get('/jlpt-sessions', c.listSessions);
router.post('/jlpt-sessions', ...admin, c.createSession);
router.put('/jlpt-sessions/:id', ...admin, c.updateSession);
router.delete('/jlpt-sessions/:id', ...admin, c.deleteSession);

// Visa interview prep (/visa-interview)
router.get('/visa-interview', c.listVisaInterview);
router.post('/visa-interview', ...admin, c.createVisaItem);
router.put('/visa-interview/:id', ...admin, c.updateVisaItem);
router.delete('/visa-interview/:id', ...admin, c.deleteVisaItem);

// Eligibility quiz (/eligibility) — combined public payload + admin CRUD
router.get('/eligibility-quiz', c.getEligibilityQuiz);
router.get('/quiz-questions', ...admin, c.listQuizQuestions);
router.post('/quiz-questions', ...admin, c.createQuizQuestion);
router.put('/quiz-questions/:id', ...admin, c.updateQuizQuestion);
router.delete('/quiz-questions/:id', ...admin, c.deleteQuizQuestion);
router.get('/quiz-tiers', ...admin, c.listQuizTiers);
router.post('/quiz-tiers', ...admin, c.createQuizTier);
router.put('/quiz-tiers/:id', ...admin, c.updateQuizTier);
router.delete('/quiz-tiers/:id', ...admin, c.deleteQuizTier);

// JLPT mock test (/jlpt-mock-test) — combined public payload + admin CRUD
router.get('/mock-test', c.getMockTest);
router.get('/mock-tests', ...admin, c.listMockTests);
router.post('/mock-tests', ...admin, c.createMockTest);
router.put('/mock-tests/:id', ...admin, c.updateMockTest);
router.delete('/mock-tests/:id', ...admin, c.deleteMockTest);
router.get('/mock-questions', ...admin, c.listMockQuestions);
router.post('/mock-questions', ...admin, c.createMockQuestion);
router.put('/mock-questions/:id', ...admin, c.updateMockQuestion);
router.delete('/mock-questions/:id', ...admin, c.deleteMockQuestion);

module.exports = router;
