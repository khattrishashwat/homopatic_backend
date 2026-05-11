const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const categoryController = require('../../controllers/admin/categoryController');

router.use(authMiddleware.requireAdmin);

// CRUD routes
router.post('/', categoryController.createCategory);
router.get('/', categoryController.getAllCategories);
router.get('/stats', categoryController.getCategoryStats);
router.get('/:id', categoryController.getCategoryById);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
