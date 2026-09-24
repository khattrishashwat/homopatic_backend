const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Payment = require('../../models/Payment');
const couponService = require('../../services/couponService');
const paymentService = require('../../services/paymentService');

const buildOrderNumber = () => `ORD-${Date.now()}`;

exports.createOrder = async (data) => {
  const items = [];
  let subtotal = 0;

  for (const item of data.items) {
    const isValidId = item.productId && /^[0-9a-fA-F]{24}$/.test(String(item.productId));
    const product = isValidId
      ? await Product.findById(item.productId)
      : await Product.findOne({ slug: item.productSlug });
    if (!product) {
      const error = new Error(`Product not found: ${item.productId || item.productSlug}`);
      error.statusCode = 404;
      throw error;
    }
    if (!product.active || !product.in_stock) {
      const error = new Error(`Product is not available: ${product.name}`);
      error.statusCode = 400;
      throw error;
    }
    const quantity = Number(item.quantity) || 1;
    const price = Number(product.price);
    const lineTotal = price * quantity;
    subtotal += lineTotal;
    items.push({ product: product._id, quantity, price });
  }

  const tax = Number(data.tax || 0);
  const shipping_cost = Number(data.shipping_cost || 0);

  // Validate coupon on backend (never trust frontend discount blindly)
  let discount = 0;
  let couponId = null;
  let couponCode = null;
  let couponDiscountType = null;
  let couponDiscountValue = null;

  const rawCouponCode = data.coupon_code || data.couponCode || data.coupon;
  if (rawCouponCode && typeof rawCouponCode === 'string' && rawCouponCode.trim()) {
    const couponValidation = await couponService.validateCoupon({
      code: rawCouponCode.trim(),
      email: data.customer_email,
      mobile: data.customer_phone,
      items: items.map((it) => ({
        productId: it.product,
        quantity: it.quantity,
        price: it.price,
      })),
      subtotal,
    });

    discount = couponValidation.discountAmount;
    couponId = couponValidation.couponId;
    couponCode = couponValidation.couponCode;
    couponDiscountType = couponValidation.discountType;
    couponDiscountValue = couponValidation.discountValue;
  } else if (data.discount) {
    // If no coupon provided, discount defaults to 0 to prevent client spoofing
    discount = 0;
  }

  const total = Math.max(0, subtotal + tax + shipping_cost - discount);

  const isOnlinePayment =
    data.payment_method === 'online' ||
    data.payment_method === 'razorpay' ||
    data.payment_method === 'UPI' ||
    data.payment_method === 'Card' ||
    data.payment_method === 'NetBanking';

  const order = await Order.create({
    order_number: buildOrderNumber(),
    user: data.userId,
    items,
    subtotal,
    tax,
    shipping_cost,
    discount,
    total,
    coupon: couponId || undefined,
    coupon_code: couponCode || undefined,
    coupon_discount_type: couponDiscountType || undefined,
    coupon_discount_value: couponDiscountValue || undefined,
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    customer_phone: data.customer_phone,
    shipping_address: data.shipping_address || {},
    notes: data.notes,
    payment: data.paymentId,
    order_status: data.order_status || 'pending',
    payment_status: data.payment_status || (isOnlinePayment ? 'pending' : 'pending'),
  });

  // If online payment, generate Razorpay order with the final payable amount
  if (isOnlinePayment && total > 0) {
    try {
      const razorpayOrder = await paymentService.createOrder({
        amount: total,
        orderId: order._id,
        userId: data.userId,
        customerName: data.customer_name,
        customerEmail: data.customer_email,
        customerPhone: data.customer_phone,
        description: `Order #${order.order_number}`,
      });

      order.razorpay_order_id = razorpayOrder.orderId;
      order.payment = razorpayOrder.paymentId;
      await order.save();

      return {
        order,
        razorpayOrder,
      };
    } catch (err) {
      console.error('[OrderService] Razorpay order creation failed:', err.message);
      // Fallback: return created order without blocking
      return {
        order,
      };
    }
  }

  // If COD / PayLater / offline payment, record coupon usage immediately upon order placement
  if (!isOnlinePayment && couponId) {
    await couponService.recordCouponUsage({
      couponId,
      couponCode,
      orderId: order._id,
      customerEmail: order.customer_email,
      customerMobile: order.customer_phone,
      discountAmount: discount,
    });
  }

  return {
    order,
  };
};

exports.verifyOrderPayment = async ({ orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const payment = await paymentService.verifyPayment({
    orderId: order._id,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount: order.total,
  });

  order.payment_status = 'completed';
  order.razorpay_payment_id = razorpay_payment_id;
  order.razorpay_signature = razorpay_signature;
  if (payment) {
    order.payment = payment._id;
  }
  await order.save();

  // Record coupon usage now that payment is verified
  if (order.coupon_code) {
    await couponService.recordCouponUsage({
      couponId: order.coupon,
      couponCode: order.coupon_code,
      orderId: order._id,
      customerEmail: order.customer_email,
      customerMobile: order.customer_phone,
      discountAmount: order.discount,
    });
  }

  return order;
};

exports.getOrderById = async (id) => {
  const order = await Order.findById(id).populate('items.product payment user coupon');
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

exports.trackOrder = async (orderNumber, phone) => {
  const query = { order_number: orderNumber };
  if (phone) {
    query.customer_phone = phone.trim();
  }
  const order = await Order.findOne(query).populate('items.product payment coupon');
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

exports.listOrders = async (filters = {}) => {
  const query = {};
  if (filters.userId) {
    query.user = filters.userId;
  }
  if (filters.order_status) {
    query.order_status = filters.order_status;
  }
  if (filters.payment_status) {
    query.payment_status = filters.payment_status;
  }

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .populate('items.product payment user coupon');

  const total = await Order.countDocuments(query);

  return {
    data: orders,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

exports.updateOrderStatus = async (id, status) => {
  const order = await Order.findById(id);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  order.order_status = status;
  order.updated_at = new Date();
  return order.save();
};

exports.updatePaymentStatus = async (id, status) => {
  const order = await Order.findById(id);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  order.payment_status = status;
  order.updated_at = new Date();
  return order.save();
};
