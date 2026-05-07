const paymentService = require('../../services/paymentService');

exports.listPayments = async (req, res, next) => {
  try {
    const filters = {
      patientId: req.query.patientId,
      status: req.query.status,
      payment_method: req.query.payment_method,
      page: req.query.page,
      limit: req.query.limit,
    };
    const payments = await paymentService.getPaymentHistory(req.query.userId, filters);
    res.json({ success: true, data: payments.data, pagination: payments.pagination });
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
    const result = await paymentService.refundPayment(req.params.id, req.body.reason);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
