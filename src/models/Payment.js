const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  razorpay_order_id: { type: String, required: true },
  razorpay_payment_id: { type: String },
  razorpay_signature: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  description: { type: String },
  customer_name: { type: String },
  customer_email: { type: String },
  customer_phone: { type: String },
  status: {
    type: String,
    enum: ['created', 'pending', 'captured', 'failed', 'refunded'],
    default: 'pending',
  },
  payment_method: { type: String }, // 'card', 'netbanking', 'wallet', 'upi'
  error_message: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }, // Additional info
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Payment', PaymentSchema);
