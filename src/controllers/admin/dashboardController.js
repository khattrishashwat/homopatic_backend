const appointmentService = require('../../services/appointmentService');
const slotService = require('../../services/slotService');

exports.getDashboard = async (req, res, next) => {
  try {
    const totalAppointments = await appointmentService.countAppointments();
    const totalSlots = await slotService.countSlots();
    res.json({ success: true, data: { totalAppointments, totalSlots } });
  } catch (error) {
    next(error);
  }
};
