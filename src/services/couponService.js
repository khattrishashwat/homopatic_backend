const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Order = require('../models/Order');

/**
 * Normalize email (trim + lowercase)
 */
const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

/**
 * Normalize mobile (strip non-digits, extract canonical 10-digit number for Indian numbers)
 */
const normalizeMobile = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
};

/**
 * Count previous successful/completed/paid usages of a coupon for a customer.
 * Evaluates BOTH email AND mobile:
 * If an order used this coupon with the same email OR same mobile, it counts.
 */
const getCustomerUsageCount = async (couponCode, email, mobile) => {
  const normEmail = normalizeEmail(email);
  const normMobile = normalizeMobile(mobile);

  if (!normEmail && !normMobile) {
    return 0;
  }

  const queryOr = [];
  if (normEmail) queryOr.push({ customerEmail: normEmail });
  if (normMobile) queryOr.push({ customerMobile: normMobile });

  const usages = await CouponUsage.find({
    couponCode: couponCode.toUpperCase().trim(),
    $or: queryOr,
  }).populate('order', 'order_status payment_status');

  // Filter out cancelled, refunded, or failed orders
  const validUsages = usages.filter((usage) => {
    if (!usage.order) return true; // If order doc was archived/removed, count usage
    const { order_status, payment_status } = usage.order;
    if (order_status === 'cancelled') return false;
    if (payment_status === 'failed' || payment_status === 'refunded') return false;
    return true;
  });

  return validUsages.length;
};

/**
 * Validate coupon application and calculate discount
 */
