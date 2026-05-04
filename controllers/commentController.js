/**
 * EN: Blog comments controller. Public visitors see only approved comments
 *     (top-level + their approved replies). Logged-in users can post (created
 *     as 'pending' for admin review), edit/delete their own. Admins moderate
 *     via separate endpoints (approve / reject / list pending / hard delete).
 * BN: Blog comments controller। Public ভিজিটর শুধু approved comment দেখে
 *     (top-level + তাদের approved reply)। Logged-in user post করতে পারে
 *     (admin review-এর জন্য 'pending' হয়ে create হয়), নিজের comment
 *     edit/delete করতে পারে। Admin আলাদা endpoint দিয়ে moderate করে
 *     (approve / reject / pending list / hard delete)।
 */

const { BlogComment, Blog, User } = require('../models');

const MAX_BODY = 2000;

const userPublic = (u) => {
  if (!u) return null;
  const { id, name, image } = u;
  return { id, name, image };
};

// EN: Public — list approved top-level comments + their approved replies.
// BN: Public — approved top-level comment + তাদের approved reply।
exports.listPublic = async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findByPk(blogId);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    const top = await BlogComment.findAll({
      where: { blogId, parentId: null, status: 'approved' },
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'image'] }],
    });

    // EN: Fetch approved replies for these top-level comments in one round-trip.
    // BN: এক round-trip-এ এই top-level comment-গুলোর approved reply আনি।
    const topIds = top.map((t) => t.id);
    const replies = topIds.length
      ? await BlogComment.findAll({
          where: { parentId: topIds, status: 'approved' },
          order: [['createdAt', 'ASC']],
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'image'] }],
        })
      : [];

    const replyMap = replies.reduce((acc, r) => {
      const k = String(r.parentId);
      if (!acc[k]) acc[k] = [];
      acc[k].push({
        id: r.id,
        body: r.body,
        edited: r.edited,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: userPublic(r.user),
      });
      return acc;
    }, {});

    const items = top.map((c) => ({
      id: c.id,
      body: c.body,
      edited: c.edited,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      user: userPublic(c.user),
      replies: replyMap[String(c.id)] || [],
    }));

    res.json({ ok: true, total: items.length, items });
  } catch (err) {
    console.error('listPublic error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: Auth — create a comment or reply (parentId optional). Always 'pending'.
// BN: Auth — comment বা reply তৈরি (parentId optional)। সব 'pending'।
exports.create = async (req, res) => {
  try {
    const blogId = req.params.id;
    const { body, parentId } = req.body || {};
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment body is required' });
    }
    if (body.length > MAX_BODY) {
      return res.status(400).json({ error: 'Comment too long' });
    }

    const blog = await Blog.findByPk(blogId);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    if (parentId) {
      const parent = await BlogComment.findByPk(parentId);
      if (!parent || String(parent.blogId) !== String(blogId)) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
      // EN: Only allow 1-level threading; reject nesting.
      // BN: শুধু 1-level thread; নেস্টিং reject।
      if (parent.parentId) {
        return res.status(400).json({ error: 'Replies cannot be nested further' });
      }
    }

    const userId = req.user._id || req.user.id;
    const created = await BlogComment.create({
      blogId,
      userId,
      parentId: parentId || null,
      body: body.trim(),
      status: 'pending',
    });

    res.status(201).json({
      ok: true,
      pending: true,
      comment: {
        id: created.id,
        body: created.body,
        status: created.status,
        createdAt: created.createdAt,
      },
    });
  } catch (err) {
    console.error('create comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: Auth — edit own comment. Stays in current status (so an approved
//     comment doesn't auto-go-pending on a typo fix). Sets edited=true.
// BN: Auth — নিজের comment edit। current status-এই থাকে (approved comment
//     typo-fix-এ যাতে আবার pending না হয়)। edited=true সেট হয়।
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const { body } = req.body || {};
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment body is required' });
    }
    if (body.length > MAX_BODY) {
      return res.status(400).json({ error: 'Comment too long' });
    }

    const c = await BlogComment.findByPk(id);
    if (!c) return res.status(404).json({ error: 'Not found' });

    const userId = req.user._id || req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (String(c.userId) !== String(userId) && !isAdmin) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    c.body = body.trim();
    c.edited = true;
    await c.save();

    res.json({ ok: true, comment: { id: c.id, body: c.body, edited: c.edited } });
  } catch (err) {
    console.error('update comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: Auth — delete own comment (admin can delete any).
// BN: Auth — নিজের comment delete (admin যেকোনো comment delete করতে পারে)।
exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    const c = await BlogComment.findByPk(id);
    if (!c) return res.status(404).json({ error: 'Not found' });

    const userId = req.user._id || req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (String(c.userId) !== String(userId) && !isAdmin) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    await c.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('remove comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================================================
// Admin moderation
// ========================================================================

// EN: Admin — list comments by status (default 'pending'), newest first.
// BN: Admin — status-অনুযায়ী comment list (default 'pending'), নতুন আগে।
exports.adminList = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const where = status === 'all' ? {} : { status };
    const items = await BlogComment.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'image'] },
        { model: Blog, as: 'blog', attributes: ['id', 'title', 'titleEn'] },
      ],
      limit: 200,
    });
    res.json({ ok: true, items });
  } catch (err) {
    console.error('adminList error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: Admin — set status (approve / reject).
// BN: Admin — status সেট (approve / reject)।
exports.adminSetStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const c = await BlogComment.findByPk(id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    c.status = status;
    await c.save();
    res.json({ ok: true, comment: { id: c.id, status: c.status } });
  } catch (err) {
    console.error('adminSetStatus error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.adminCounts = async (req, res) => {
  try {
    const [pending, approved, rejected] = await Promise.all([
      BlogComment.count({ where: { status: 'pending' } }),
      BlogComment.count({ where: { status: 'approved' } }),
      BlogComment.count({ where: { status: 'rejected' } }),
    ]);
    res.json({ ok: true, pending, approved, rejected, total: pending + approved + rejected });
  } catch (err) {
    console.error('adminCounts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
