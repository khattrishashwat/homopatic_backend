const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const notificationController = require('../../modules/notifications/notification.controller');

router.use(authMiddleware.requireAuth);
router.post('/', notificationController.createNotification);
router.get('/', notificationController.listNotifications);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
