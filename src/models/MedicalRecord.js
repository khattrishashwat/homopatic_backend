const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  description: { type: String },
  file_url: { type: String, required: true },
  file_path: { type: String }, // Local filesystem path if storage_type is 'local'
  file_type: { type: String },
  storage_type: { type: String, enum: ['local', 's3'], default: 'local' },
  s3_key: { type: String },
  s3_bucket: { type: String },
  original_filename: { type: String },
  file_size: { type: Number },
  record_date: { type: Date, default: Date.now },
  notes: { type: String },
  created_at: { type: Date, default: Date.now },
});

MedicalRecordSchema.index({ patient: 1, record_date: -1 });
MedicalRecordSchema.index({ s3_key: 1 });

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);
