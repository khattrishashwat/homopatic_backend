const appointmentService = require('../../services/appointmentService');
const slotService = require('../../services/slotService');
const Patient = require('../../models/Patient');
const Payment = require('../../models/Payment');

exports.getDashboard = async (req, res, next) => {
  try {
    const totalAppointments = await appointmentService.countAppointments();
    const totalSlots = await slotService.countSlots();
    const activePatients = await Patient.countDocuments({ active: true });
    const pendingApprovals = await require('../../models/Appointment').countDocuments({ status: 'pending' });
    const revenue = await Payment.aggregate([
      { $match: { status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    res.json({
      success: true,
      data: {
        totalAppointments,
        totalSlots,
        activePatients,
        pendingApprovals,
        totalRevenue: revenue[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
