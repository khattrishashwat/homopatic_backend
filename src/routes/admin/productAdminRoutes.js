const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const productController = require('../../controllers/admin/productController');
const multer = require('../../utils/multer');

router.use(authMiddleware.requireAdmin);
router.post(
  '/',
  multer.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
  ]),
  productController.createProduct
);
router.get('/', productController.getAdminProducts);
router.get('/admin/list', productController.getAdminProducts);
router.get('/:id', productController.getProductById);
router.patch(
  '/:id',
  multer.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
  ]),
  productController.updateProduct
);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
