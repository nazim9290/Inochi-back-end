const {
  Rpage,
  ImageTopCarousel,
  Team,
  ContacPage,
  Review,
  Seminer,
  Video,
  Brand,
  User,
} = require('../models');

const teamAuthorInclude = {
  model: User,
  as: 'author',
  attributes: ['id', 'name', 'email', 'image'],
};

exports.contacpageCreate = async (req, res) => {
  try {
    const { title, content, image } = req.body;
    await ContacPage.create({ title, content, image });
    return res.status(201).json({ message: 'Page data added successfully' });
  } catch (err) {
    console.error('Error creating contact page:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.contacpageData = async (req, res) => {
  try {
    const contacpages = await ContacPage.findAll({
      order: [['createdAt', 'DESC']],
      limit: 1,
    });
    return res.status(200).json({ contacpages });
  } catch (err) {
    console.error('Error fetching data:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.registerPage = async (req, res) => {
  try {
    const { Address, Contactinfo, timeSchedule, title, subtitle } = req.body;
    await Rpage.create({ Address, Contactinfo, timeSchedule, title, subtitile: subtitle });
    return res.status(201).json({ message: 'Page data added successfully' });
  } catch (error) {
    console.error('Error adding page data:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.registerPageDataUpdate = async (req, res) => {
  try {
    const { Address, Contactinfo, timeSchedule, title, subtitle } = req.body;
    const page = await Rpage.findOne({ order: [['createdAt', 'DESC']] });
    if (!page) {
      return res.status(404).json({ error: 'Page data not found' });
    }
    Object.assign(page, {
      Address,
      Contactinfo,
      timeSchedule,
      title,
      subtitile: subtitle,
    });
    await page.save();
    return res.status(200).json({ message: 'Page data updated successfully', updatedPageData: page });
  } catch (error) {
    console.error('Error updating page data:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.registerPageData = async (req, res) => {
  try {
    const pageData = await Rpage.findAll({ order: [['createdAt', 'DESC']] });
    return res.status(200).json({ pageData });
  } catch (error) {
    console.error('Error fetching page data:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.topCarusel = async (req, res) => {
  try {
    const topImage = await ImageTopCarousel.findOne({ order: [['createdAt', 'DESC']] });
    return res.status(200).json({ image: topImage });
  } catch (error) {
    console.error('Error fetching top carusel:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.topCaruselDataCreate = async (req, res) => {
  try {
    const { image } = req.body;
    const existing = await ImageTopCarousel.findOne({ order: [['createdAt', 'DESC']] });
    if (existing) {
      existing.image = image;
      await existing.save();
      return res.status(200).json({ message: 'Top carousel image updated successfully', image: existing });
    }
    const created = await ImageTopCarousel.create({ image });
    return res.status(201).json({ message: 'Top carousel image created successfully', image: created });
  } catch (err) {
    console.error('Error updating/creating top carousel image:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getTopCaruselImage = async (req, res) => {
  try {
    const topImage = await ImageTopCarousel.findOne({ order: [['createdAt', 'DESC']] });
    if (!topImage) {
      return res.status(404).json({ error: 'Top carousel image not found' });
    }
    return res.status(200).json({ image: topImage.image });
  } catch (error) {
    console.error('Error fetching top carousel image:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createTeam = async (req, res) => {
  const { designation, position, name, image, facebook, twiter, email, linkdin, youtube } = req.body;
  try {
    const team = await Team.create({
      name,
      position,
      designation,
      authorId: req.user._id || req.user.id,
      image,
      facebook,
      twiter,
      email,
      linkdin,
      youtube,
    });
    const populated = await Team.findByPk(team.id, { include: [teamAuthorInclude] });
    res.status(201).json({ message: 'Team Member created successfully', team: populated });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.allTeam = async (req, res) => {
  try {
    const team = await Team.findAll({
      include: [teamAuthorInclude],
      order: [['position', 'ASC']],
    });
    res.status(200).json({ team });
  } catch (error) {
    console.error('Error getting team:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteSingeteam = async (req, res) => {
  try {
    const deleted = await Team.destroy({ where: { id: req.params._id } });
    if (!deleted) return res.status(404).json({ error: 'Team member not found' });
    res.status(200).json({ message: 'Team member deleted successfully' });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.ReviewCreate = async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { review } = req.body;
  if (!review || !review.length) {
    return res.status(400).json({ error: 'review required' });
  }
  try {
    const created = await Review.create({ review, postedby: userId });
    res.json(created);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(400).json({ error: 'Server Error' });
  }
};

exports.Review = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      include: [
        { model: User, as: 'postedByUser', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(400).json({ error: 'Server Error' });
  }
};

exports.createSeminar = async (req, res) => {
  const { subtitle, title, image, time, date } = req.body;
  try {
    await Seminer.create({ title, subtitle, image, time, date });
    res.status(201).json({ message: 'Seminer created successfully' });
  } catch (error) {
    console.error('Error creating Seminer:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.allSeminer = async (req, res) => {
  try {
    const seminer = await Seminer.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ seminer });
  } catch (error) {
    console.error('Error getting seminers:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteSingeSeminer = async (req, res) => {
  try {
    const deleted = await Seminer.destroy({ where: { id: req.params._id } });
    if (!deleted) return res.status(404).json({ error: 'Seminer not found' });
    res.status(200).json({ message: 'Seminer deleted successfully' });
  } catch (error) {
    console.error('Error deleting Seminer:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.AddVideoPlaylist = async (req, res) => {
  const { playlistTitle, title } = req.body;
  try {
    const video = await Video.create({ playlistTitle, title });
    res.status(201).json({ message: 'Video playlist added successfully', video });
  } catch (error) {
    console.error('Error adding playlist:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllPlaylist = async (req, res) => {
  try {
    const video = await Video.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ video });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.AllBrand = async (req, res) => {
  const { image } = req.body;
  try {
    const brand = await Brand.create({ image });
    res.status(201).json({ message: 'Brand created successfully', brand });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllBrand = async (req, res) => {
  try {
    const brand = await Brand.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ brand });
  } catch (error) {
    console.error('Error getting brands:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteSingeBrandByID = async (req, res) => {
  try {
    const deleted = await Brand.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Brand not found' });
    res.status(200).json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
