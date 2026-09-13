const appointmentService = require('./appointment.service');
const validation = require('./appointment.validation');

exports.createAppointment = async (req, res, next) => {
  try {
    validation.validateCreateAppointment(req.body);
    const result = await appointmentService.createAppointment({
      userId: req.user?._id,
      patientId: req.body.patientId,
      name: req.body.name || req.body.patientName,
      email: req.body.email || req.body.patientEmail,
      phone: req.body.phone || req.body.patientPhone,
      slotId: req.body.slotId || req.body.slot,
      reason: req.body.reason || req.body.concern,
      concern: req.body.concern || req.body.reason,
      customConcern: req.body.customConcern,
      city: req.body.city,
      age: req.body.age,
      consultationType: req.body.consultation_type || req.body.consultationType || req.body.consultationMode,
      paymentMethod: req.body.paymentMethod || req.body.payment_method,
      paymentStatus: req.body.payment_status || req.body.paymentStatus,
      amount: req.body.amount,
      notes: req.body.notes,
    });

    const appointment = result.appointment || result;
    res.status(201).json({
      success: true,
      data: appointment,
      razorpayOrder: result.razorpayOrder,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { appointmentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!appointmentId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'appointmentId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
      });
    }

    const appointment = await appointmentService.verifyAppointmentPayment({
      appointmentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    res.json({
      success: true,
      data: appointment,
      message: 'Payment verified and appointment confirmed successfully',
    });
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
