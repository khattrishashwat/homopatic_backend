const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema({
  site_name: { type: String, default: 'Homeopathy Clinic' },
  site_url: { type: String },
  site_description: { type: String },
  logo_url: { type: String },
  logo_path: { type: String },
  favicon_url: { type: String },
  favicon_path: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  postal_code: { type: String },
  country: { type: String },
  about_us: { type: String }, // HTML content
  mission: { type: String }, // HTML content
  vision: { type: String }, // HTML content
  social_links: {
    facebook: { type: String },
    instagram: { type: String },
    twitter: { type: String },
    linkedin: { type: String },
    whatsapp: { type: String },
  },
  business_hours: {
    monday_friday: { type: String },
    saturday: { type: String },
    sunday: { type: String },
  },
  appointment_settings: {
    slot_duration: { type: Number, default: 30 }, // minutes
    max_appointments_per_slot: { type: Number, default: 1 },
    advance_booking_days: { type: Number, default: 30 },
    enable_online_booking: { type: Boolean, default: true },
  },
  payment_settings: {
    razorpay_key_id: { type: String },
    enable_payments: { type: Boolean, default: false },
    enable_appointment_payment: { type: Boolean, default: false },
  },
  notification_settings: {
    enable_email: { type: Boolean, default: true },
    enable_sms: { type: Boolean, default: true },
    enable_whatsapp: { type: Boolean, default: true },
  },
  chatbot_settings: {
    enabled: { type: Boolean, default: true },
    welcome_message: {
      type: String,
      default: "Hi! 👋 Welcome to MD's Homoeopathy. How can I assist your health journey today?",
    },
    suggested_questions: [
      {
        type: String,
      },
    ],
  },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);
