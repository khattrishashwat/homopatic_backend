const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const orderController = require('../../modules/orders/order.controller');

router.use(authMiddleware.requireAdmin);
router.get('/', orderController.listOrders);
router.get('/:id', orderController.getOrderById);
router.patch('/:id/status', orderController.updateOrderStatus);
router.patch('/:id/payment-status', orderController.updatePaymentStatus);

module.exports = router;
