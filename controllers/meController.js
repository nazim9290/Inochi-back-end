/**
 * EN: "Me" — endpoints scoped to the logged-in user. Powers the public-site
 *     /account dashboard: profile, applications, bookmarks, comments. All
 *     routes assume requireAuth has populated req.user.
 * BN: "Me" — logged-in user-এর scoped endpoint। Public-site /account
 *     dashboard চালায়: profile, applications, bookmarks, comments।
 *     সব route ধরে নেয় requireAuth req.user populate করেছে।
 */

const { Op } = require('sequelize');
const {
  User,
  Application,
  BlogBookmark,
  Blog,
  BlogComment,
} = require('../models');

const { hashPassword, comparePassword } = require('../helpers/auth');

const userPublic = (u) => {
  if (!u) return null;
  const j = u.toJSON ? u.toJSON() : u;
  delete j.password;
  return j;
};

// EN: GET /api/me/profile — returns the current user with sensitive fields stripped.
// BN: GET /api/me/profile — current user return, sensitive field stripped।
exports.getProfile = async (req, res) => {
  try {
    res.json({ ok: true, user: userPublic(req.user) });
  } catch (err) {
    console.error('me.getProfile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: PUT /api/me/profile — name only for now. Password change is a separate
//     endpoint with current-password verification.
// BN: PUT /api/me/profile — এখন শুধু name। Password change আলাদা endpoint —
//     current password verify সহ।
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body || {};
    if (typeof name === 'string' && name.trim()) {
      req.user.name = name.trim();
    }
    await req.user.save();
    res.json({ ok: true, user: userPublic(req.user) });
  } catch (err) {
    console.error('me.updateProfile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: PUT /api/me/password — change own password. Requires currentPassword.
// BN: PUT /api/me/password — নিজের password change। currentPassword লাগে।
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be 6+ characters' });
    }
    const ok = await comparePassword(currentPassword, req.user.password);
    if (!ok) return res.status(403).json({ error: 'Current password is wrong' });
    req.user.password = await hashPassword(newPassword);
    await req.user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('me.changePassword:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: GET /api/me/applications — list applications either explicitly linked
//     (userId) or matching the user's email. Newest first; admin notes are
//     intentionally NOT included (those stay private to admins).
// BN: GET /api/me/applications — userId-তে link করা OR user-এর email match
//     করা applications list। নতুন আগে; admin notes intentionally exclude
//     (admin-এর জন্য private)।
exports.listApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    const where = email
      ? { [Op.or]: [{ userId }, { email }] }
      : { userId };
    const items = await Application.findAll({
      where,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['adminNotes'] },
    });
    res.json({ ok: true, total: items.length, items });
  } catch (err) {
    console.error('me.listApplications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: GET /api/me/bookmarks — saved blog posts with the blog data joined.
// BN: GET /api/me/bookmarks — saved blog post + blog data join করে।
exports.listBookmarks = async (req, res) => {
  try {
    const items = await BlogBookmark.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Blog,
          as: 'blog',
          attributes: ['id', 'title', 'titleEn', 'image', 'publishedAt', 'createdAt', 'status'],
        },
      ],
    });
    // EN: Filter out bookmarks whose blog has been deleted (cascade should
    //     handle this, but be defensive on read paths).
    // BN: Bookmark-এর blog delete হলে filter (cascade handle করার কথা, তবু
    //     read path-এ সাবধান)।
    const visible = items.filter((b) => b.blog && b.blog.status === 'published');
    res.json({ ok: true, total: visible.length, items: visible });
  } catch (err) {
    console.error('me.listBookmarks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: GET /api/me/comments — own comments across all blogs, with status so
//     the user knows pending vs approved.
// BN: GET /api/me/comments — সব blog-এ নিজের comment, status সহ — pending
//     vs approved বোঝার জন্য।
exports.listComments = async (req, res) => {
  try {
    const items = await BlogComment.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [
        { model: Blog, as: 'blog', attributes: ['id', 'title', 'titleEn'] },
      ],
      limit: 200,
    });
    res.json({ ok: true, total: items.length, items });
  } catch (err) {
    console.error('me.listComments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// =========================================================================
// Bookmark toggle (separate from list endpoints since the path is per-blog)
// =========================================================================

// EN: GET /api/blogs/:id/bookmark — has the current user bookmarked this post?
// BN: GET /api/blogs/:id/bookmark — current user এটা bookmark করেছে কিনা।
exports.getBookmarkStatus = async (req, res) => {
  try {
    const blogId = req.params.id;
    const exists = await BlogBookmark.findOne({
      where: { userId: req.user.id, blogId },
      attributes: ['id'],
    });
    res.json({ ok: true, bookmarked: !!exists });
  } catch (err) {
    console.error('me.getBookmarkStatus:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: POST /api/blogs/:id/bookmark — toggle on. Idempotent (ignores conflicts).
// BN: POST /api/blogs/:id/bookmark — toggle on। Idempotent (conflict ignore)।
exports.addBookmark = async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findByPk(blogId);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    await BlogBookmark.findOrCreate({
      where: { userId: req.user.id, blogId },
      defaults: { userId: req.user.id, blogId },
    });
    res.json({ ok: true, bookmarked: true });
  } catch (err) {
    console.error('me.addBookmark:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// EN: DELETE /api/blogs/:id/bookmark — toggle off. Idempotent.
// BN: DELETE /api/blogs/:id/bookmark — toggle off। Idempotent।
exports.removeBookmark = async (req, res) => {
  try {
    const blogId = req.params.id;
    await BlogBookmark.destroy({ where: { userId: req.user.id, blogId } });
    res.json({ ok: true, bookmarked: false });
  } catch (err) {
    console.error('me.removeBookmark:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
