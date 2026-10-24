const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  age: { type: Number },
  date_of_admission: { type: Date },
  gender: { type: String, default: '' },
  dob: { type: Date },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postal_code: { type: String, default: '' },
    country: { type: String, default: 'India' },
  },
  emergency_contact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relationship: { type: String, default: '' },
  },
  family_group: { type: String },
  family_members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }],
  relationship: { type: String },
  clinic_code: { type: String, default: '01' },
  medical_history: [{ type: String }],
  notes: { type: String, default: '' },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

PatientSchema.index({ email: 1, phone: 1 });

module.exports = mongoose.model('Patient', PatientSchema);
