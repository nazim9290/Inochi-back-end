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
