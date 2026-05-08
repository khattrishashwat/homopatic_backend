const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const orderController = require('../../modules/orders/order.controller');

router.post('/', orderController.createOrder);

router.use(authMiddleware.requireAuth);
router.get('/', orderController.listOrders);
router.get('/:id', orderController.getOrderById);

module.exports = router;
