const couponService = require('../../services/couponService');

/**
 * Validate coupon for customer checkout
 * Evaluates business rule: max 2 uses per customer across email and mobile
 */
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, email, mobile, items, subtotal } = req.body;

    const result = await couponService.validateCoupon({
      code,
      email,
      mobile,
      items,
      subtotal,
    });

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      data: result,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
