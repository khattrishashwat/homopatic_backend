const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');
const SiteSettings = require('../models/SiteSettings');
const paymentService = require('./paymentService');
const emailService = require('./emailService');
const whatsappService = require('./whatsappService');

const validateAppointmentStatus = (status) => {
  const allowed = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'missed'];
  if (!allowed.includes(status)) {
    const error = new Error(`Status must be one of: ${allowed.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
};

const validateConsultationType = (type) => {
  const allowed = ['online', 'offline'];
  if (!allowed.includes(type)) {
    const error = new Error(`Consultation type must be one of: ${allowed.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
};

const sendBookingNotifications = async (appointment, slot) => {
  try {
    const settings = await SiteSettings.findOne().lean().catch(() => null);

    // 1. WhatsApp to Patient
    if (appointment.patientPhone) {
      const patientMsg = whatsappService.formatAppointmentMessage(appointment, slot);
      await whatsappService.sendWhatsAppMessage({
        to: appointment.patientPhone,
        body: patientMsg,
      }).catch((e) => console.log('[Notification WhatsApp Patient Error]:', e.message));
    }

    // 2. WhatsApp to Clinic Admin
    const adminPhone = process.env.ADMIN_WHATSAPP || process.env.WHATSAPP_NUMBER || settings?.social_links?.whatsapp || settings?.phone || '+917668610031';
    if (adminPhone) {
      const adminMsg = `🚨 *NEW APPOINTMENT BOOKED*\n\n` + whatsappService.formatAppointmentMessage(appointment, slot);
      await whatsappService.sendWhatsAppMessage({
        to: adminPhone,
        body: adminMsg,
      }).catch((e) => console.log('[Notification WhatsApp Admin Error]:', e.message));
    }

    // 3. Email to Patient
    if (appointment.patientEmail) {
      await emailService.sendAppointmentConfirmation(
        appointment,
        { name: appointment.patientName, email: appointment.patientEmail, _id: appointment.user },
        slot
      ).catch((e) => console.log('[Notification Email Patient Error]:', e.message));
    }

    // 4. Email to Clinic Admin
    const adminEmail = process.env.ADMIN_EMAIL || settings?.email || 'admin@homeopathyclinic.com';
    if (adminEmail) {
      await emailService.sendAppointmentConfirmation(
        appointment,
        { name: 'Clinic Admin', email: adminEmail },
        slot
      ).catch((e) => console.log('[Notification Email Admin Error]:', e.message));
    }
  } catch (error) {
    console.error('[sendBookingNotifications error]:', error.message);
  }
};

exports.sendBookingNotifications = sendBookingNotifications;

exports.bookAppointment = async (data) => {
  if (!data.name || !data.name.trim()) {
    const error = new Error('Patient name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!data.email && !data.phone) {
    const error = new Error('Email or phone is required');
    error.statusCode = 400;
    throw error;
  }

  const slot = await Slot.findById(data.slotId);
  if (!slot || !slot.available) {
    const error = new Error('Selected slot is not available');
    error.statusCode = 400;
    throw error;
  }

  // Double booking prevention: Check if active appointment already references this slot
  const existingActive = await Appointment.findOne({
    slot: slot._id,
    status: { $in: ['confirmed', 'pending'] },
  });
  if (existingActive) {
    slot.available = false;
    await slot.save();
    const error = new Error('Selected slot is already booked');
    error.statusCode = 400;
    throw error;
  }

  const consultationType = String(data.consultationType || data.consultation_type || 'offline').toLowerCase() === 'online' ? 'online' : 'offline';
  const paymentMethod = String(data.paymentMethod || data.payment_method || 'offline').toLowerCase() === 'online' ? 'online' : 'offline';
  const isOnlinePayment = paymentMethod === 'online';

  const finalConcern = data.concern || data.reason || 'General Consultation';
  const customConcern = data.customConcern || '';
  const finalReason = finalConcern === 'Other' && customConcern ? `Other: ${customConcern}` : finalConcern;

  // Amount: Online is 500, Offline is 200 (or custom if provided)
  const defaultAmount = consultationType === 'online' ? 500 : 200;
  const finalAmount = Number(data.amount) || defaultAmount;

  const slotDate = slot.startTime ? new Date(slot.startTime) : new Date();
  const slotTimeStr = slot.startTime
    ? new Date(slot.startTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    : 'Scheduled';

  const appointment = await Appointment.create({
    user: data.userId,
    patient: data.patientId,
    patientName: data.name.trim(),
    patientEmail: data.email ? data.email.trim() : undefined,
    patientPhone: data.phone ? data.phone.trim() : undefined,
    slot: slot._id,
    status: isOnlinePayment ? 'pending' : 'confirmed',
    payment_status: 'pending',
    paymentMethod,
    concern: finalConcern,
    customConcern,
    reason: finalReason,
    city: data.city ? data.city.trim() : undefined,
    age: data.age ? Number(data.age) : undefined,
    consultation_type: consultationType,
    appointmentDate: slotDate,
    appointmentTime: slotTimeStr,
    amount: finalAmount,
    notes: data.notes || (data.city || data.age ? `Age: ${data.age || '-'}; City: ${data.city || '-'}` : undefined),
  });

  slot.available = false;
  await slot.save();

  const populated = await appointment.populate('slot');

  if (isOnlinePayment) {
    const razorpayOrder = await paymentService.createOrder({
      amount: finalAmount,
      appointmentId: appointment._id,
      patientId: data.patientId,
      userId: data.userId,
      customerName: appointment.patientName,
      customerEmail: appointment.patientEmail,
      customerPhone: appointment.patientPhone,
      description: `Appointment (${consultationType === 'online' ? 'Online' : 'Clinic Visit'})`,
    });

    appointment.razorpayOrderId = razorpayOrder.orderId;
    await appointment.save();

    return {
      appointment: populated,
      razorpayOrder,
    };
  }

  // Offline payment: dispatch notifications immediately
  sendBookingNotifications(populated, slot);

  return {
    appointment: populated,
  };
};

exports.verifyAppointmentPayment = async ({ appointmentId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const appointment = await Appointment.findById(appointmentId).populate('slot');
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  await paymentService.verifyPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    appointmentId: appointment._id,
    amount: appointment.amount,
  });

  appointment.payment_status = 'paid';
  appointment.status = 'confirmed';
  appointment.razorpayOrderId = razorpay_order_id;
  appointment.razorpayPaymentId = razorpay_payment_id;
  appointment.razorpaySignature = razorpay_signature;
  await appointment.save();

  // Send confirmation notifications after payment verification
  sendBookingNotifications(appointment, appointment.slot);

  return appointment;
};

exports.getUserAppointments = async (filters = {}) => {
  const query = {};

  if (filters.userId) {
    query.user = filters.userId;
  }

  if (filters.patientId) {
    query.patient = filters.patientId;
  }

  if (filters.email) {
    query.patientEmail = filters.email;
  }

  if (filters.phone) {
    query.patientPhone = filters.phone;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  return Appointment.find(query).populate('slot patient');
};

exports.getAppointmentById = async (id) => {
  const appointment = await Appointment.findById(id).populate('slot patient');
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }
  return appointment;
};

exports.getAllAppointments = async (filters = {}) => {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.consultation_type) query.consultation_type = filters.consultation_type;

  return Appointment.find(query).populate('user slot patient');
};

exports.updateAppointmentStatus = async (id, status) => {
  validateAppointmentStatus(status);

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  appointment.status = status;
  return appointment.save();
};

exports.rescheduleAppointment = async (id, newSlotId, reason) => {
  const appointment = await Appointment.findById(id);
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  const slot = await Slot.findById(newSlotId);
  if (!slot || !slot.available) {
    const error = new Error('Target slot is not available');
    error.statusCode = 400;
    throw error;
  }

  const previousSlot = appointment.slot;
  appointment.reschedule_history = appointment.reschedule_history || [];
  appointment.reschedule_history.push({
    from_slot: previousSlot,
    to_slot: slot._id,
    requested_at: new Date(),
    status: 'approved',
    reason,
  });
  appointment.slot = slot._id;
  appointment.status = 'confirmed';

  slot.available = false;
  await slot.save();

  if (previousSlot) {
    await Slot.findByIdAndUpdate(previousSlot, { available: true });
  }

  return appointment.save();
};

exports.setConsultationMode = async (id, consultationType) => {
  validateConsultationType(consultationType);

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  appointment.consultation_type = consultationType;
  return appointment.save();
};

exports.updatePaymentStatus = async (id, paymentStatus) => {
  const allowed = ['pending', 'paid', 'failed'];
  if (!allowed.includes(paymentStatus)) {
    const error = new Error(`Payment status must be one of: ${allowed.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  appointment.payment_status = paymentStatus;
  return appointment.save();
};

exports.markAppointmentComplete = async (id) => {
  return exports.updateAppointmentStatus(id, 'completed');
};

exports.markAppointmentMissed = async (id) => {
  return exports.updateAppointmentStatus(id, 'missed');
};

exports.countAppointments = async () => {
  return Appointment.countDocuments();
};

exports.getAppointmentsByPatient = async (patientId) => {
  return Appointment.find({ patient: patientId }).populate('slot patient');
};
