const express = require('express');
const router = express.Router();
const productController = require('../../controllers/admin/productController');
const authMiddleware = require('../../middlewares/authMiddleware');
const multer = require('../../utils/multer');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:slug', productController.getProductBySlug);

// Admin routes (protected)
router.use(authMiddleware.requireAdmin);
router.post(
  '/',
  multer.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
  ]),
  productController.createProduct
);
router.get('/admin/list', productController.getAdminProducts);
router.patch(
  '/:id',
  multer.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
  ]),
  productController.updateProduct
);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
