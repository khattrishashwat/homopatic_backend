const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Payment = require('../../models/Payment');

const buildOrderNumber = () => `ORD-${Date.now()}`;

exports.createOrder = async (data) => {
  const items = [];
  let subtotal = 0;

  for (const item of data.items) {
    const product = item.productId
      ? await Product.findById(item.productId)
      : await Product.findOne({ slug: item.productSlug });
    if (!product) {
      const error = new Error(`Product not found: ${item.productId}`);
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
  const discount = Number(data.discount || 0);
  const total = subtotal + tax + shipping_cost - discount;

  return Order.create({
    order_number: buildOrderNumber(),
    user: data.userId,
    items,
    subtotal,
    tax,
    shipping_cost,
    discount,
    total,
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    customer_phone: data.customer_phone,
    shipping_address: data.shipping_address || {},
    notes: data.notes,
    payment: data.paymentId,
    order_status: data.order_status || 'pending',
    payment_status: data.payment_status || 'pending',
  });
};

exports.getOrderById = async (id) => {
  const order = await Order.findById(id).populate('items.product payment user');
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
    .populate('items.product payment user');

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
