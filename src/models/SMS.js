const mongoose = require('mongoose');

const SMSSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  phone_number: { type: String, required: true },
  message: { type: String, required: true },
  twilio_sid: { type: String }, // Message SID from Twilio
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered'],
    default: 'pending',
  },
  message_type: {
    type: String,
    enum: ['appointment_reminder', 'appointment_confirmed', 'appointment_cancelled', 'generic'],
    default: 'generic',
  },
  error_message: { type: String },
  sent_at: { type: Date },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SMS', SMSSchema);
