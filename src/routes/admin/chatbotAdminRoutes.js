const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const chatbotAdminController = require('../../controllers/admin/chatbotAdminController');

// All admin Chatbot Q&A routes are protected by admin authorization
router.use(authMiddleware.requireAdmin);

router.get('/', chatbotAdminController.getAllQuestions);
router.post('/', chatbotAdminController.createQuestion);
router.post('/bulk', chatbotAdminController.bulkUploadQuestions);
router.get('/:id', chatbotAdminController.getQuestionById);
router.put('/:id', chatbotAdminController.updateQuestion);
router.patch('/:id', chatbotAdminController.updateQuestion);
router.delete('/:id', chatbotAdminController.deleteQuestion);
router.patch('/:id/status', chatbotAdminController.toggleQuestionStatus);

module.exports = router;
