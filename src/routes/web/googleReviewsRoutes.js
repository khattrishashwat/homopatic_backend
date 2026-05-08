const express = require('express');
const googleReviewsController = require('../../controllers/user/googleReviewsController');

const router = express.Router();

router.get('/', googleReviewsController.getGoogleReviews);

module.exports = router;
