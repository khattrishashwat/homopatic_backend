const Notification = require('../models/Notification');

exports.sendContactNotification = async ({ name, email, phone, message }) => {
  return Notification.create({
    user: null,
    title: 'Contact request',
    message: `Message from ${name} (${phone}${email ? `, ${email}` : ''}): ${message}`,
  });
};

exports.createNotification = async (userId, title, message) => {
  return Notification.create({ user: userId, title, message });
};
