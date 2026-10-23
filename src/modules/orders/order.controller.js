const orderService = require('./order.service');
const validation = require('./order.validation');
const excelService = require('../../services/excelService');

exports.createOrder = async (req, res, next) => {
  try {
    validation.validateOrderPayload(req.body);
    const result = await orderService.createOrder({
      userId: req.user?._id,
      items: req.body.items,
      tax: req.body.tax,
      shipping_cost: req.body.shipping_cost,
      discount: req.body.discount,
      coupon_code: req.body.coupon_code || req.body.couponCode || req.body.coupon,
      payment_method: req.body.payment_method || req.body.paymentMethod,
      customer_name: req.body.customer_name,
      customer_email: req.body.customer_email,
      customer_phone: req.body.customer_phone,
      shipping_address: req.body.shipping_address,
      notes: req.body.notes,
      paymentId: req.body.paymentId,
      order_status: req.body.order_status,
      payment_status: req.body.payment_status,
    });
    res.status(201).json({
      success: true,
      data: result.order,
      razorpayOrder: result.razorpayOrder,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyOrderPayment = async (req, res, next) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      const error = new Error('Missing payment verification parameters');
      error.statusCode = 400;
      throw error;
    }
    const order = await orderService.verifyOrderPayment({
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    res.json({
      success: true,
      data: order,
      message: 'Payment verified and order confirmed successfully',
    });
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

exports.trackOrder = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { phone } = req.query;
    const order = await orderService.trackOrder(orderNumber, phone);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.listOrders = async (req, res, next) => {
  try {
    const filters = {
      userId: req.query.userId,
      order_status: req.query.order_status,
      payment_status: req.query.payment_status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
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

exports.deleteOrder = async (req, res, next) => {
  try {
    const force = req.query.force === 'true' || req.body?.force === true;
    const result = await orderService.deleteOrder(req.params.id, { force });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.dispatchOrder = async (req, res, next) => {
  try {
    const { tracking_number, courier_name, notes, allowUnpaid } = req.body || {};
    const order = await orderService.dispatchOrder(req.params.id, {
      tracking_number,
      courier_name,
      notes,
      allowUnpaid,
    });
    res.json({
      success: true,
      data: order,
      message: `Order #${order.order_number} marked as dispatched successfully`,
    });
  } catch (error) {
    next(error);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const result = await excelService.exportOrders({ query: req.query, format });
    res.json({
      success: true,
      message: `Exported ${result.count} orders to ${result.filename}`,
      data: {
        downloadUrl: result.downloadUrl,
        filename: result.filename,
        s3Key: result.key,
        count: result.count,
      },
    });
  } catch (error) {
    next(error);
  }
};


