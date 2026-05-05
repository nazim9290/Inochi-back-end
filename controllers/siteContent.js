const {
  SiteSettings,
  HowItWorksStep,
  JlptCourse,
  SuccessStory,
  Faq,
  Branch,
  Achievement,
  HomeVideo,
  AgencyMoment,
} = require('../models');
const { logAudit } = require('../helpers/audit');

// ---------------- SITE SETTINGS (singleton) ----------------

exports.getSiteSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create({});
    }
    res.json({ settings });
  } catch (err) {
    console.error('Error fetching site settings:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateSiteSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create(req.body || {});
    } else {
      await settings.update(req.body || {});
    }
    logAudit(req, {
      action: 'update',
      entity: 'SiteSettings',
      entityId: settings.id,
      summary: `Site settings updated (${Object.keys(req.body || {}).length} fields)`,
      details: { fields: Object.keys(req.body || {}) },
    });
    res.json({ message: 'Site settings updated', settings });
  } catch (err) {
    console.error('Error updating site settings:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- HOW IT WORKS ----------------

exports.listSteps = async (req, res) => {
  try {
    const steps = await HowItWorksStep.findAll({ order: [['stepNumber', 'ASC']] });
    res.json({ steps });
  } catch (err) {
    console.error('Error listing steps:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createStep = async (req, res) => {
  try {
    const step = await HowItWorksStep.create(req.body);
    res.status(201).json({ message: 'Step created', step });
  } catch (err) {
    console.error('Error creating step:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateStep = async (req, res) => {
  try {
    const step = await HowItWorksStep.findByPk(req.params.id);
    if (!step) return res.status(404).json({ error: 'Step not found' });
    await step.update(req.body);
    res.json({ message: 'Step updated', step });
  } catch (err) {
    console.error('Error updating step:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteStep = async (req, res) => {
  try {
    const deleted = await HowItWorksStep.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Step not found' });
    res.json({ message: 'Step deleted' });
  } catch (err) {
    console.error('Error deleting step:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- JLPT COURSES ----------------

exports.listCourses = async (req, res) => {
  try {
    const courses = await JlptCourse.findAll({ order: [['sortOrder', 'ASC']] });
    res.json({ courses });
  } catch (err) {
    console.error('Error listing courses:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const course = await JlptCourse.create(req.body);
    res.status(201).json({ message: 'Course created', course });
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await JlptCourse.findByPk(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await course.update(req.body);
    res.json({ message: 'Course updated', course });
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const deleted = await JlptCourse.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Course not found' });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- SUCCESS STORIES ----------------

exports.listStories = async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const stories = await SuccessStory.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json({ stories });
  } catch (err) {
    console.error('Error listing stories:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createStory = async (req, res) => {
  try {
    const story = await SuccessStory.create(req.body);
    res.status(201).json({ message: 'Story created', story });
  } catch (err) {
    console.error('Error creating story:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateStory = async (req, res) => {
  try {
    const story = await SuccessStory.findByPk(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    await story.update(req.body);
    res.json({ message: 'Story updated', story });
  } catch (err) {
    console.error('Error updating story:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteStory = async (req, res) => {
  try {
    const deleted = await SuccessStory.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Story not found' });
    res.json({ message: 'Story deleted' });
  } catch (err) {
    console.error('Error deleting story:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- FAQ ----------------

exports.listFaqs = async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const faqs = await Faq.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json({ faqs });
  } catch (err) {
    console.error('Error listing faqs:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createFaq = async (req, res) => {
  try {
    const faq = await Faq.create(req.body);
    res.status(201).json({ message: 'FAQ created', faq });
  } catch (err) {
    console.error('Error creating faq:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    const faq = await Faq.findByPk(req.params.id);
    if (!faq) return res.status(404).json({ error: 'FAQ not found' });
    await faq.update(req.body);
    res.json({ message: 'FAQ updated', faq });
  } catch (err) {
    console.error('Error updating faq:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    const deleted = await Faq.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'FAQ not found' });
    res.json({ message: 'FAQ deleted' });
  } catch (err) {
    console.error('Error deleting faq:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- BRANCH ----------------

// EN: List branches — public sees published only; admin can pass ?all=true.
//     Sorted by sortOrder then city so HQ stays at top by default.
// BN: Branch list — public শুধু published দেখে; admin ?all=true দিতে পারে।
//     sortOrder + city দিয়ে sort, HQ default-এ উপরে থাকে।
exports.listBranches = async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const branches = await Branch.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['city', 'ASC']],
    });
    res.json({ branches });
  } catch (err) {
    console.error('Error listing branches:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const branch = await Branch.create(req.body);
    res.status(201).json({ message: 'Branch created', branch });
  } catch (err) {
    console.error('Error creating branch:', err);
    // EN: Surface the unique-slug clash so the admin can pick a different one.
    // BN: Slug duplicate হলে admin-কে দেখাই, যাতে আলাদা slug দিতে পারে।
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'এই slug ইতিমধ্যে আছে — অন্য একটা দিন।' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    await branch.update(req.body);
    res.json({ message: 'Branch updated', branch });
  } catch (err) {
    console.error('Error updating branch:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'এই slug ইতিমধ্যে আছে — অন্য একটা দিন।' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const deleted = await Branch.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Branch not found' });
    res.json({ message: 'Branch deleted' });
  } catch (err) {
    console.error('Error deleting branch:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- ACHIEVEMENTS ----------------
// EN: Visa wins, Japan reception, events, classroom moments. Public list
//     supports `?type=` filter and `?featured=true` for the Home strip.
// BN: ভিসা প্রাপ্তি, জাপান অভ্যর্থনা, event, ক্লাসরুম মুহূর্ত।
//     Public list-এ ?type= filter এবং Home strip-এর জন্য ?featured=true আছে।

const ACHIEVEMENT_TYPES = ['visa-win', 'arrival', 'event', 'class'];

exports.listAchievements = async (req, res) => {
  try {
    const where = {};
    if (req.query.all !== 'true') where.published = true;
    if (req.query.type && ACHIEVEMENT_TYPES.includes(req.query.type)) {
      where.type = req.query.type;
    }
    if (req.query.featured === 'true') where.featured = true;

    const limit = Math.min(parseInt(req.query.limit, 10) || 0, 200);

    const achievements = await Achievement.findAll({
      where,
      order: [
        ['sortOrder', 'ASC'],
        ['eventDate', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      ...(limit ? { limit } : {}),
    });
    res.json({ achievements });
  } catch (err) {
    console.error('Error listing achievements:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createAchievement = async (req, res) => {
  try {
    const a = await Achievement.create(req.body);
    logAudit(req, {
      action: 'create',
      entity: 'Achievement',
      entityId: a.id,
      summary: `Achievement created (${a.type})`,
    });
    res.status(201).json({ message: 'Achievement created', achievement: a });
  } catch (err) {
    console.error('Error creating achievement:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateAchievement = async (req, res) => {
  try {
    const a = await Achievement.findByPk(req.params.id);
    if (!a) return res.status(404).json({ error: 'Achievement not found' });
    await a.update(req.body);
    logAudit(req, {
      action: 'update',
      entity: 'Achievement',
      entityId: a.id,
      summary: `Achievement updated (${a.type})`,
    });
    res.json({ message: 'Achievement updated', achievement: a });
  } catch (err) {
    console.error('Error updating achievement:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteAchievement = async (req, res) => {
  try {
    const deleted = await Achievement.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Achievement not found' });
    logAudit(req, {
      action: 'delete',
      entity: 'Achievement',
      entityId: req.params.id,
      summary: 'Achievement deleted',
    });
    res.json({ message: 'Achievement deleted' });
  } catch (err) {
    console.error('Error deleting achievement:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- HOME VIDEOS ----------------
// EN: Curated YouTube videos shown on the public home page after the success
//     section. Public list filters out unpublished entries; admin can pass
//     `?all=true` to see drafts.
// BN: Public home page-এ success section-এর পর দেখানো curated YouTube
//     video। Public list-এ unpublished বাদ; admin `?all=true` দিয়ে draft
//     দেখতে পারে।

exports.listHomeVideos = async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const videos = await HomeVideo.findAll({
      where,
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });
    res.json({ videos });
  } catch (err) {
    console.error('Error listing home videos:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createHomeVideo = async (req, res) => {
  try {
    const v = await HomeVideo.create(req.body);
    logAudit(req, {
      action: 'create',
      entity: 'HomeVideo',
      entityId: v.id,
      summary: `Home video added (${v.title || v.youtubeUrl})`,
    });
    res.status(201).json({ message: 'Home video created', video: v });
  } catch (err) {
    console.error('Error creating home video:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateHomeVideo = async (req, res) => {
  try {
    const v = await HomeVideo.findByPk(req.params.id);
    if (!v) return res.status(404).json({ error: 'Home video not found' });
    await v.update(req.body);
    logAudit(req, {
      action: 'update',
      entity: 'HomeVideo',
      entityId: v.id,
      summary: `Home video updated (${v.title || v.youtubeUrl})`,
    });
    res.json({ message: 'Home video updated', video: v });
  } catch (err) {
    console.error('Error updating home video:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteHomeVideo = async (req, res) => {
  try {
    const deleted = await HomeVideo.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Home video not found' });
    logAudit(req, {
      action: 'delete',
      entity: 'HomeVideo',
      entityId: req.params.id,
      summary: 'Home video deleted',
    });
    res.json({ message: 'Home video deleted' });
  } catch (err) {
    console.error('Error deleting home video:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- AGENCY MOMENTS ----------------
// EN: Agency-life photo strip below the home Hero. Same shape as HomeVideo —
//     public list filters out unpublished; admin can pass `?all=true` to see
//     drafts. Sort by sortOrder asc then createdAt desc so newest stays at
//     the head when admin doesn't bother setting sortOrder.
// BN: Home Hero-এর নিচে agency-life photo strip। HomeVideo-এর মতোই shape —
//     public list-এ unpublished বাদ; admin `?all=true` দিয়ে draft দেখতে
//     পারে। sortOrder asc → createdAt desc — admin sortOrder না দিলে নতুন
//     ছবি head-এ থাকে।

exports.listAgencyMoments = async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const moments = await AgencyMoment.findAll({
      where,
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });
    res.json({ moments });
  } catch (err) {
    console.error('Error listing agency moments:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createAgencyMoment = async (req, res) => {
  try {
    const m = await AgencyMoment.create(req.body);
    logAudit(req, {
      action: 'create',
      entity: 'AgencyMoment',
      entityId: m.id,
      summary: `Agency moment added (${m.caption || m.captionEn || m.photoUrl})`,
    });
    res.status(201).json({ message: 'Agency moment created', moment: m });
  } catch (err) {
    console.error('Error creating agency moment:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateAgencyMoment = async (req, res) => {
  try {
    const m = await AgencyMoment.findByPk(req.params.id);
    if (!m) return res.status(404).json({ error: 'Agency moment not found' });
    await m.update(req.body);
    logAudit(req, {
      action: 'update',
      entity: 'AgencyMoment',
      entityId: m.id,
      summary: `Agency moment updated (${m.caption || m.captionEn || m.photoUrl})`,
    });
    res.json({ message: 'Agency moment updated', moment: m });
  } catch (err) {
    console.error('Error updating agency moment:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteAgencyMoment = async (req, res) => {
  try {
    const deleted = await AgencyMoment.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Agency moment not found' });
    logAudit(req, {
      action: 'delete',
      entity: 'AgencyMoment',
      entityId: req.params.id,
      summary: 'Agency moment deleted',
    });
    res.json({ message: 'Agency moment deleted' });
  } catch (err) {
    console.error('Error deleting agency moment:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