const validateCoupon = async ({ code, email, mobile, items = [], subtotal: providedSubtotal }) => {
  if (!code || typeof code !== 'string' || !code.trim()) {
    const error = new Error('Please enter a coupon code');
    error.statusCode = 400;
    throw error;
  }

  const couponCode = code.toUpperCase().trim();
  const coupon = await Coupon.findOne({ code: couponCode });

  if (!coupon) {
    const error = new Error('Invalid coupon code');
    error.statusCode = 404;
    throw error;
  }

  if (!coupon.active) {
    const error = new Error('This coupon is currently inactive');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    const error = new Error('This coupon is not active yet');
    error.statusCode = 400;
    throw error;
  }

  if (coupon.endDate && new Date(coupon.endDate) < now) {
    const error = new Error('This coupon has expired');
    error.statusCode = 400;
    throw error;
  }

  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    const error = new Error('This coupon has reached its total usage limit');
    error.statusCode = 400;
    throw error;
  }

  // Check customer usage limit (max 2 uses per customer rule)
  const normEmail = normalizeEmail(email);
  const normMobile = normalizeMobile(mobile);
  let customerUsageCount = 0;

  if (normEmail || normMobile) {
    customerUsageCount = await getCustomerUsageCount(couponCode, normEmail, normMobile);
    const limit = coupon.perCustomerLimit || 2;
    if (customerUsageCount >= limit) {
      const error = new Error(
        `Coupon usage limit reached. This coupon can only be used ${limit} times per customer.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Calculate eligible subtotal
  let eligibleSubtotal = 0;
  let totalSubtotal = 0;

  if (items && items.length > 0) {
    const applicableSet =
      coupon.applicableProducts && coupon.applicableProducts.length > 0
        ? new Set(coupon.applicableProducts.map((p) => String(p)))
        : null;

    for (const item of items) {
      const linePrice = Number(item.price || 0) * Number(item.quantity || 1);
      totalSubtotal += linePrice;

      if (!applicableSet || applicableSet.has(String(item.productId))) {
        eligibleSubtotal += linePrice;
      }
    }
  } else if (providedSubtotal !== undefined) {
    totalSubtotal = Number(providedSubtotal) || 0;
    eligibleSubtotal = totalSubtotal;
  }

  if (coupon.applicableProducts && coupon.applicableProducts.length > 0 && eligibleSubtotal <= 0) {
    const error = new Error('This coupon is not applicable to the products in your cart');
    error.statusCode = 400;
    throw error;
  }

  if (coupon.minimumOrderValue > 0 && totalSubtotal < coupon.minimumOrderValue) {
    const error = new Error(
      `Minimum order value of ₹${coupon.minimumOrderValue} required to use this coupon`
    );
    error.statusCode = 400;
    throw error;
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = Math.round((eligibleSubtotal * coupon.discountValue) / 100);
    if (coupon.maximumDiscount !== null && coupon.maximumDiscount !== undefined && coupon.maximumDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maximumDiscount);
    }
  } else {
    // FIXED discount
    discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
  }

  // Never allow discount to exceed subtotal
  discountAmount = Math.max(0, Math.min(discountAmount, totalSubtotal));
  const finalAmount = Math.max(0, totalSubtotal - discountAmount);

  const limit = coupon.perCustomerLimit || 2;
  const remainingUsage = Math.max(0, limit - customerUsageCount - 1);

  return {
    success: true,
    couponCode: coupon.code,
    couponId: coupon._id,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    subtotal: totalSubtotal,
    finalAmount,
    usageCount: customerUsageCount,
    perCustomerLimit: limit,
    remainingUsage,
  };
};

/**
 * Record coupon usage for a confirmed order.
 * Atomic and idempotent: prevents double recording for the same order.
 */
const recordCouponUsage = async ({
  couponId,
  couponCode,
  orderId,
  customerEmail,
  customerMobile,
  discountAmount,
}) => {
  if (!couponCode || !orderId) return null;

  const normEmail = normalizeEmail(customerEmail);
  const normMobile = normalizeMobile(customerMobile);
  const code = couponCode.toUpperCase().trim();

  // Check if usage already recorded for this order (idempotency)
  const existing = await CouponUsage.findOne({ order: orderId });
  if (existing) {
    return existing;
  }

  // Find coupon
  const coupon = couponId ? await Coupon.findById(couponId) : await Coupon.findOne({ code });
  if (!coupon) {
    console.warn(`[CouponService] Coupon not found for usage recording: ${code}`);
    return null;
  }

  // Final concurrency check: verify customer limit before creating usage
  const currentCount = await getCustomerUsageCount(code, normEmail, normMobile);
  const limit = coupon.perCustomerLimit || 2;
  if (currentCount >= limit) {
    console.warn(
      `[CouponService] Customer ${normEmail}/${normMobile} already reached usage limit (${limit}) for ${code}`
    );
  }

  const usage = await CouponUsage.create({
    coupon: coupon._id,
    couponCode: code,
    order: orderId,
    customerEmail: normEmail,
    customerMobile: normMobile,
    discountAmount: Number(discountAmount) || 0,
    usedAt: new Date(),
  });

  // Increment total coupon usedCount atomically
  await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });

  return usage;
};

// ==========================================
// Admin Coupon Management Methods
// ==========================================

const listCoupons = async (query = {}) => {
  const filter = {};
  if (query.active !== undefined) {
    filter.active = query.active === 'true' || query.active === true;
  }
  if (query.search) {
    filter.code = { $regex: String(query.search).trim(), $options: 'i' };
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [coupons, total] = await Promise.all([
    Coupon.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('applicableProducts', 'name slug price image'),
    Coupon.countDocuments(filter),
  ]);

  return {
    data: coupons,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getCouponById = async (id) => {
  const coupon = await Coupon.findById(id).populate('applicableProducts', 'name slug price image');
  if (!coupon) {
    const error = new Error('Coupon not found');
    error.statusCode = 404;
    throw error;
  }

  // Also fetch total usages and recent usages
  const usages = await CouponUsage.find({ coupon: id })
    .sort({ usedAt: -1 })
    .limit(20)
    .populate('order', 'order_number total created_at order_status payment_status');

  return {
    coupon,
    usages,
  };
};

const createCoupon = async (data, userId) => {
  if (!data.code || !data.code.trim()) {
    const error = new Error('Coupon code is required');
    error.statusCode = 400;
    throw error;
  }

  const code = data.code.toUpperCase().trim();
  const existing = await Coupon.findOne({ code });
  if (existing) {
    const error = new Error(`Coupon with code "${code}" already exists`);
    error.statusCode = 409;
    throw error;
  }

  const coupon = await Coupon.create({
    code,
    description: data.description || '',
    discountType: data.discountType || 'PERCENTAGE',
    discountValue: Number(data.discountValue) || 0,
    minimumOrderValue: Number(data.minimumOrderValue) || 0,
    maximumDiscount: data.maximumDiscount ? Number(data.maximumDiscount) : null,
    usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
    perCustomerLimit: data.perCustomerLimit ? Number(data.perCustomerLimit) : 2,
    startDate: data.startDate ? new Date(data.startDate) : new Date(),
    endDate: data.endDate ? new Date(data.endDate) : null,
    active: data.active !== undefined ? (data.active === 'true' || data.active === true) : true,
    applicableProducts: Array.isArray(data.applicableProducts) ? data.applicableProducts : [],
    created_by: userId,
  });

  return coupon;
};

const updateCoupon = async (id, data) => {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    const error = new Error('Coupon not found');
    error.statusCode = 404;
    throw error;
  }

  if (data.code && data.code.toUpperCase().trim() !== coupon.code) {
    const code = data.code.toUpperCase().trim();
    const existing = await Coupon.findOne({ code, _id: { $ne: id } });
    if (existing) {
      const error = new Error(`Coupon with code "${code}" already exists`);
      error.statusCode = 409;
      throw error;
    }
    coupon.code = code;
  }

  const fields = [
    'description',
    'discountType',
    'discountValue',
    'minimumOrderValue',
    'maximumDiscount',
    'usageLimit',
    'perCustomerLimit',
    'startDate',
    'endDate',
    'active',
    'applicableProducts',
  ];

  fields.forEach((field) => {
    if (data[field] !== undefined) {
      if (field === 'discountValue' || field === 'minimumOrderValue' || field === 'perCustomerLimit') {
        coupon[field] = Number(data[field]);
      } else if (field === 'maximumDiscount' || field === 'usageLimit') {
        coupon[field] = data[field] ? Number(data[field]) : null;
      } else if (field === 'startDate' || field === 'endDate') {
        coupon[field] = data[field] ? new Date(data[field]) : null;
      } else if (field === 'active') {
        coupon.active = data.active === 'true' || data.active === true;
      } else {
        coupon[field] = data[field];
      }
    }
  });

  await coupon.save();
  return coupon;
};

const toggleCouponStatus = async (id) => {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    const error = new Error('Coupon not found');
    error.statusCode = 404;
    throw error;
  }
  coupon.active = !coupon.active;
  await coupon.save();
  return coupon;
};

const deleteCoupon = async (id) => {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) {
    const error = new Error('Coupon not found');
    error.statusCode = 404;
    throw error;
  }
  // Remove coupon usage records associated with this coupon if desired
  await CouponUsage.deleteMany({ coupon: id });
  return coupon;
};

const getCouponUsage = async (couponId, query = {}) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = { coupon: couponId };

  const [usages, total] = await Promise.all([
    CouponUsage.find(filter)
      .sort({ usedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('order', 'order_number total customer_name customer_email customer_phone order_status payment_status created_at'),
    CouponUsage.countDocuments(filter),
  ]);

  return {
    data: usages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  normalizeEmail,
  normalizeMobile,
  getCustomerUsageCount,
  validateCoupon,
  recordCouponUsage,
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getCouponUsage,
};
