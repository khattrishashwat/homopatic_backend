const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  description: { type: String },
  file_url: { type: String, required: true },
  file_path: { type: String, required: true },
  file_type: { type: String },
  record_date: { type: Date, default: Date.now },
  notes: { type: String },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);
