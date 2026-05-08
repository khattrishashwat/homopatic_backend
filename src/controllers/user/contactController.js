const notificationService = require('../../services/notificationService');

exports.sendContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !phone || !message) {
      const error = new Error('Name, phone, and message are required');
      error.statusCode = 400;
      throw error;
    }
    const contactMessage = await notificationService.sendContactNotification({ name, email, phone, message });
    res.status(201).json({ success: true, data: contactMessage });
  } catch (error) {
    next(error);
  }
};
