const Notification = require('../../models/Notification');
const whatsappService = require('../../services/whatsappService');

exports.createNotification = async (data) => {
  const notification = await Notification.create({
    user: data.userId,
    title: data.title,
    message: data.message,
        type: data.type,

  });

  if (data.sendWhatsApp && data.whatsappNumber) {
    await whatsappService.sendWhatsAppMessage({
      to: data.whatsappNumber,
      body: `${data.title}\n${data.message}`,
    });
  }

  return notification;
};


exports.updateNotification = async (id, data) => {
  const notification = await Notification.findById(id);

  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  notification.title = data.title || notification.title;

  notification.message = data.message || notification.message;

  notification.type = data.type || notification.type;

  await notification.save();

  // Optional WhatsApp Send
  if (data.sendWhatsApp && data.whatsappNumber) {
    await whatsappService.sendWhatsAppMessage({
      to: data.whatsappNumber,
      body: `${notification.title}\n${notification.message}`,
    });
  }

  return notification;
};


exports.listNotifications = async (filters = {}) => {
  const query = {};
  if (filters.userId) {
    query.user = filters.userId;
  }
  if (filters.read !== undefined) {
    query.read = filters.read === 'true';
  }

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments(query);

  return {
    data: notifications,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

exports.markAsRead = async (id) => {
  const notification = await Notification.findById(id);
  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }
  notification.read = true;
  return notification.save();
};
