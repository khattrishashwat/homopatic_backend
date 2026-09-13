const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const blogController = require('../../controllers/admin/blogController');
const multer = require('../../utils/multer');

// Accept 'featured_image', 'image', or 'file' field name
const uploadBlogImage = (req, res, next) => {
  multer.fields([
    { name: 'featured_image', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file =
        (req.files['featured_image'] && req.files['featured_image'][0]) ||
        (req.files['image'] && req.files['image'][0]) ||
        (req.files['file'] && req.files['file'][0]);
    }
    next();
  });
};

router.use(authMiddleware.requireAdmin);
router.post('/', uploadBlogImage, blogController.createBlog);
router.get('/', blogController.getAdminBlogs);
router.get('/admin/list', blogController.getAdminBlogs);
router.get('/:id', blogController.getBlogById);
router.patch('/:id', uploadBlogImage, blogController.updateBlog);
router.delete('/:id', blogController.deleteBlog);

module.exports = router;
