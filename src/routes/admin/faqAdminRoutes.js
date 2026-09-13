const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const faqAdminController = require('../../controllers/admin/faqAdminController');

// All admin FAQ routes are protected by admin authorization
router.use(authMiddleware.requireAdmin);

router.get('/', faqAdminController.getAllFaqs);
router.post('/', faqAdminController.createFaq);
router.get('/:id', faqAdminController.getFaqById);
router.put('/:id', faqAdminController.updateFaq);
router.patch('/:id', faqAdminController.updateFaq);
router.delete('/:id', faqAdminController.deleteFaq);
router.patch('/:id/status', faqAdminController.toggleFaqStatus);

module.exports = router;
