const couponService = require('../../services/couponService');

exports.listCoupons = async (req, res, next) => {
  try {
    const result = await couponService.listCoupons(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCouponById = async (req, res, next) => {
  try {
    const result = await couponService.getCouponById(req.params.id);
    res.json({
      success: true,
      data: result.coupon,
      usages: result.usages,
    });
  } catch (error) {
    next(error);
  }
};

exports.createCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.createCoupon(req.body, req.user?._id);
    res.status(201).json({
      success: true,
      data: coupon,
      message: 'Coupon created successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    res.json({
      success: true,
      data: coupon,
      message: 'Coupon updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleCouponStatus = async (req, res, next) => {
  try {
    const coupon = await couponService.toggleCouponStatus(req.params.id);
    res.json({
      success: true,
      data: coupon,
      message: `Coupon ${coupon.active ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    await couponService.deleteCoupon(req.params.id);
    res.json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getCouponUsage = async (req, res, next) => {
  try {
    const result = await couponService.getCouponUsage(req.params.id, req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};
