const express = require('express');
const router = express.Router();
const reviewAdminController = require('../../controllers/admin/reviewAdminController');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware.requireAdmin);

router.get('/', reviewAdminController.getAllReviews);
router.post('/', reviewAdminController.createReview);
router.patch('/:id', reviewAdminController.updateReview);
router.delete('/:id', reviewAdminController.deleteReview);

module.exports = router;
