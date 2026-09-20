const { answerQuestion } = require('../services/aiService');

const chat = async (req, res, next) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ message: 'A message is required.' });
    if (message.length > 2000) return res.status(400).json({ message: 'Message must be 2,000 characters or fewer.' });

    const result = await answerQuestion({ userId: req.user.id, question: message });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { chat };