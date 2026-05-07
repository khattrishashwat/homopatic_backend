const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientName: { type: String, required: true },
  patientEmail: { type: String },
  patientPhone: { type: String },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'missed'],
    default: 'pending',
  },
  consultation_type: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline',
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  reason: { type: String },
  notes: { type: String },
  reschedule_history: [
    {
      from_slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot' },
      to_slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot' },
      requested_at: { type: Date, default: Date.now },
      approved_at: { type: Date },
      status: { type: String, enum: ['requested', 'approved', 'rejected'], default: 'approved' },
      reason: { type: String },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

AppointmentSchema.pre('save', function save(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
