const Slot = require('../models/Slot');

exports.createSlot = async (data) => {
  return Slot.create(data);
};

exports.getAllSlots = async () => {
  return Slot.find();
};

exports.getAvailableSlots = async () => {
  return Slot.find({ available: true });
};

exports.updateSlot = async (id, data) => {
  const slot = await Slot.findById(id);
  if (!slot) {
    const error = new Error('Slot not found');
    error.statusCode = 404;
    throw error;
  }
  Object.assign(slot, data);
  return slot.save();
};

exports.makeAllSlotsAvailable = async () => {
  return Slot.updateMany({}, { $set: { available: true } });
};

exports.countSlots = async () => {
  return Slot.countDocuments();
};
