const orderService = require('./order.service');
const validation = require('./order.validation');

exports.createOrder = async (req, res, next) => {
  try {
    validation.validateOrderPayload(req.body);
    const order = await orderService.createOrder({
      userId: req.user?._id,
      items: req.body.items,
      tax: req.body.tax,
      shipping_cost: req.body.shipping_cost,
      discount: req.body.discount,
      customer_name: req.body.customer_name,
      customer_email: req.body.customer_email,
      customer_phone: req.body.customer_phone,
      shipping_address: req.body.shipping_address,
      notes: req.body.notes,
      paymentId: req.body.paymentId,
    });
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.listOrders = async (req, res, next) => {
  try {
    const filters = {
      userId: req.user?._id,
      order_status: req.query.order_status,
      payment_status: req.query.payment_status,
      page: req.query.page,
      limit: req.query.limit,
    };
    const result = await orderService.listOrders(filters);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const order = await orderService.updatePaymentStatus(req.params.id, req.body.payment_status);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};
