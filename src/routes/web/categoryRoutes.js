const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/admin/categoryController');

// Public routes - no auth required
router.get('/', categoryController.getActiveCategories);
router.get('/:slug', categoryController.getCategoryBySlug);

module.exports = router;
