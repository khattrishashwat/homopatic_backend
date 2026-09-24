const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const couponAdminController = require('../../controllers/admin/couponAdminController');

router.use(authMiddleware.requireAdmin);

router.get('/', couponAdminController.listCoupons);
router.post('/', couponAdminController.createCoupon);
router.get('/:id', couponAdminController.getCouponById);
router.patch('/:id', couponAdminController.updateCoupon);
router.put('/:id', couponAdminController.updateCoupon);
router.patch('/:id/status', couponAdminController.toggleCouponStatus);
router.delete('/:id', couponAdminController.deleteCoupon);
router.get('/:id/usage', couponAdminController.getCouponUsage);

module.exports = router;
