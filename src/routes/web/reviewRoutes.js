const express = require('express');
const router = express.Router();
const reviewController = require('../../controllers/user/reviewController');

// Product reviews
router.get('/products/:slug/reviews', reviewController.getProductReviews);
router.post('/products/:slug/reviews', reviewController.createProductReview);

// Blog comments
router.get('/blogs/:slug/comments', reviewController.getBlogComments);
router.post('/blogs/:slug/comments', reviewController.createBlogComment);
router.get('/blog/:slug/comments', reviewController.getBlogComments);
router.post('/blog/:slug/comments', reviewController.createBlogComment);

module.exports = router;
