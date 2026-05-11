const {
  SiteSettings,
  HowItWorksStep,
  JlptCourse,
  SuccessStory,
  Faq,
  Branch,
  BdCity,
  JpCity,
  Event,
  ChecklistItem,
  ScamItem,
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

// ---------------- BD CITIES (Study-from landing pages) ----------------
// EN: Public reads are shaped to match the legacy `bd-city-pages.json` format
//     so the Next.js page can swap data sources without changing render code.
//     Multilingual scalar fields collapse into {en, bn, ja} objects; flat
//     scalars stay flat. Admin reads (?all=true&raw=true) return DB columns
//     verbatim because the admin form edits per-language inputs directly.
// BN: Public read legacy `bd-city-pages.json` format-এর সাথে মেলানো হয় —
//     Next.js page render code না পাল্টে data source swap করতে পারে।
//     Multilingual scalar field {en, bn, ja} object-এ collapse হয়; flat
//     scalar flat-ই থাকে। Admin read (?all=true&raw=true) DB column যেমনি
//     return করে, কারণ admin form per-language input সরাসরি edit করে।

// EN: Helper — turn three columns into the legacy multilingual object shape.
//     Empty languages get omitted so JSON.stringify keeps payloads small.
// BN: Helper — তিনটা column legacy multilingual object shape-এ রূপান্তর।
//     Empty language বাদ — JSON.stringify-এর payload ছোট থাকে।
const triLang = (bn, en, ja) => {
  const out = {};
  if (bn) out.bn = bn;
  if (en) out.en = en;
  if (ja) out.ja = ja;
  return out;
};

// EN: Adapt a single BdCity row into the public-page consumption shape.
// BN: একটা BdCity row public-page consumption shape-এ adapt।
const shapeBdCity = (city) => {
  const c = city.toJSON ? city.toJSON() : city;
  return {
    slug: c.slug,
    name: triLang(c.name, c.nameEn, c.nameJa),
    tagline: triLang(c.tagline, c.taglineEn, c.taglineJa),
    studentsPlaced: c.studentsPlaced || 0,
    branchAddress: c.hasBranch ? triLang(c.branchAddress, c.branchAddressEn) : null,
    hasBranch: !!c.hasBranch,
    phones: Array.isArray(c.phones) ? c.phones : [],
    heroImage: c.heroImage || '',
    highlights: Array.isArray(c.highlights) ? c.highlights : [],
    nearbyAreas: Array.isArray(c.nearbyAreas) ? c.nearbyAreas : [],
    programsOffered: Array.isArray(c.programsOffered) ? c.programsOffered : [],
    nextIntake: triLang(c.nextIntake, c.nextIntakeEn),
    counsellingMode: c.counsellingMode || 'online',
  };
};

exports.listBdCities = async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const rows = await BdCity.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });
    // EN: Admin form needs raw DB rows; public site needs the shaped form.
    // BN: Admin form raw DB row চায়; public site shaped form।
    const cities = req.query.raw === 'true' ? rows : rows.map(shapeBdCity);
    res.json({ cities });
  } catch (err) {
    console.error('Error listing bd cities:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getBdCity = async (req, res) => {
  try {
    const row = await BdCity.findOne({ where: { slug: req.params.slug } });
    if (!row) return res.status(404).json({ error: 'City not found' });
    const city = req.query.raw === 'true' ? row : shapeBdCity(row);
    res.json({ city });
  } catch (err) {
    console.error('Error fetching bd city:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createBdCity = async (req, res) => {
  try {
    const city = await BdCity.create(req.body);
    logAudit(req, {
      action: 'create',
      entity: 'BdCity',
      entityId: city.id,
      summary: `BD city added (${city.name || city.slug})`,
    });
    res.status(201).json({ message: 'City created', city });
  } catch (err) {
    console.error('Error creating bd city:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'এই slug ইতিমধ্যে আছে — অন্য একটা দিন।' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateBdCity = async (req, res) => {
  try {
    const city = await BdCity.findByPk(req.params.id);
    if (!city) return res.status(404).json({ error: 'City not found' });
    await city.update(req.body);
    logAudit(req, {
      action: 'update',
      entity: 'BdCity',
      entityId: city.id,
      summary: `BD city updated (${city.name || city.slug})`,
    });
    res.json({ message: 'City updated', city });
  } catch (err) {
    console.error('Error updating bd city:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'এই slug ইতিমধ্যে আছে — অন্য একটা দিন।' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteBdCity = async (req, res) => {
  try {
    const deleted = await BdCity.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'City not found' });
    logAudit(req, {
      action: 'delete',
      entity: 'BdCity',
      entityId: req.params.id,
      summary: 'BD city deleted',
    });
    res.json({ message: 'City deleted' });
  } catch (err) {
    console.error('Error deleting bd city:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- JP CITIES (Japan city guides) ----------------
// EN: Public read collapses trilingual columns into the legacy {bn,en,ja}
//     object shape so the existing renderer doesn't change. raw=true skips
//     the reshape so the admin form sees per-language fields directly.
// BN: Public read trilingual column-গুলোকে legacy {bn,en,ja} object
//     shape-এ collapse করে — existing renderer পাল্টায় না। raw=true
//     reshape skip করে — admin form per-language field সরাসরি দেখে।

const shapeJpCity = (city) => {
  const c = city.toJSON ? city.toJSON() : city;
  return {
    slug: c.slug,
    name: triLang(c.name, c.nameEn, c.nameJa),
    kanji: c.kanji || '',
    tagline: triLang(c.tagline, c.taglineEn, c.taglineJa),
    monthlyLiving: c.monthlyLiving || '',
    monthlyRent: c.monthlyRent || '',
    partTimeWage: c.partTimeWage || '',
    transportPass: c.transportPass || '',
    climate: triLang(c.climate, c.climateEn, c.climateJa),
    heroImage: c.heroImage || '',
    topSchools: Array.isArray(c.topSchools) ? c.topSchools : [],
    highlights: Array.isArray(c.highlights) ? c.highlights : [],
    tradeOffs: Array.isArray(c.tradeOffs) ? c.tradeOffs : [],
  };
};

exports.listJpCities = async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const rows = await JpCity.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });
    const cities = req.query.raw === 'true' ? rows : rows.map(shapeJpCity);
    res.json({ cities });
  } catch (err) {
    console.error('Error listing jp cities:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getJpCity = async (req, res) => {
  try {
    const row = await JpCity.findOne({ where: { slug: req.params.slug } });
    if (!row) return res.status(404).json({ error: 'City not found' });
    const city = req.query.raw === 'true' ? row : shapeJpCity(row);
    res.json({ city });
  } catch (err) {
    console.error('Error fetching jp city:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createJpCity = async (req, res) => {
  try {
    const city = await JpCity.create(req.body);
    logAudit(req, { action: 'create', entity: 'JpCity', entityId: city.id, summary: `JP city added (${city.name || city.slug})` });
    res.status(201).json({ message: 'City created', city });
  } catch (err) {
    console.error('Error creating jp city:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'এই slug ইতিমধ্যে আছে — অন্য একটা দিন।' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateJpCity = async (req, res) => {
  try {
    const city = await JpCity.findByPk(req.params.id);
    if (!city) return res.status(404).json({ error: 'City not found' });
    await city.update(req.body);
    logAudit(req, { action: 'update', entity: 'JpCity', entityId: city.id, summary: `JP city updated (${city.name || city.slug})` });
    res.json({ message: 'City updated', city });
  } catch (err) {
    console.error('Error updating jp city:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'এই slug ইতিমধ্যে আছে — অন্য একটা দিন।' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteJpCity = async (req, res) => {
  try {
    const deleted = await JpCity.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'City not found' });
    logAudit(req, { action: 'delete', entity: 'JpCity', entityId: req.params.id, summary: 'JP city deleted' });
    res.json({ message: 'City deleted' });
  } catch (err) {
    console.error('Error deleting jp city:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- EVENTS ----------------
// EN: Reshape returns the legacy `events-calendar.json` row shape so the
//     existing /events renderer doesn't need to change.
// BN: Reshape legacy `events-calendar.json` row shape return করে —
//     existing /events renderer পাল্টায় না।

const shapeEvent = (event) => {
  const e = event.toJSON ? event.toJSON() : event;
  return {
    id: e.id,
    type: e.type || 'seminar',
    title: triLang(e.title, e.titleEn, e.titleJa),
    description: triLang(e.description, e.descriptionEn, e.descriptionJa),
    date: e.eventDate,
    time: e.time || '',
    durationMin: e.durationMin || 60,
    location: triLang(e.location, e.locationEn, e.locationJa),
    city: e.city || '',
    rsvpUrl: e.rsvpUrl || '',
    heroImage: e.heroImage || '',
    isFree: !!e.isFree,
    fee: e.fee || '',
    highlight: !!e.highlight,
  };
};

exports.listEvents = async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    if (req.query.type) where.type = req.query.type;
    const rows = await Event.findAll({
      where,
      order: [['highlight', 'DESC'], ['eventDate', 'ASC'], ['sortOrder', 'ASC']],
    });
    const events = req.query.raw === 'true' ? rows : rows.map(shapeEvent);
    res.json({ events });
  } catch (err) {
    console.error('Error listing events:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    logAudit(req, { action: 'create', entity: 'Event', entityId: event.id, summary: `Event added (${event.title})` });
    res.status(201).json({ message: 'Event created', event });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    await event.update(req.body);
    logAudit(req, { action: 'update', entity: 'Event', entityId: event.id, summary: `Event updated (${event.title})` });
    res.json({ message: 'Event updated', event });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const deleted = await Event.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Event not found' });
    logAudit(req, { action: 'delete', entity: 'Event', entityId: req.params.id, summary: 'Event deleted' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- DOCUMENT CHECKLIST ----------------
// EN: Public read groups flat ChecklistItem rows by categoryKey and emits
//     the legacy { categories: [{ key, label, items: [...] }, ...] } shape.
//     Admin reads (raw=true) get flat rows so the form edits one item at
//     a time.
// BN: Public read flat ChecklistItem row-গুলোকে categoryKey দিয়ে group
//     করে legacy { categories: [{ key, label, items: [...] }, ...] }
//     shape emit করে। Admin read (raw=true) flat row পায় — form একসাথে
//     এক item edit করে।

exports.listChecklist = async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const rows = await ChecklistItem.findAll({
      where,
      order: [['groupOrder', 'ASC'], ['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });

    if (req.query.raw === 'true') {
      return res.json({ items: rows });
    }

    // EN: Group by categoryKey, preserve insertion order. First item of
    //     each group provides the canonical category label.
    // BN: categoryKey দিয়ে group, insertion order ধরে রাখি। প্রতিটা
    //     group-এর প্রথম item canonical category label দেয়।
    const grouped = new Map();
    for (const r of rows) {
      const c = r.toJSON();
      if (!grouped.has(c.categoryKey)) {
        grouped.set(c.categoryKey, {
          key: c.categoryKey,
          label: triLang(c.categoryLabel, c.categoryLabelEn, c.categoryLabelJa),
          items: [],
        });
      }
      grouped.get(c.categoryKey).items.push({
        id: c.id,
        label: triLang(c.label, c.labelEn, c.labelJa),
        note: triLang(c.note, c.noteEn),
      });
    }
    res.json({ categories: Array.from(grouped.values()) });
  } catch (err) {
    console.error('Error listing checklist:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createChecklistItem = async (req, res) => {
  try {
    const item = await ChecklistItem.create(req.body);
    logAudit(req, { action: 'create', entity: 'ChecklistItem', entityId: item.id, summary: `Checklist item added (${item.categoryKey})` });
    res.status(201).json({ message: 'Item created', item });
  } catch (err) {
    console.error('Error creating checklist item:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateChecklistItem = async (req, res) => {
  try {
    const item = await ChecklistItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.update(req.body);
    logAudit(req, { action: 'update', entity: 'ChecklistItem', entityId: item.id, summary: `Checklist item updated (${item.categoryKey})` });
    res.json({ message: 'Item updated', item });
  } catch (err) {
    console.error('Error updating checklist item:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteChecklistItem = async (req, res) => {
  try {
    const deleted = await ChecklistItem.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Item not found' });
    logAudit(req, { action: 'delete', entity: 'ChecklistItem', entityId: req.params.id, summary: 'Checklist item deleted' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Error deleting checklist item:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------------- SCAM ITEMS (Anti-scam page) ----------------
// EN: Public read partitions by `kind` and emits the legacy
//     { redFlags: [...], checks: [...] } shape so the existing
//     /anti-scam renderer doesn't need to change.
// BN: Public read `kind` দিয়ে partition করে legacy
//     { redFlags: [...], checks: [...] } shape emit করে — existing
//     /anti-scam renderer পাল্টায় না।

const shapeScamItem = (item) => {
  const s = item.toJSON ? item.toJSON() : item;
  const out = {
    key: s.itemKey || s.id,
    title: triLang(s.title, s.titleEn, s.titleJa),
  };
  if (s.kind === 'redflag') {
    out.body = triLang(s.body, s.bodyEn, s.bodyJa);
  }
  return out;
};

exports.listScamItems = async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { published: true };
    const rows = await ScamItem.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });

    if (req.query.raw === 'true') {
      return res.json({ items: rows });
    }

    const redFlags = [];
    const checks = [];
    for (const r of rows) {
      const shaped = shapeScamItem(r);
      if (r.kind === 'check') checks.push(shaped);
      else redFlags.push(shaped);
    }
    res.json({ redFlags, checks });
  } catch (err) {
    console.error('Error listing scam items:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createScamItem = async (req, res) => {
  try {
    const item = await ScamItem.create(req.body);
    logAudit(req, { action: 'create', entity: 'ScamItem', entityId: item.id, summary: `Scam item added (${item.kind})` });
    res.status(201).json({ message: 'Item created', item });
  } catch (err) {
    console.error('Error creating scam item:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateScamItem = async (req, res) => {
  try {
    const item = await ScamItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.update(req.body);
    logAudit(req, { action: 'update', entity: 'ScamItem', entityId: item.id, summary: `Scam item updated (${item.kind})` });
    res.json({ message: 'Item updated', item });
  } catch (err) {
    console.error('Error updating scam item:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteScamItem = async (req, res) => {
  try {
    const deleted = await ScamItem.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Item not found' });
    logAudit(req, { action: 'delete', entity: 'ScamItem', entityId: req.params.id, summary: 'Scam item deleted' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Error deleting scam item:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
