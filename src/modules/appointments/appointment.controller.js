const appointmentService = require('./appointment.service');
const validation = require('./appointment.validation');

exports.createAppointment = async (req, res, next) => {
  try {
    validation.validateCreateAppointment(req.body);
    const result = await appointmentService.createAppointment({
      userId: req.user?._id,
      patientId: req.body.patientId,
      customerId: req.body.customerId,
      leadId: req.body.leadId,
      name: req.body.name || req.body.patientName,
      email: req.body.email || req.body.patientEmail,
      phone: req.body.phone || req.body.patientPhone,
      slotId: req.body.slotId || req.body.slot,
      reason: req.body.reason || req.body.concern,
      concern: req.body.concern || req.body.reason,
      customConcern: req.body.customConcern,
      address: req.body.address,
      city: req.body.city,
      pincode: req.body.pincode,
      age: req.body.age,
      bookingType: req.body.bookingType,
      planType: req.body.planType,
      medicineDuration: req.body.medicineDuration,
      consultationType: req.body.consultation_type || req.body.consultationType || req.body.consultationMode,
      paymentMethod: req.body.paymentMethod || req.body.payment_method,
      paymentStatus: req.body.payment_status || req.body.paymentStatus,
      amount: req.body.amount,
      notes: req.body.notes,
    });

    const appointment = result.appointment || result;
    const appointmentObj = appointment.toObject ? appointment.toObject() : appointment;

    // Ensure all required fields are explicitly available in response
    const formattedData = {
      ...appointmentObj,
      bookingType: appointmentObj.bookingType || (appointmentObj.consultation_type === 'online' ? 'ONLINE' : 'OFFLINE'),
      planType: appointmentObj.planType || null,
      planDuration: appointmentObj.planDuration || null,
      baseAmount: appointmentObj.baseAmount !== undefined ? appointmentObj.baseAmount : appointmentObj.amount,
      deliveryCharge: appointmentObj.deliveryCharge !== undefined ? appointmentObj.deliveryCharge : 0,
      totalAmount: appointmentObj.totalAmount !== undefined ? appointmentObj.totalAmount : appointmentObj.amount,
      paymentStatus: appointmentObj.payment_status || appointmentObj.paymentStatus || 'pending',
    };

    res.status(201).json({
      success: true,
      data: formattedData,
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
      bookingType: req.query.bookingType || req.query.booking_type,
      planType: req.query.planType || req.query.plan_type,
      payment_status: req.query.payment_status || req.query.paymentStatus,
    };
    const appointments = await appointmentService.getAllAppointments(filters);
    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

exports.getPricingConfig = async (req, res, next) => {
  try {
    const pricing = await appointmentService.getPricingConfig();
    res.json({ success: true, data: pricing });
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
