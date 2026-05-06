const express = require('express');
const router = express.Router();
const blogController = require('../../controllers/admin/blogController');
const authMiddleware = require('../../middlewares/authMiddleware');
const multer = require('../../utils/multer');

// Public routes
router.get('/', blogController.getAllBlogs);
router.get('/:slug', blogController.getBlogBySlug);

// Admin routes (protected)
router.use(authMiddleware.requireAdmin);
router.post('/', multer.single('featured_image'), blogController.createBlog);
router.get('/admin/list', blogController.getAdminBlogs);
router.patch('/:id', multer.single('featured_image'), blogController.updateBlog);
router.delete('/:id', blogController.deleteBlog);

module.exports = router;
