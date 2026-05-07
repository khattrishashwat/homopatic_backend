const appointmentService = require('./appointment.service');
const validation = require('./appointment.validation');

exports.createAppointment = async (req, res, next) => {
  try {
    validation.validateCreateAppointment(req.body);
    const appointment = await appointmentService.createAppointment({
      userId: req.user?._id,
      patientId: req.body.patientId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      slotId: req.body.slotId,
      reason: req.body.reason,
      consultationType: req.body.consultation_type || req.body.consultationType,
      paymentStatus: req.body.payment_status || req.body.paymentStatus,
      notes: req.body.notes,
    });
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.getUserAppointments = async (req, res, next) => {
  try {
    const filters = {
      userId: req.user?._id,
      patientId: req.query.patientId,
      email: req.query.email,
      phone: req.query.phone,
      status: req.query.status,
    };
    const appointments = await appointmentService.getUserAppointments(filters);
    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById(req.params.id);
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.adminListAppointments = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      consultation_type: req.query.consultation_type,
    };
    const appointments = await appointmentService.getAllAppointments(filters);
    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

exports.adminUpdateStatus = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointmentStatus(req.params.id, req.body.status);
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.adminRescheduleAppointment = async (req, res, next) => {
  try {
    validation.validateReschedule(req.body);
    const appointment = await appointmentService.rescheduleAppointment(req.params.id, req.body.newSlotId, req.body.reason);
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.adminSetConsultationMode = async (req, res, next) => {
  try {
    validation.validateConsultationType(req.body.consultation_type || req.body.consultationType);
    const appointment = await appointmentService.setConsultationMode(req.params.id, req.body.consultation_type || req.body.consultationType);
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.adminUpdatePaymentStatus = async (req, res, next) => {
  try {
    const status = req.body.payment_status || req.body.paymentStatus;
    validation.validatePaymentStatus(status);
    const appointment = await appointmentService.updatePaymentStatus(req.params.id, status);
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.adminMarkComplete = async (req, res, next) => {
  try {
    const appointment = await appointmentService.markAppointmentComplete(req.params.id);
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.adminMarkMissed = async (req, res, next) => {
  try {
    const appointment = await appointmentService.markAppointmentMissed(req.params.id);
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};
