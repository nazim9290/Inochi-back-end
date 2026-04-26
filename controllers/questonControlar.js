const { Question } = require('../models');

exports.createQuestion = async (req, res) => {
  const { questionName, first, second, third, answer, category } = req.body;

  if (!category) {
    return res.status(400).json({ error: 'Category Must Need' });
  }
  if (!questionName || !first || !second || !third || !answer) {
    return res.status(400).json({
      error: 'All fields are required. Please fill in all the fields.',
    });
  }

  try {
    const question = await Question.create({
      questionName,
      first,
      second,
      third,
      answer,
      category,
      incorrectAnswer: [first, second, third],
    });
    return res.status(201).json({ ok: true, question });
  } catch (err) {
    console.error('Error creating question:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const findByCategory = (category) => async (req, res) => {
  try {
    const questions = await Question.findAll({
      where: { category },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });
    res.json(questions);
  } catch (err) {
    console.error(`Error fetching ${category} questions:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20,
    });
    res.json(questions);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getQuestionByVocabulary = findByCategory('Vocabulary');
exports.getQuestionByGrammer = findByCategory('Grammer');
exports.getQuestionByReading = findByCategory('Reading');
exports.getQuestionByKanji = findByCategory('Kanji');
exports.getQuestionByFullOne = findByCategory('FullOne');
exports.getQuestionByFullTwo = findByCategory('FullTwo');

exports.updateQuestion = async (req, res) => {
  const { questionName, first, second, third, answer } = req.body;
  const { _id } = req.params;
  try {
    const question = await Question.findByPk(_id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    Object.assign(question, {
      questionName,
      answer,
      incorrectAnswer: [first, second, third],
    });
    await question.save();
    res.json(question);
  } catch (err) {
    console.error('Error updating question:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const deleted = await Question.destroy({ where: { id: req.params._id } });
    if (!deleted) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error('Error deleting question:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.totalPosts = async (req, res) => {
  try {
    const total = await Question.count();
    res.json(total);
  } catch (err) {
    console.error('Error counting questions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.singleQuestion = async (req, res) => {
  try {
    const question = await Question.findByPk(req.params._id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (err) {
    console.error('Error fetching single question:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
