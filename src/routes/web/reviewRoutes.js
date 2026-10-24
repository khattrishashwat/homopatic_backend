const express = require('express');
const router = express.Router();
const reviewController = require('../../controllers/user/reviewController');
const { optionalAuth } = require('../../middlewares/authMiddleware');

// Product reviews
router.get('/products/:slug/reviews', reviewController.getProductReviews);
router.post('/products/:slug/reviews', optionalAuth, reviewController.createProductReview);

// Blog comments
router.get('/blogs/:slug/comments', reviewController.getBlogComments);
router.post('/blogs/:slug/comments', optionalAuth, reviewController.createBlogComment);
router.get('/blog/:slug/comments', reviewController.getBlogComments);
router.post('/blog/:slug/comments', optionalAuth, reviewController.createBlogComment);

module.exports = router;
