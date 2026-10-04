const notificationService = require('../../services/notificationService');
const emailService = require('../../services/emailService');

exports.sendContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !phone || !message) {
      const error = new Error('Name, phone, and message are required');
      error.statusCode = 400;
      throw error;
    }

    const contactMessage = await notificationService.sendContactNotification({ name, email, phone, message });

    // Send transactional emails to Admin and User asynchronously without blocking response
    emailService.sendContactFormEmails({
      name: name.trim(),
      email: email ? email.trim() : '',
      phone: phone.trim(),
      message: message.trim(),
      submittedAt: new Date(),
    }).catch((emailErr) => {
      console.error('[ContactController] Contact email dispatch error:', emailErr.message);
    });

    res.status(201).json({ success: true, data: contactMessage });
  } catch (error) {
    next(error);
  }
};
