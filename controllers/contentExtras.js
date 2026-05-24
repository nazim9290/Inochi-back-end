/**
 * EN: contentExtras — admin-editable CRUD + public reshape for four
 *     previously-hardcoded content sections: glossary terms, university
 *     rankings, press mentions, and community channels. Public list endpoints
 *     return the SAME object shape the frontend pages already consume (so the
 *     renderers are untouched); admin endpoints (?all=true) return raw rows.
 * BN: contentExtras — আগে hardcoded চারটি section-এর admin-editable CRUD +
 *     public reshape: glossary term, university ranking, press mention,
 *     community channel। Public list endpoint frontend page-এর existing
 *     object shape-ই ফেরত দেয় (renderer অপরিবর্তিত); admin endpoint
 *     (?all=true) raw row দেয়।
 */

const {
  GlossaryTerm,
  UniversityRanking,
  PressMention,
  CommunityChannel,
  JlptSession,
  VisaInterviewItem,
  QuizQuestion,
  QuizTier,
  MockTest,
  MockQuestion,
} = require('../models');

// EN: bn primary + en/ja fallbacks → the {en,bn,ja} object the pages read.
// BN: bn primary + en/ja fallback → page যে {en,bn,ja} object পড়ে।
const triLang = (bn, en, ja) => ({
  en: en || bn || '',
  bn: bn || en || '',
  ja: ja || en || bn || '',
});

const onlyPublished = (req) => (req.query.all === 'true' ? {} : { published: true });

/* ------------------------------- Glossary -------------------------------- */

const shapeGlossary = (r) => ({
  id: r.termKey,
  term: r.term,
  termJa: r.termJa || '',
  category: r.category,
  en: r.en || '',
  bn: r.bn || '',
  ja: r.ja || '',
});

