const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  available: { type: Boolean, default: true },
  doctor: { type: String },
  createdAt: { type: Date, default: Date.now },
});

SlotSchema.virtual('startHour').get(function getStartHour() {
  return this.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false });
});

SlotSchema.virtual('endHour').get(function getEndHour() {
  return this.endTime.toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false });
});

SlotSchema.set('toJSON', { virtuals: true });
SlotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Slot', SlotSchema);
