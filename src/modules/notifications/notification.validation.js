exports.validateNotificationPayload = (payload) => {
  if (!payload.title) {
    const error = new Error('Notification title is required');
    error.statusCode = 400;
    throw error;
  }
  if (!payload.message) {
    const error = new Error('Notification message is required');
    error.statusCode = 400;
    throw error;
  }
};
