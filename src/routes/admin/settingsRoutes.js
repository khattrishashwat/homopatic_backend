const express = require('express');
const router = express.Router();
const settingsController = require('../../controllers/admin/settingsController');
const authMiddleware = require('../../middlewares/authMiddleware');
const multer = require('../../utils/multer');

// Public route
router.get('/', settingsController.getSiteSettings);

// Admin routes (protected)
router.use(authMiddleware.requireAdmin);

router.patch(
  '/',
  multer.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
  ]),
  settingsController.updateSiteSettings
);

// Appointment settings
router.get('/appointment', settingsController.getAppointmentSettings);
router.patch('/appointment', settingsController.updateAppointmentSettings);

// Payment settings
router.get('/payment', settingsController.getPaymentSettings);
router.patch('/payment', settingsController.updatePaymentSettings);

// Notification settings
router.get('/notification', settingsController.getNotificationSettings);
router.patch('/notification', settingsController.updateNotificationSettings);

// Chatbot settings
router.get('/chatbot', settingsController.getChatbotSettings);
router.patch('/chatbot', settingsController.updateChatbotSettings);

module.exports = router;
