exports.validateNotificationPayload = (payload) => {
  if (!payload.title || payload.title.trim() === '') {
    const error = new Error('Notification title is required');
    error.statusCode = 400;
    throw error;
  }

  if (!payload.message || payload.message.trim() === '') {
    const error = new Error('Notification message is required');
    error.statusCode = 400;
    throw error;
  }
};