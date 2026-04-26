const { Blog, CaruselModel, User } = require('../models');

const authorInclude = {
  model: User,
  as: 'author',
  attributes: ['id', 'name', 'phone', 'image'],
};

exports.createBlog = async (req, res) => {
  const { title, content, image, category } = req.body;
  if (!category) {
    return res.status(400).json({ error: 'Category is required.' });
  }
  try {
    const blog = await Blog.create({
      title,
      content,
      image,
      category,
      authorId: req.user._id || req.user.id,
    });
    const populated = await Blog.findByPk(blog.id, { include: [authorInclude] });
    res.status(201).json({ message: 'Blog created successfully', blog: populated });
  } catch (error) {
    console.error('Error creating blog:', error);
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
    blog.status = 'published';
    await blog.save();
    res.status(200).json({ message: 'Blog published successfully', blog });
  } catch (error) {
    console.error('Error updating blog status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
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
    blog.tags = tags;
    if (status) blog.status = status;
    await blog.save();
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
