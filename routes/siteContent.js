const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const c = require('../controllers/siteContent');
const indexnow = require('../helpers/indexnow');

const router = express.Router();

// EN: IndexNow auto-ping map. Keyed by the first route segment (e.g. a
//     request to "/bd-cities/:id" → key "bd-cities"). On a successful POST/
//     PUT/DELETE, the matching public listing path(s) are pinged, plus a
//     detail path built from the response body where the page exists.
// BN: IndexNow auto-ping map। Route-এর প্রথম segment দিয়ে keyed (যেমন
//     "/bd-cities/:id" request → key "bd-cities")। সফল POST/PUT/DELETE-এ
//     সংশ্লিষ্ট public listing path ping হয়, এবং detail page থাকলে response
//     body থেকে detail path-ও।
const PING_MAP = {
  'site-settings': { paths: ['/', '/contact', '/about'] },
  'how-it-works': { paths: ['/pathway'] },
  'jlpt-courses': { paths: ['/learn'] },
  'success-stories': {
    paths: ['/success'],
    detail: (b) => (b && b.story && b.story.id ? `/success/${b.story.id}` : null),
  },
  faqs: { paths: ['/faq'] },
  branches: {
    paths: ['/about/branches'],
    detail: (b) => (b && b.branch && b.branch.slug ? `/branches/${b.branch.slug}` : null),
  },
  achievements: {
    paths: ['/achievements'],
    detail: (b) => (b && b.achievement && b.achievement.id ? `/achievements/${b.achievement.id}` : null),
  },
  'home-videos': { paths: ['/'] },
  'agency-moments': { paths: ['/'] },
  'bd-cities': {
    paths: ['/study-from'],
    detail: (b) => (b && b.city && b.city.slug ? `/study-from/${b.city.slug}` : null),
  },
  'jp-cities': {
    paths: ['/japan-cities'],
    detail: (b) => (b && b.city && b.city.slug ? `/japan-cities/${b.city.slug}` : null),
  },
  events: { paths: ['/events'] },
  checklist: { paths: ['/document-checklist'] },
  'scam-items': { paths: ['/anti-scam'] },
};

// EN: Runs for every route on this router; skips GET internally, pings only
//     on successful mutations. Placed before route defs so it wraps them all.
// BN: এই router-এর প্রতিটা route-এ চলে; ভেতরে GET skip করে, শুধু সফল
//     mutation-এ ping। Route def-এর আগে রাখা যাতে সব wrap করে।
router.use(indexnow.autoPing(PING_MAP));

// Public reads
router.get('/site-settings', c.getSiteSettings);
router.get('/how-it-works', c.listSteps);
router.get('/jlpt-courses', c.listCourses);
router.get('/success-stories', c.listStories);
router.get('/faqs', c.listFaqs);
router.get('/branches', c.listBranches);
router.get('/achievements', c.listAchievements);
router.get('/home-videos', c.listHomeVideos);
router.get('/agency-moments', c.listAgencyMoments);
router.get('/bd-cities', c.listBdCities);
router.get('/bd-cities/:slug', c.getBdCity);
router.get('/jp-cities', c.listJpCities);
router.get('/jp-cities/:slug', c.getJpCity);
router.get('/events', c.listEvents);
router.get('/checklist', c.listChecklist);
router.get('/scam-items', c.listScamItems);

// Admin writes
router.put('/site-settings', requireAuth, checkAdmin, c.updateSiteSettings);

router.post('/how-it-works', requireAuth, checkAdmin, c.createStep);
router.put('/how-it-works/:id', requireAuth, checkAdmin, c.updateStep);
router.delete('/how-it-works/:id', requireAuth, checkAdmin, c.deleteStep);

router.post('/jlpt-courses', requireAuth, checkAdmin, c.createCourse);
router.put('/jlpt-courses/:id', requireAuth, checkAdmin, c.updateCourse);
router.delete('/jlpt-courses/:id', requireAuth, checkAdmin, c.deleteCourse);

router.post('/success-stories', requireAuth, checkAdmin, c.createStory);
router.put('/success-stories/:id', requireAuth, checkAdmin, c.updateStory);
router.delete('/success-stories/:id', requireAuth, checkAdmin, c.deleteStory);

router.post('/faqs', requireAuth, checkAdmin, c.createFaq);
router.put('/faqs/:id', requireAuth, checkAdmin, c.updateFaq);
router.delete('/faqs/:id', requireAuth, checkAdmin, c.deleteFaq);

router.post('/branches', requireAuth, checkAdmin, c.createBranch);
router.put('/branches/:id', requireAuth, checkAdmin, c.updateBranch);
router.delete('/branches/:id', requireAuth, checkAdmin, c.deleteBranch);

router.post('/achievements', requireAuth, checkAdmin, c.createAchievement);
router.put('/achievements/:id', requireAuth, checkAdmin, c.updateAchievement);
router.delete('/achievements/:id', requireAuth, checkAdmin, c.deleteAchievement);

router.post('/home-videos', requireAuth, checkAdmin, c.createHomeVideo);
router.put('/home-videos/:id', requireAuth, checkAdmin, c.updateHomeVideo);
router.delete('/home-videos/:id', requireAuth, checkAdmin, c.deleteHomeVideo);

router.post('/agency-moments', requireAuth, checkAdmin, c.createAgencyMoment);
router.put('/agency-moments/:id', requireAuth, checkAdmin, c.updateAgencyMoment);
router.delete('/agency-moments/:id', requireAuth, checkAdmin, c.deleteAgencyMoment);

router.post('/bd-cities', requireAuth, checkAdmin, c.createBdCity);
router.put('/bd-cities/:id', requireAuth, checkAdmin, c.updateBdCity);
router.delete('/bd-cities/:id', requireAuth, checkAdmin, c.deleteBdCity);

router.post('/jp-cities', requireAuth, checkAdmin, c.createJpCity);
router.put('/jp-cities/:id', requireAuth, checkAdmin, c.updateJpCity);
router.delete('/jp-cities/:id', requireAuth, checkAdmin, c.deleteJpCity);

router.post('/events', requireAuth, checkAdmin, c.createEvent);
router.put('/events/:id', requireAuth, checkAdmin, c.updateEvent);
router.delete('/events/:id', requireAuth, checkAdmin, c.deleteEvent);

router.post('/checklist', requireAuth, checkAdmin, c.createChecklistItem);
router.put('/checklist/:id', requireAuth, checkAdmin, c.updateChecklistItem);
router.delete('/checklist/:id', requireAuth, checkAdmin, c.deleteChecklistItem);

router.post('/scam-items', requireAuth, checkAdmin, c.createScamItem);
router.put('/scam-items/:id', requireAuth, checkAdmin, c.updateScamItem);
router.delete('/scam-items/:id', requireAuth, checkAdmin, c.deleteScamItem);

module.exports = router;
