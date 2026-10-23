const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Payment = require('../../models/Payment');
const couponService = require('../../services/couponService');
const paymentService = require('../../services/paymentService');
const emailService = require('../../services/emailService');

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
  // Delivery cost is strictly 80 rupees for all product purchases
  const shipping_cost = 80;

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

  const paymentMethodRaw = String(data.payment_method || 'online').toLowerCase();
  const isOnlinePayment =
    paymentMethodRaw === 'online' ||
    paymentMethodRaw === 'razorpay' ||
    paymentMethodRaw === 'upi' ||
    paymentMethodRaw === 'card' ||
    paymentMethodRaw === 'netbanking';

  if (!isOnlinePayment) {
    const error = new Error('Product purchase requires online payment. Offline / Cash on Delivery is not available for product orders.');
    error.statusCode = 400;
    throw error;
  }

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
    payment_status: 'pending',
  });

  // Generate Razorpay order for online payment
  if (total > 0) {
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
      const error = new Error(`Payment gateway initialization failed: ${err.message}`);
      error.statusCode = 502;
      throw error;
    }
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

  // Dispatch confirmation emails to customer and admin now that online payment is confirmed
  Order.findById(order._id)
    .populate('items.product payment user coupon')
    .then((populatedOrder) => {
      emailService.sendOrderEmails(populatedOrder || order);
    })
    .catch((err) => {
      console.error('[OrderService] Online order confirmation email dispatch error:', err.message);
    });

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

  if (filters.startDate || filters.endDate) {
    query.created_at = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      query.created_at.$gte = start;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.created_at.$lte = end;
    }
  }

  if (filters.search) {
    const term = String(filters.search).trim();
    query.$or = [
      { order_number: { $regex: term, $options: 'i' } },
      { customer_name: { $regex: term, $options: 'i' } },
      { customer_phone: { $regex: term, $options: 'i' } },
      { customer_email: { $regex: term, $options: 'i' } },
    ];
  }

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

exports.deleteOrder = async (id, options = {}) => {
  const order = await Order.findById(id);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const isPaid = order.payment_status === 'completed' || order.payment_status === 'paid';
  const isShipped = ['shipped', 'dispatched', 'delivered'].includes(order.order_status);

  if ((isPaid || isShipped) && !options.force) {
    const reason = isPaid && isShipped
      ? 'paid and shipped'
      : isPaid
      ? 'already paid'
      : 'already dispatched/shipped';
    const error = new Error(
      `Order #${order.order_number} is ${reason}. To prevent accidental data loss and protect financial audit history, explicit confirmation is required.`
    );
    error.statusCode = 400;
    error.requiresForce = true;
    throw error;
  }

  // Safeguard payment records: never delete payment transactions or audit history
  if (order.payment) {
    await Payment.findByIdAndUpdate(order.payment, {
      $set: {
        description: `Order #${order.order_number} (Deleted on ${new Date().toISOString()})`,
      },
      $unset: { order: 1 },
    });
  }
  await Payment.updateMany(
    { order: order._id },
    {
      $set: {
        description: `Order #${order.order_number} (Deleted on ${new Date().toISOString()})`,
      },
      $unset: { order: 1 },
    }
  );

  // Permanently delete order
  await Order.findByIdAndDelete(id);

  return {
    success: true,
    message: `Order #${order.order_number} deleted successfully`,
    order_number: order.order_number,
  };
};

exports.dispatchOrder = async (id, data = {}) => {
  const order = await Order.findById(id).populate('items.product payment user coupon');
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  // Prevent accidental duplicate dispatch operations
  if (order.order_status === 'shipped' || order.order_status === 'dispatched') {
    const error = new Error(
      `Order #${order.order_number} has already been dispatched.`
    );
    error.statusCode = 400;
    throw error;
  }

  if (['cancelled', 'refunded'].includes(order.order_status)) {
    const error = new Error(`Cannot dispatch an order with status: ${order.order_status}`);
    error.statusCode = 400;
    throw error;
  }

  // Validate payment status according to store fulfillment rules
  const isPaid = order.payment_status === 'completed' || order.payment_status === 'paid';
  if (!isPaid && !data.allowUnpaid) {
    const error = new Error(
      `Order #${order.order_number} cannot be dispatched because payment status is '${order.payment_status}'. Only paid orders can be dispatched.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Update order in database
  order.order_status = 'shipped';
  order.dispatch_date = new Date();
  if (data.tracking_number && String(data.tracking_number).trim()) {
    order.tracking_number = String(data.tracking_number).trim();
  }
  if (data.courier_name && String(data.courier_name).trim()) {
    order.courier_name = String(data.courier_name).trim();
  }
  if (data.notes && String(data.notes).trim()) {
    order.notes = order.notes ? `${order.notes}\n[Dispatch]: ${data.notes.trim()}` : `[Dispatch]: ${data.notes.trim()}`;
  }
  order.updated_at = new Date();
  await order.save();

  return order;
};

