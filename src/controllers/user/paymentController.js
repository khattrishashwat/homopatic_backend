const paymentService = require('../../services/paymentService');

exports.createOrder = async (req, res, next) => {
  try {
    const orderData = {
      amount: req.body.amount,
      appointmentId: req.body.appointmentId,
      patientId: req.body.patientId,
      userId: req.user._id,
      description: req.body.description,
      customerName: req.body.customerName || req.user.name,
      customerEmail: req.body.customerEmail || req.user.email,
      customerPhone: req.body.customerPhone || req.user.phone,
    };

    const order = await paymentService.createOrder(orderData);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.verifyPayment(req.body);
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentDetails = async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentDetails(req.params.id);
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

exports.refundPayment = async (req, res, next) => {
  try {
    const result = await paymentService.refundPayment(
      req.params.paymentId,
      req.body.reason
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentHistory = async (req, res, next) => {
  try {
    const payments = await paymentService.getPaymentHistory(req.user._id, req.query);
    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};
