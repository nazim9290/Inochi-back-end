/**
 * EN: Admin API for the AI blog feature: manage the topic queue, see
 *     recent run history, and manually trigger a generation now.
 * BN: AI blog feature-এর admin API: topic queue manage, সাম্প্রতিক run
 *     history দেখা, এবং এখনই একটা generation manual trigger।
 */

const { BlogTopicQueue, AiBlogRun, Blog } = require('../models');
const { runOnce } = require('../helpers/blogScheduler');

exports.listQueue = async (req, res) => {
  try {
    const rows = await BlogTopicQueue.findAll({
      order: [
        ['status', 'ASC'],
        ['createdAt', 'ASC'],
      ],
      limit: 200,
    });
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list topic queue' });
  }
};

exports.addQueueItem = async (req, res) => {
  try {
    const topic = String(req.body?.topic || '').trim();
    if (!topic) return res.status(400).json({ error: 'Topic is required' });
    const row = await BlogTopicQueue.create({
      topic: topic.slice(0, 800),
      category: String(req.body?.category || '').slice(0, 80),
      keywordsCsv: String(req.body?.keywordsCsv || '').slice(0, 500),
      status: 'pending',
    });
    res.status(201).json({ item: row });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add topic' });
  }
};

exports.deleteQueueItem = async (req, res) => {
  try {
    const n = await BlogTopicQueue.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
};

exports.listRuns = async (req, res) => {
  try {
    const rows = await AiBlogRun.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    // EN: Inline-resolve blog title for successful rows so the admin table
    //     can show "✓ Published: <title>" without an extra round trip.
    // BN: Successful row-এ blog title inline-resolve — admin table extra
    //     round trip ছাড়াই "✓ Published: <title>" দেখাতে পারে।
    const blogIds = rows.map((r) => r.blogId).filter(Boolean);
    let titles = {};
    if (blogIds.length) {
      const blogs = await Blog.findAll({ where: { id: blogIds }, attributes: ['id', 'title'] });
      titles = Object.fromEntries(blogs.map((b) => [b.id, b.title]));
    }
    res.json({
      runs: rows.map((r) => ({
        id: r.id,
        topic: r.topic,
        source: r.source,
        status: r.status,
        blogId: r.blogId,
        blogTitle: r.blogId ? titles[r.blogId] || null : null,
        errorMessage: r.errorMessage,
        durationMs: r.durationMs,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list runs' });
  }
};

exports.triggerManual = async (req, res) => {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(503).json({ error: 'DEEPSEEK_API_KEY not configured on server' });
    }
    const r = await runOnce({ source: 'manual' });
    if (!r.ok) {
      return res.status(502).json({ ok: false, error: r.error, runId: r.runRow?.id });
    }
    res.json({ ok: true, blogId: r.blog.id, title: r.blog.title, runId: r.runRow.id });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Manual trigger failed' });
  }
};

exports.status = async (req, res) => {
  res.json({
    enabled: process.env.AI_BLOG_ENABLED === 'true',
    hasApiKey: !!process.env.DEEPSEEK_API_KEY,
    hasImageGen: !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
    imageProvider: 'Pollinations (Flux) → Cloudinary',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    hour: parseInt(process.env.AI_BLOG_HOUR, 10) || 9,
    authorIdConfigured: !!process.env.AI_BLOG_AUTHOR_ID,
  });
};
