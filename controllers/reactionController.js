/**
 * EN: Blog reactions controller. Logged-in users can pick one reaction per
 *     blog post. Sending the SAME reaction type again removes it (toggle off).
 *     Sending a DIFFERENT type updates the existing row.
 * BN: Blog reactions controller। Logged-in user প্রতি post-এ একটা reaction
 *     দিতে পারে। একই type আবার পাঠালে সেটা সরিয়ে দেয় (toggle off)।
 *     ভিন্ন type পাঠালে existing row update হয়।
 */

const { BlogReaction, Blog } = require('../models');

const VALID_TYPES = ['like', 'love', 'celebrate', 'insightful'];

// EN: Public — returns reaction counts (per type + total) and the current
//     user's own reaction (null if not logged in or no reaction).
// BN: Public — type-অনুযায়ী count + total এবং current user-এর নিজের
//     reaction (login না থাকলে বা না দিলে null)।
exports.getReactions = async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findByPk(blogId);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    const all = await BlogReaction.findAll({
      where: { blogId },
      attributes: ['type', 'userId'],
    });

    const counts = VALID_TYPES.reduce((acc, t) => ({ ...acc, [t]: 0 }), {});
    for (const r of all) {
      if (counts[r.type] !== undefined) counts[r.type] += 1;
    }
    const total = all.length;

    let mine = null;
    if (req.user) {
      const myUserId = req.user._id || req.user.id;
      const found = all.find((r) => String(r.userId) === String(myUserId));
      mine = found ? found.type : null;
    }

    res.json({ ok: true, total, counts, mine });
  } catch (err) {
    console.error('getReactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: Auth — toggle / set the current user's reaction. Body: { type }.
// BN: Auth — current user-এর reaction set/toggle। Body: { type }।
exports.setReaction = async (req, res) => {
  try {
    const blogId = req.params.id;
    const { type } = req.body || {};
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    const blog = await Blog.findByPk(blogId);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    const userId = req.user._id || req.user.id;
    const existing = await BlogReaction.findOne({ where: { blogId, userId } });

    let mine = null;
    if (!existing) {
      await BlogReaction.create({ blogId, userId, type });
      mine = type;
    } else if (existing.type === type) {
      // EN: Same emoji clicked again → remove the reaction (toggle off).
      // BN: একই emoji আবার click করলে → reaction সরাও (toggle off)।
      await existing.destroy();
      mine = null;
    } else {
      existing.type = type;
      await existing.save();
      mine = type;
    }

    // EN: Return fresh counts so the UI doesn't need a follow-up GET.
    // BN: Fresh count return করি যাতে UI আবার GET না করতে হয়।
    const all = await BlogReaction.findAll({
      where: { blogId },
      attributes: ['type'],
    });
    const counts = VALID_TYPES.reduce((acc, t) => ({ ...acc, [t]: 0 }), {});
    for (const r of all) {
      if (counts[r.type] !== undefined) counts[r.type] += 1;
    }
    const total = all.length;

    res.json({ ok: true, mine, total, counts });
  } catch (err) {
    console.error('setReaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
