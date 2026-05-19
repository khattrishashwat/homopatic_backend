const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
   type: {
      type: String,
      enum: ['general', 'appointment', 'order', 'payment'],
      default: 'general',
    },
},
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', NotificationSchema);
