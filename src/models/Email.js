const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  to_email: { type: String, required: true },
  subject: { type: String, required: true },
  html_content: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'bounced'],
    default: 'pending',
  },
  email_type: {
    type: String,
    enum: [
      'appointment_confirmation',
      'appointment_admin',
      'appointment_user',
      'appointment_reminder',
      'appointment_cancelled',
      'contact_form',
      'contact_form_admin',
      'contact_form_user',
      'order_admin',
      'order_user',
      'generic',
    ],
    default: 'generic',
  },
  message_id: { type: String },
  sendgrid_message_id: { type: String },
  error_message: { type: String },
  sent_at: { type: Date },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Email', EmailSchema);
