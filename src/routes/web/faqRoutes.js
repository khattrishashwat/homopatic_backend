const express = require('express');
const router = express.Router();
const faqController = require('../../controllers/user/faqController');

// Public route for fetching active FAQs
router.get('/', faqController.getActiveFaqs);

module.exports = router;
