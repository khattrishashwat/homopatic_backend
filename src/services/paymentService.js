const Payment = require('../models/Payment');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (data) => {
  try {
    const options = {
      amount: data.amount * 100, // Amount in paise
      currency: 'INR',
      receipt: `appointment_${Date.now()}`,
      description: data.description || 'Appointment Payment',
      customer_notify: 1,
      notes: {
        appointment_id: data.appointmentId,
        user_id: data.userId,
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save payment record to DB
    const payment = await Payment.create({
      razorpay_order_id: razorpayOrder.id,
      user: data.userId,
      appointment: data.appointmentId,
      amount: data.amount,
      currency: 'INR',
      description: data.description,
      customer_name: data.customerName,
      customer_email: data.customerEmail,
      customer_phone: data.customerPhone,
      status: 'created',
    });

    return {
      orderId: razorpayOrder.id,
      amount: data.amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
    };
  } catch (error) {
    const err = new Error(`Failed to create Razorpay order: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

exports.verifyPayment = async (data) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      const error = new Error('Invalid payment signature');
      error.statusCode = 400;
      throw error;
    }

    // Get payment details from Razorpay
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

    // Update payment record in DB
    const payment = await Payment.findOneAndUpdate(
      { razorpay_order_id },
      {
        razorpay_payment_id,
        razorpay_signature,
        status: paymentDetails.status === 'captured' ? 'captured' : 'pending',
        payment_method: paymentDetails.method,
        updated_at: new Date(),
      },
      { new: true }
    );

    return payment;
  } catch (error) {
    const err = new Error(`Payment verification failed: ${error.message}`);
    err.statusCode = 400;
    throw err;
  }
};

exports.getPaymentDetails = async (paymentId) => {
  const payment = await Payment.findById(paymentId).populate('appointment');
  if (!payment) {
    const error = new Error('Payment not found');
    error.statusCode = 404;
    throw error;
  }
  return payment;
};

exports.refundPayment = async (razorpayPaymentId, reason) => {
  try {
    const refund = await razorpay.payments.refund(razorpayPaymentId, {
      notes: { reason },
    });

    // Update payment status
    const payment = await Payment.findOneAndUpdate(
      { razorpay_payment_id: razorpayPaymentId },
      {
        status: 'refunded',
        updated_at: new Date(),
      },
      { new: true }
    );

    return { refund, payment };
  } catch (error) {
    const err = new Error(`Refund failed: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

exports.getPaymentHistory = async (userId, filters = {}) => {
  const query = { user: userId };

  if (filters.status) query.status = filters.status;

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const payments = await Payment.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .populate('appointment');

  const total = await Payment.countDocuments(query);

  return {
    data: payments,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};
