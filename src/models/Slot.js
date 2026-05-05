const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  available: { type: Boolean, default: true },
  doctor: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Slot', SlotSchema);
