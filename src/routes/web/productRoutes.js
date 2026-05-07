const express = require('express');
const router = express.Router();
const productController = require('../../controllers/admin/productController');

router.get('/', productController.getAllProducts);
router.get('/:slug', productController.getProductBySlug);

module.exports = router;
