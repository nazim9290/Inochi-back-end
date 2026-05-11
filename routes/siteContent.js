const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const c = require('../controllers/siteContent');

const router = express.Router();

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
