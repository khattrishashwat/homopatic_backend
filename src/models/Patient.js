const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: { type: Date },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    country: { type: String, default: 'India' },
  },
  emergency_contact: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String },
  },
  family_group: { type: String },
  family_members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }],
  medical_history: [{ type: String }],
  notes: { type: String },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

PatientSchema.index({ email: 1, phone: 1 });

module.exports = mongoose.model('Patient', PatientSchema);
