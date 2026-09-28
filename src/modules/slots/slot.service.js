const slotService = require('../../services/slotService');
const bookingScheduleService = require('../../services/bookingScheduleService');

module.exports = {
  createSlot: slotService.createSlot,
  getAllSlots: slotService.getAllSlots,
  getAvailableSlots: slotService.getAvailableSlots,
  updateSlot: slotService.updateSlot,
  makeAllSlotsAvailable: slotService.makeAllSlotsAvailable,
  generateWeekendSlots: slotService.generateWeekendSlots,
  countSlots: slotService.countSlots,

  // Schedule methods
  getSchedule: bookingScheduleService.getOrCreateSchedule,
  updateSchedule: bookingScheduleService.updateSchedule,
  setDateOverride: bookingScheduleService.setDateOverride,
  removeDateOverride: bookingScheduleService.removeDateOverride,
  resolveEffectiveSchedule: bookingScheduleService.resolveEffectiveSchedule,
  generateSlotsForDate: bookingScheduleService.generateSlotsForDate,
};
