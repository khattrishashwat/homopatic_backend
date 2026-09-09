const chatService = require('../../services/chatService');

exports.sendMessage = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({ success: false, message: 'Message cannot exceed 1000 characters' });
    }

    const result = await chatService.generateReply(message.trim(), sessionId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getConfig = async (req, res, next) => {
  try {
    const config = await chatService.getConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};
