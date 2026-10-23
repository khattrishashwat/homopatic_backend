const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const orderController = require('../../modules/orders/order.controller');

router.use(authMiddleware.requireAdmin);
router.get('/', orderController.listOrders);
router.get('/export/excel', orderController.exportExcel);
router.get('/:id', orderController.getOrderById);
router.patch('/:id/status', orderController.updateOrderStatus);
router.patch('/:id/payment-status', orderController.updatePaymentStatus);
router.post('/:id/dispatch', orderController.dispatchOrder);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
