const { Blog, CaruselModel, User } = require('../models');
const facebook = require('../helpers/facebook');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://inochieducation.com';

// Strip HTML, collapse whitespace, cap to N chars — used for FB post summaries.
const summarise = (html, n = 240) => {
  const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= n) return text;
  return text.slice(0, n).replace(/\s+\S*$/, '') + '…';
};

const buildFbPayload = (blog) => {
  const id = blog.id || blog._id;
  return {
    title: blog.title || '',
    summary: summarise(blog.content || ''),
    blogUrl: `${SITE_URL}/bn/post/${id}`,
    imageUrl: blog.image?.url,
  };
};

const authorInclude = {
  model: User,
  as: 'author',
  attributes: ['id', 'name', 'phone', 'image'],
};

exports.createBlog = async (req, res) => {
  const { title, titleEn, content, contentEn, image, category, categoryEn } = req.body;
  if (!category) {
    return res.status(400).json({ error: 'Category is required.' });
  }
  try {
    const blog = await Blog.create({
      title,
      titleEn: titleEn || '',
      content,
      contentEn: contentEn || '',
      image,
      category,
      categoryEn: categoryEn || '',
      authorId: req.user._id || req.user.id,
    });
    const populated = await Blog.findByPk(blog.id, { include: [authorInclude] });
    res.status(201).json({ message: 'Blog created successfully', blog: populated });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findByPk(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    const { title, titleEn, content, contentEn, image, category, categoryEn, status, tags } = req.body;
    await blog.update({
      ...(title !== undefined && { title }),
      ...(titleEn !== undefined && { titleEn }),
      ...(content !== undefined && { content }),
      ...(contentEn !== undefined && { contentEn }),
      ...(image !== undefined && { image }),
      ...(category !== undefined && { category }),
      ...(categoryEn !== undefined && { categoryEn }),
      ...(status !== undefined && { status }),
      ...(tags !== undefined && { tags }),
    });
    const populated = await Blog.findByPk(blog.id, { include: [authorInclude] });
    res.json({ message: 'Blog updated', blog: populated });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.allPendingBlog = async (req, res) => {
  try {
    const pendingBlogs = await Blog.findAll({
      where: { status: 'draft' },
      include: [authorInclude],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ pendingBlogs });
  } catch (error) {
    console.error('Error getting pending blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.singleBlog = async (req, res) => {
  const { id } = req.params;
  try {
    const blog = await Blog.findByPk(id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    const wasDraft = blog.status !== 'published';
    blog.status = 'published';
    await blog.save();

    // On first publish, fire-and-forget Facebook auto-post.
    if (wasDraft) {
      facebook.postBlogToPage(buildFbPayload(blog)).then((r) => {
        if (r.ok) console.log(`FB auto-post: ${r.postId}`);
        else console.log('FB auto-post skipped:', r.reason);
      });
    }
    res.status(200).json({ message: 'Blog published successfully', blog });
  } catch (error) {
    console.error('Error updating blog status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Manual FB post — admin can re-share a blog any time. Bypasses the auto-post
// toggle so they can hand-pick which posts go to Facebook.
exports.postBlogToFacebook = async (req, res) => {
  try {
    const blog = await Blog.findByPk(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    const result = await facebook.postManually(buildFbPayload(blog));
    if (!result.ok) return res.status(502).json({ error: result.reason });
    res.json({ message: 'Posted to Facebook', postId: result.postId });
  } catch (err) {
    console.error('Manual FB post failed:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.checkFacebookConnection = async (req, res) => {
  const result = await facebook.checkToken();
  if (!result.ok) return res.status(502).json({ ok: false, reason: result.reason });
  res.json({ ok: true, page: result.page });
};

exports.singleblogpublic = async (req, res) => {
  try {
    const blog = await Blog.findByPk(req.params.id, { include: [authorInclude] });
    res.status(200).json({ blog });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.singlgleBlogTags = async (req, res) => {
  const blogId = req.params.id;
  const { tags, status } = req.body;
  try {
    const blog = await Blog.findByPk(blogId);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    const wasDraft = blog.status !== 'published';
    blog.tags = tags;
    if (status) blog.status = status;
    await blog.save();

    if (wasDraft && blog.status === 'published') {
      facebook.postBlogToPage(buildFbPayload(blog)).then((r) => {
        if (r.ok) console.log(`FB auto-post: ${r.postId}`);
        else console.log('FB auto-post skipped:', r.reason);
      });
    }
    res.json({ success: true, message: 'Blog approved successfully', blog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteBlogById = async (req, res) => {
  try {
    const deleted = await Blog.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Blog not found' });
    res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.allPublishedBlog = async (req, res) => {
  try {
    const publishedBlogs = await Blog.findAll({
      where: { status: 'published' },
      include: [authorInclude],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ publishedBlogs });
  } catch (error) {
    console.error('Error getting published blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const findPublishedByTag = (tag) => async (req, res) => {
  const { Op } = require('sequelize');
  try {
    const publishedstudy = await Blog.findAll({
      where: {
        status: 'published',
        tags: { [Op.contains]: { [tag]: true } },
      },
      include: [authorInclude],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ publishedstudy });
  } catch (error) {
    console.error('Error getting published blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.allPublishedBlogService = findPublishedByTag('service');
exports.allPublishedBlogBlogs = findPublishedByTag('blogs');
exports.allPublishedBlogstudy = findPublishedByTag('study');

exports.singleBlogconvert = async (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
};

exports.CreateCarusel = async (req, res) => {
  try {
    const carusel = await CaruselModel.create({ image: req.body.image });
    res.json({ message: 'Carusel created successfully', carusel });
  } catch (err) {
    console.error('Error creating carusel:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getCaruselDraft = async (req, res) => {
  try {
    const AllpendingCarusel = await CaruselModel.findAll({
      where: { status: 'draft' },
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ AllpendingCarusel });
  } catch (error) {
    console.error('Error getting pending carusels:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllCarusels = async (req, res) => {
  try {
    const allCarusels = await CaruselModel.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json(allCarusels);
  } catch (error) {
    console.error('Error getting carusels:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteCaruselDraft = async (req, res) => {
  try {
    const deleted = await CaruselModel.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Carusel draft not found' });
    res.status(200).json({ message: 'Carusel draft deleted successfully' });
  } catch (error) {
    console.error('Error deleting carusel draft:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.aprovedCarusel = async (req, res) => {
  try {
    const carusel = await CaruselModel.findByPk(req.params.id);
    if (!carusel) return res.status(404).json({ error: 'Carusel draft not found' });
    carusel.status = 'published';
    await carusel.save();
    res.status(200).json({ message: 'Carusel draft approved and published successfully', carusel });
  } catch (error) {
    console.error('Error updating carusel draft status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getCarusel = async (req, res) => {
  try {
    const publishedCarusels = await CaruselModel.findAll({
      where: { status: 'published' },
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ publishedCarusels });
  } catch (error) {
    console.error('Error getting published carusels:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
