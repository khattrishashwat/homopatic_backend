const appointmentService = require('../../services/appointmentService');

exports.bookAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.bookAppointment(req.body);
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.getAppointments = async (req, res, next) => {
  try {
    const appointments = await appointmentService.getUserAppointments(req.query);
    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};
