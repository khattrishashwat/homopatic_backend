const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const paymentAdminController = require('../../controllers/admin/paymentAdminController');

router.use(authMiddleware.requireAdmin);
router.get('/', paymentAdminController.listPayments);
router.get('/:id', paymentAdminController.getPaymentDetails);
router.patch('/:id/refund', paymentAdminController.refundPayment);

module.exports = router;
