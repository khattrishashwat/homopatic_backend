const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
  prescriptionNumber: { type: String, unique: true, sparse: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, default: 'Prescription' },
  prescription_date: { type: Date, default: Date.now },

  doctor_info: {
    name: { type: String, default: 'Dr. Parth Bhargava' },
    qualification: { type: String, default: 'BHMS, Homoeopathic Physician' },
    specialization: { type: String, default: 'Allergy, Nasal Polyp, Renal Calculi, Migraine, etc.' },
    reg_no: { type: String, default: 'H043267' },
    phone: { type: String, default: '+91 7668610031' },
  },

  clinic_info: {
    name: { type: String, default: 'MD’s HOMOEOPATHY' },
    tagline: { type: String, default: 'A Destination for A Permanent Cure And Perfect Care' },
    address: { type: String, default: 'Deeg Gali Kachchi Sadak, Lal Darwaza, Mathura' },
    phone: { type: String, default: '+91 7668610031' },
    email: { type: String, default: 'contact@mdshomoeopathy.com' },
    website: { type: String, default: 'www.mdshomoeopathy.com' },
  },

  patient_snapshot: {
    name: { type: String },
    patientId: { type: String },
    gender: { type: String },
    age: { type: Number },
    phone: { type: String },
  },

  vitals: {
    height: { type: String },
    weight: { type: String },
    bp: { type: String },
    pulse: { type: String },
    spo2: { type: String },
    temperature: { type: String },
    blood_sugar: { type: String },
  },

  medicines: [
    {
      name: { type: String, required: true },
      potency: { type: String },
      dosage: { type: String },
      route: { type: String, default: 'Oral' },
      frequency: { type: String },
      duration: { type: String },
      quantity: { type: String },
      instructions: { type: String },
      foodTiming: { type: String },
      notes: { type: String },
    },
  ],

  advice: {
    general: { type: String },
    diet_lifestyle: { type: String },
    follow_up: { type: String },
    next_visit: { type: String },
  },

  notes: { type: String },
  image_url: { type: String },
  image_path: { type: String },
  image_s3_key: { type: String },
  image_s3_bucket: { type: String },
  pdf_url: { type: String },
  pdf_path: { type: String },
  pdf_s3_key: { type: String },
  pdf_s3_bucket: { type: String },
  storage_type: { type: String, enum: ['s3'], default: 's3' },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

PrescriptionSchema.index({ prescriptionNumber: 1, created_at: -1 });

module.exports = mongoose.model('Prescription', PrescriptionSchema);
