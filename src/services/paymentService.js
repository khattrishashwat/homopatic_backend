const Payment = require('../models/Payment');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const hasRealRazorpay = () =>
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET &&
  !process.env.RAZORPAY_KEY_ID.includes('your_') &&
  !process.env.RAZORPAY_KEY_SECRET.includes('your_');

let razorpay = null;
if (hasRealRazorpay()) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

exports.createOrder = async (data) => {
  try {
    const amountInPaise = Math.round(Number(data.amount) * 100);
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `appointment_${Date.now()}`,
      description: data.description || 'Appointment Payment',
      customer_notify: 1,
      notes: {
        appointment_id: String(data.appointmentId || ''),
        user_id: String(data.userId || ''),
      },
    };

    let orderId;
    if (hasRealRazorpay() && razorpay) {
      const razorpayOrder = await razorpay.orders.create(options);
      orderId = razorpayOrder.id;
    } else {
      orderId = `order_mock_${Date.now()}_${Math.random().toString(36).slice(-4)}`;
      console.log('[PaymentService] Created dev mock Razorpay order:', orderId);
    }

    // Save payment record to DB
    const payment = await Payment.create({
      razorpay_order_id: orderId,
      user: data.userId || undefined,
      patient: data.patientId || undefined,
      appointment: data.appointmentId || undefined,
      amount: data.amount,
      currency: 'INR',
      description: data.description || 'Appointment Payment',
      customer_name: data.customerName,
      customer_email: data.customerEmail,
      customer_phone: data.customerPhone,
      status: 'created',
    });

    return {
      orderId,
      amount: data.amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId } = data;

    if (hasRealRazorpay()) {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        const error = new Error('Invalid payment signature');
        error.statusCode = 400;
        throw error;
      }
    }

    let paymentMethod = 'online';
    if (hasRealRazorpay() && razorpay) {
      try {
        const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
        if (paymentDetails?.method) {
          paymentMethod = paymentDetails.method;
        }
      } catch (e) {
        console.log('[PaymentService] Note: Could not fetch Razorpay payment details:', e.message);
      }
    }

    // Update or create payment record in DB
    let payment = await Payment.findOne({ razorpay_order_id });
    if (!payment && appointmentId) {
      payment = await Payment.findOne({ appointment: appointmentId });
    }

    if (payment) {
      payment.razorpay_payment_id = razorpay_payment_id;
      payment.razorpay_signature = razorpay_signature;
      payment.status = 'captured';
      payment.payment_method = paymentMethod;
      payment.updated_at = new Date();
      await payment.save();
    } else {
      payment = await Payment.create({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        appointment: appointmentId,
        amount: data.amount || 500,
        currency: 'INR',
        status: 'captured',
        payment_method: paymentMethod,
      });
    }

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

exports.refundPayment = async (paymentId, reason) => {
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment || !payment.razorpay_payment_id) {
      const error = new Error('Payment record not found or not refundable');
      error.statusCode = 404;
      throw error;
    }

    let refund = { id: `refund_mock_${Date.now()}` };
    if (hasRealRazorpay() && razorpay) {
      refund = await razorpay.payments.refund(payment.razorpay_payment_id, {
        notes: { reason },
      });
    }

    payment.status = 'refunded';
    payment.updated_at = new Date();
    await payment.save();

    return { refund, payment };
  } catch (error) {
    const err = new Error(`Refund failed: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

exports.getPaymentHistory = async (userId, filters = {}) => {
  const query = {};
  if (userId) query.user = userId;
  if (filters.patientId) query.patient = filters.patientId;
  if (filters.status) query.status = filters.status;
  if (filters.payment_method) query.payment_method = filters.payment_method;

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const payments = await Payment.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .populate('appointment patient');

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
