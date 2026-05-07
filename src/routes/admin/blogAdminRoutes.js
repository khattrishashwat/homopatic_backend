const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const blogController = require('../../controllers/admin/blogController');
const multer = require('../../utils/multer');

router.use(authMiddleware.requireAdmin);
router.post('/', multer.single('featured_image'), blogController.createBlog);
router.get('/', blogController.getAdminBlogs);
router.get('/admin/list', blogController.getAdminBlogs);
router.patch('/:id', multer.single('featured_image'), blogController.updateBlog);
router.delete('/:id', blogController.deleteBlog);

module.exports = router;
