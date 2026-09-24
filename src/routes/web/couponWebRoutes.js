const express = require('express');
const router = express.Router();
const couponWebController = require('../../controllers/web/couponWebController');

router.post('/validate', couponWebController.validateCoupon);

module.exports = router;
