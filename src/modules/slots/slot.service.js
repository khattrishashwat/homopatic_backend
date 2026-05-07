const slotService = require('../../services/slotService');

module.exports = {
  createSlot: slotService.createSlot,
  getAllSlots: slotService.getAllSlots,
  getAvailableSlots: slotService.getAvailableSlots,
  updateSlot: slotService.updateSlot,
  makeAllSlotsAvailable: slotService.makeAllSlotsAvailable,
  generateWeekendSlots: slotService.generateWeekendSlots,
  countSlots: slotService.countSlots,
};
