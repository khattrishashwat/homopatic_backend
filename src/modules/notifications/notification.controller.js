const notificationService = require('./notification.service');
const validation = require('./notification.validation');

exports.createNotification = async (req, res, next) => {
  try {
    validation.validateNotificationPayload(req.body);
    const notification = await notificationService.createNotification({
      userId: req.body.userId || req.user?._id,
      title: req.body.title,
      message: req.body.message,
      sendWhatsApp: req.body.sendWhatsApp,
      whatsappNumber: req.body.whatsappNumber,
    });
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

exports.listNotifications = async (req, res, next) => {
  try {
    const filters = {
      userId: req.user?._id,
      read: req.query.read,
      page: req.query.page,
      limit: req.query.limit,
    };
    const result = await notificationService.listNotifications(filters);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id);
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};
