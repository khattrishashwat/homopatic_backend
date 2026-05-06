const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/user/paymentController');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware.requireAuth);

router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/history', paymentController.getPaymentHistory);
router.get('/:id', paymentController.getPaymentDetails);

module.exports = router;
