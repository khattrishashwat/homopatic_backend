const notificationService = require('../../services/notificationService');

exports.sendContactMessage = async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    const contactMessage = await notificationService.sendContactNotification({ name, email, message });
    res.status(201).json({ success: true, data: contactMessage });
  } catch (error) {
    next(error);
  }
};
