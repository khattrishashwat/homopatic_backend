const appointmentService = require('../../services/appointmentService');

module.exports = {
  createAppointment: appointmentService.bookAppointment,
  getUserAppointments: appointmentService.getUserAppointments,
  getAppointmentById: appointmentService.getAppointmentById,
  getAllAppointments: appointmentService.getAllAppointments,
  updateAppointmentStatus: appointmentService.updateAppointmentStatus,
  rescheduleAppointment: appointmentService.rescheduleAppointment,
  setConsultationMode: appointmentService.setConsultationMode,
  updatePaymentStatus: appointmentService.updatePaymentStatus,
  markAppointmentComplete: appointmentService.markAppointmentComplete,
  markAppointmentMissed: appointmentService.markAppointmentMissed,
  countAppointments: appointmentService.countAppointments,
  getAppointmentsByPatient: appointmentService.getAppointmentsByPatient,
};