exports.listGlossary = async (req, res) => {
  try {
    const rows = await GlossaryTerm.findAll({
      where: onlyPublished(req),
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json({ terms: req.query.all === 'true' ? rows : rows.map(shapeGlossary) });
  } catch (err) {
    console.error('listGlossary:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createGlossary = async (req, res) => {
  try {
    if (!req.body.term) return res.status(400).json({ error: 'Term is required.' });
    const term = await GlossaryTerm.create(req.body);
    res.status(201).json({ message: 'Term created', term });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'termKey already exists.' });
    console.error('createGlossary:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateGlossary = async (req, res) => {
  try {
    const term = await GlossaryTerm.findByPk(req.params.id);
    if (!term) return res.status(404).json({ error: 'Term not found' });
    await term.update(req.body || {});
    res.json({ message: 'Term updated', term });
  } catch (err) {
    console.error('updateGlossary:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteGlossary = async (req, res) => {
  try {
    const deleted = await GlossaryTerm.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Term not found' });
    res.json({ message: 'Term deleted' });
  } catch (err) {
    console.error('deleteGlossary:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* --------------------------- University rankings ------------------------- */

const shapeRanking = (r) => ({
  rank: r.rank,
  name: r.name,
  city: r.city || '',
  type: r.type || 'national',
  qsAsia: r.qsAsia || 0,
  intlStudents: r.intlStudents || 0,
  englishPrograms: !!r.englishPrograms,
  jlptRequired: r.jlptRequired || '',
  tuitionAnnual: r.tuitionAnnual || '',
  highlight: triLang(r.highlight, r.highlightEn, r.highlightJa),
});

exports.listRankings = async (req, res) => {
  try {
    const rows = await UniversityRanking.findAll({
      where: onlyPublished(req),
      order: [['rank', 'ASC'], ['sortOrder', 'ASC']],
    });
    res.json({ universities: req.query.all === 'true' ? rows : rows.map(shapeRanking) });
  } catch (err) {
    console.error('listRankings:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createRanking = async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'University name is required.' });
    const ranking = await UniversityRanking.create(req.body);
    res.status(201).json({ message: 'University created', ranking });
  } catch (err) {
    console.error('createRanking:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateRanking = async (req, res) => {
  try {
    const ranking = await UniversityRanking.findByPk(req.params.id);
    if (!ranking) return res.status(404).json({ error: 'University not found' });
    await ranking.update(req.body || {});
    res.json({ message: 'University updated', ranking });
  } catch (err) {
    console.error('updateRanking:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteRanking = async (req, res) => {
  try {
    const deleted = await UniversityRanking.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'University not found' });
    res.json({ message: 'University deleted' });
  } catch (err) {
    console.error('deleteRanking:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* ------------------------------ Press mentions --------------------------- */

const shapePress = (r) => ({
  outlet: r.outlet,
  logoText: r.logoText || '',
  url: r.url || '',
  date: r.date || '',
  headline: triLang(r.headline, r.headlineEn, r.headlineJa),
  excerpt: triLang(r.excerpt, r.excerptEn, r.excerptJa),
});

exports.listPress = async (req, res) => {
  try {
    const rows = await PressMention.findAll({
      where: onlyPublished(req),
      order: [['sortOrder', 'ASC'], ['date', 'DESC']],
    });
    res.json({ mentions: req.query.all === 'true' ? rows : rows.map(shapePress) });
  } catch (err) {
    console.error('listPress:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createPress = async (req, res) => {
  try {
    if (!req.body.outlet) return res.status(400).json({ error: 'Outlet is required.' });
    const mention = await PressMention.create(req.body);
    res.status(201).json({ message: 'Mention created', mention });
  } catch (err) {
    console.error('createPress:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updatePress = async (req, res) => {
  try {
    const mention = await PressMention.findByPk(req.params.id);
    if (!mention) return res.status(404).json({ error: 'Mention not found' });
    await mention.update(req.body || {});
    res.json({ message: 'Mention updated', mention });
  } catch (err) {
    console.error('updatePress:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deletePress = async (req, res) => {
  try {
    const deleted = await PressMention.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Mention not found' });
    res.json({ message: 'Mention deleted' });
  } catch (err) {
    console.error('deletePress:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* --------------------------- Community channels -------------------------- */

const shapeCommunity = (r) => ({
  key: r.channelKey || '',
  name: triLang(r.name, r.nameEn, r.nameJa),
  description: triLang(r.description, r.descriptionEn, r.descriptionJa),
  url: r.url || '',
  members: r.members || '',
  language: r.language || '',
  color: r.color || 'blue',
});

exports.listCommunity = async (req, res) => {
  try {
    const rows = await CommunityChannel.findAll({
      where: onlyPublished(req),
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json({ channels: req.query.all === 'true' ? rows : rows.map(shapeCommunity) });
  } catch (err) {
    console.error('listCommunity:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createCommunity = async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'Channel name is required.' });
    const channel = await CommunityChannel.create(req.body);
    res.status(201).json({ message: 'Channel created', channel });
  } catch (err) {
    console.error('createCommunity:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateCommunity = async (req, res) => {
  try {
    const channel = await CommunityChannel.findByPk(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    await channel.update(req.body || {});
    res.json({ message: 'Channel updated', channel });
  } catch (err) {
    console.error('updateCommunity:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteCommunity = async (req, res) => {
  try {
    const deleted = await CommunityChannel.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Channel not found' });
    res.json({ message: 'Channel deleted' });
  } catch (err) {
    console.error('deleteCommunity:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* ----------------------------- JLPT sessions ----------------------------- */

const shapeSession = (r) => ({
  session: r.session || '',
  examDate: r.examDate || '',
  registrationOpen: r.registrationOpen || '',
  registrationClose: r.registrationClose || '',
  title: triLang(r.title, r.titleEn, r.titleJa),
  city: triLang(r.city, r.cityEn, r.cityJa),
  levels: Array.isArray(r.levels) ? r.levels : [],
  registrationUrl: r.registrationUrl || '',
});

exports.listSessions = async (req, res) => {
  try {
    const rows = await JlptSession.findAll({
      where: onlyPublished(req),
      order: [['examDate', 'ASC'], ['sortOrder', 'ASC']],
    });
    res.json({ exams: req.query.all === 'true' ? rows : rows.map(shapeSession) });
  } catch (err) {
    console.error('listSessions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createSession = async (req, res) => {
  try {
    const session = await JlptSession.create(req.body);
    res.status(201).json({ message: 'Session created', session });
  } catch (err) {
    console.error('createSession:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const session = await JlptSession.findByPk(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    await session.update(req.body || {});
    res.json({ message: 'Session updated', session });
  } catch (err) {
    console.error('updateSession:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const deleted = await JlptSession.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error('deleteSession:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* --------------------------- Visa interview prep ------------------------- */

// EN: Group rows by categoryKey into the nested {categories:[{questions}]}
//     shape the page consumes. Label/intro come from the first row per group.
// BN: row-গুলো categoryKey দিয়ে group করে page-এর nested
//     {categories:[{questions}]} shape-এ। প্রতি group-এর label/intro প্রথম
//     row থেকে।
function groupVisaItems(rows) {
  const map = new Map();
  rows.forEach((r) => {
    if (!map.has(r.categoryKey)) {
      map.set(r.categoryKey, {
        key: r.categoryKey,
        groupOrder: r.groupOrder || 0,
        label: triLang(r.categoryLabel, r.categoryLabelEn, r.categoryLabelJa),
        intro: triLang(r.categoryIntro, r.categoryIntroEn, r.categoryIntroJa),
        questions: [],
      });
    }
    map.get(r.categoryKey).questions.push({
      id: r.id,
      question: triLang(r.question, r.questionEn, r.questionJa),
      tip: triLang(r.tip, r.tipEn, r.tipJa),
      modelAnswer: triLang(r.modelAnswer, r.modelAnswerEn, r.modelAnswerJa),
      redFlag: triLang(r.redFlag, r.redFlagEn, r.redFlagJa),
    });
  });
  return [...map.values()].sort((a, b) => a.groupOrder - b.groupOrder).map(({ groupOrder, ...c }) => c);
}

exports.listVisaInterview = async (req, res) => {
  try {
    const rows = await VisaInterviewItem.findAll({
      where: onlyPublished(req),
      order: [['groupOrder', 'ASC'], ['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json({ categories: req.query.all === 'true' ? rows : groupVisaItems(rows) });
  } catch (err) {
    console.error('listVisaInterview:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createVisaItem = async (req, res) => {
  try {
    if (!req.body.categoryKey) return res.status(400).json({ error: 'Category key is required.' });
    const item = await VisaInterviewItem.create(req.body);
    res.status(201).json({ message: 'Item created', item });
  } catch (err) {
    console.error('createVisaItem:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateVisaItem = async (req, res) => {
  try {
    const item = await VisaInterviewItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await item.update(req.body || {});
    res.json({ message: 'Item updated', item });
  } catch (err) {
    console.error('updateVisaItem:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteVisaItem = async (req, res) => {
  try {
    const deleted = await VisaInterviewItem.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('deleteVisaItem:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* ----------------------------- Eligibility quiz -------------------------- */

// EN: Combined public quiz payload — questions (reshaped) + result tiers
//     (reshaped) + computed maxScore (sum of each question's top option score).
//     Options stay in their stored {value,score,label:{en,bn,ja}} shape since
//     the page reads them directly.
// BN: একত্রিত public কুইজ payload — questions (reshaped) + tiers (reshaped) +
//     হিসাব-করা maxScore (প্রতি প্রশ্নের সর্বোচ্চ option score-এর যোগফল)।
//     Options stored {value,score,label:{en,bn,ja}} shape-এই থাকে, page
//     সরাসরি পড়ে।
exports.getEligibilityQuiz = async (req, res) => {
  try {
    const [qRows, tRows] = await Promise.all([
      QuizQuestion.findAll({ where: { published: true }, order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']] }),
      QuizTier.findAll({ where: { published: true }, order: [['min', 'DESC']] }),
    ]);
    const questions = qRows.map((r) => ({
      id: r.questionKey,
      question: triLang(r.question, r.questionEn, r.questionJa),
      help: triLang(r.help, r.helpEn, r.helpJa),
      options: Array.isArray(r.options) ? r.options : [],
    }));
    const tiers = tRows.map((r) => ({
      key: r.tierKey,
      min: r.min,
      label: triLang(r.label, r.labelEn, r.labelJa),
      body: triLang(r.body, r.bodyEn, r.bodyJa),
      tone: r.tone || 'info',
    }));
    const maxScore = questions.reduce(
      (sum, q) => sum + (q.options.length ? Math.max(...q.options.map((o) => Number(o.score) || 0)) : 0),
      0
    );
    res.json({ maxScore, questions, tiers });
  } catch (err) {
    console.error('getEligibilityQuiz:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Quiz questions — admin raw list + CRUD
exports.listQuizQuestions = async (req, res) => {
  try {
    const rows = await QuizQuestion.findAll({ order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']] });
    res.json({ questions: rows });
  } catch (err) {
    console.error('listQuizQuestions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createQuizQuestion = async (req, res) => {
  try {
    if (!req.body.questionKey) return res.status(400).json({ error: 'Question key is required.' });
    const question = await QuizQuestion.create(req.body);
    res.status(201).json({ message: 'Question created', question });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'questionKey already exists.' });
    console.error('createQuizQuestion:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateQuizQuestion = async (req, res) => {
  try {
    const question = await QuizQuestion.findByPk(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    await question.update(req.body || {});
    res.json({ message: 'Question updated', question });
  } catch (err) {
    console.error('updateQuizQuestion:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteQuizQuestion = async (req, res) => {
  try {
    const deleted = await QuizQuestion.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error('deleteQuizQuestion:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Quiz tiers — admin raw list + CRUD
exports.listQuizTiers = async (req, res) => {
  try {
    const rows = await QuizTier.findAll({ order: [['min', 'DESC']] });
    res.json({ tiers: rows });
  } catch (err) {
    console.error('listQuizTiers:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createQuizTier = async (req, res) => {
  try {
    const tier = await QuizTier.create(req.body);
    res.status(201).json({ message: 'Tier created', tier });
  } catch (err) {
    console.error('createQuizTier:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateQuizTier = async (req, res) => {
  try {
    const tier = await QuizTier.findByPk(req.params.id);
    if (!tier) return res.status(404).json({ error: 'Tier not found' });
    await tier.update(req.body || {});
    res.json({ message: 'Tier updated', tier });
  } catch (err) {
    console.error('updateQuizTier:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteQuizTier = async (req, res) => {
  try {
    const deleted = await QuizTier.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Tier not found' });
    res.json({ message: 'Tier deleted' });
  } catch (err) {
    console.error('deleteQuizTier:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* ------------------------------ JLPT mock test --------------------------- */

// EN: Combined public payload: each published level's config + its published
//     questions (reshaped; options kept as stored). totalQuestions computed.
// BN: একত্রিত public payload: প্রতি published level-এর config + তার published
//     প্রশ্ন (reshaped; options যেমন আছে)। totalQuestions গণনা করা।
exports.getMockTest = async (req, res) => {
  try {
    const [tests, questions] = await Promise.all([
      MockTest.findAll({ where: { published: true }, order: [['sortOrder', 'ASC'], ['level', 'ASC']] }),
      MockQuestion.findAll({ where: { published: true }, order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']] }),
    ]);
    const byLevel = {};
    questions.forEach((q) => {
      (byLevel[q.level] = byLevel[q.level] || []).push({
        id: q.id,
        category: q.category || 'vocabulary',
        prompt: triLang(q.prompt, q.promptEn, q.promptJa),
        options: Array.isArray(q.options) ? q.options : [],
        correct: q.correct || '',
        explanation: triLang(q.explanation, q.explanationEn, q.explanationJa),
      });
    });
    const shaped = tests.map((t) => ({
      level: t.level,
      duration: t.duration,
      passingScore: t.passingScore,
      totalQuestions: (byLevel[t.level] || []).length,
      description: triLang(t.description, t.descriptionEn, t.descriptionJa),
      questions: byLevel[t.level] || [],
    }));
    res.json({ tests: shaped });
  } catch (err) {
    console.error('getMockTest:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Mock test configs — admin
exports.listMockTests = async (req, res) => {
  try {
    const rows = await MockTest.findAll({ order: [['sortOrder', 'ASC'], ['level', 'ASC']] });
    res.json({ tests: rows });
  } catch (err) {
    console.error('listMockTests:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createMockTest = async (req, res) => {
  try {
    if (!req.body.level) return res.status(400).json({ error: 'Level is required.' });
    const test = await MockTest.create(req.body);
    res.status(201).json({ message: 'Test created', test });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'That level already exists.' });
    console.error('createMockTest:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateMockTest = async (req, res) => {
  try {
    const test = await MockTest.findByPk(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    await test.update(req.body || {});
    res.json({ message: 'Test updated', test });
  } catch (err) {
    console.error('updateMockTest:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteMockTest = async (req, res) => {
  try {
    const deleted = await MockTest.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Test not found' });
    res.json({ message: 'Test deleted' });
  } catch (err) {
    console.error('deleteMockTest:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Mock questions — admin (optional ?level= filter)
exports.listMockQuestions = async (req, res) => {
  try {
    const where = req.query.level ? { level: req.query.level } : {};
    const rows = await MockQuestion.findAll({ where, order: [['level', 'ASC'], ['sortOrder', 'ASC'], ['createdAt', 'ASC']] });
    res.json({ questions: rows });
  } catch (err) {
    console.error('listMockQuestions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createMockQuestion = async (req, res) => {
  try {
    const question = await MockQuestion.create(req.body);
    res.status(201).json({ message: 'Question created', question });
  } catch (err) {
    console.error('createMockQuestion:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateMockQuestion = async (req, res) => {
  try {
    const question = await MockQuestion.findByPk(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    await question.update(req.body || {});
    res.json({ message: 'Question updated', question });
  } catch (err) {
    console.error('updateMockQuestion:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteMockQuestion = async (req, res) => {
  try {
    const deleted = await MockQuestion.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error('deleteMockQuestion:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
