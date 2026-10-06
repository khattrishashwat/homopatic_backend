const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');
const SiteSettings = require('../models/SiteSettings');
const paymentService = require('./paymentService');
const emailService = require('./emailService');
const whatsappService = require('./whatsappService');
const { calculateAppointmentPricing, getEffectivePricingConfig } = require('../constants/pricing');

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

    // 3. Email to Patient and Clinic Admin via Nodemailer
    await emailService.sendAppointmentBookingEmails(appointment, slot)
      .catch((e) => console.log('[Notification Email Booking Error]:', e.message));
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

  // 1. Resolve and validate Booking Type & Plan Type
  const rawBookingType = data.bookingType || data.consultationType || data.consultation_type || 'ONLINE';
  const bookingType = String(rawBookingType).trim().toUpperCase() === 'OFFLINE' ? 'OFFLINE' : 'ONLINE';
  const consultationType = bookingType.toLowerCase();

  let planType = data.planType;
  if (!planType && data.medicineDuration) {
    if (data.medicineDuration === '7_days') planType = 'SEVEN_DAYS';
    else if (data.medicineDuration === '30_days' || data.medicineDuration === '1_month') planType = 'ONE_MONTH';
  }

  // Fetch optional dynamic pricing overrides from SiteSettings
  const siteSettings = await SiteSettings.findOne().lean().catch(() => null);
  const pricingSettings = siteSettings?.appointment_settings?.pricing;

  // Authoritative server-side price calculation (never trusts client amount)
  const pricing = calculateAppointmentPricing({
    bookingType,
    planType,
    pricingSettings,
  });

  if (slot.bookingType && slot.bookingType !== 'both' && slot.bookingType !== consultationType) {
    const error = new Error(`This time slot is configured for ${slot.bookingType} bookings only.`);
    error.statusCode = 400;
    throw error;
  }

  // Payment Method:
  // For ONLINE: strictly online payment
  // For OFFLINE: user can choose online (Razorpay) or offline (pay at clinic)
  const paymentMethod = bookingType === 'ONLINE'
    ? 'online'
    : (data.paymentMethod || data.payment_method || 'offline').toLowerCase();
  const isOnlinePayment = paymentMethod === 'online';

  const finalConcern = data.concern || data.reason || 'General Consultation';
  const customConcern = data.customConcern || '';
  const finalReason = finalConcern === 'Other' && customConcern ? `Other: ${customConcern}` : finalConcern;

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
    status: 'pending',
    payment_status: 'pending',
    paymentMethod,
    bookingType: pricing.bookingType,
    planType: pricing.planType,
    planDuration: pricing.planDuration,
    baseAmount: pricing.baseAmount,
    deliveryCharge: pricing.deliveryCharge,
    totalAmount: pricing.totalAmount,
    amount: pricing.totalAmount, // backward compatibility
    concern: finalConcern,
    customConcern,
    reason: finalReason,
    address: data.address ? data.address.trim() : undefined,
    city: data.city ? data.city.trim() : undefined,
    pincode: data.pincode ? data.pincode.trim() : undefined,
    medicineDuration: pricing.planType === 'SEVEN_DAYS' ? '7_days' : (pricing.planType === 'ONE_MONTH' ? '30_days' : undefined),
    courierCharge: 0,
    age: data.age ? Number(data.age) : undefined,
    consultation_type: consultationType,
    appointmentDate: slotDate,
    appointmentTime: slotTimeStr,
    customerId: data.customerId || (data.patientId ? String(data.patientId) : undefined),
    leadId: data.leadId || undefined,
    notes: data.notes || (bookingType === 'ONLINE'
      ? `Online Appointment | Plan: ${pricing.planLabel} (₹${pricing.baseAmount}) | Delivery: Included | Address: ${data.address || '-'}, ${data.city || '-'} - ${data.pincode || '-'}`
      : `Offline Appointment (₹${pricing.baseAmount}) | City: ${data.city || '-'}`),
  });

  slot.available = false;
  await slot.save();

  const populated = await appointment.populate('slot');

  if (isOnlinePayment) {
    const razorpayOrder = await paymentService.createOrder({
      amount: pricing.totalAmount, // Strictly backend calculated
      appointmentId: appointment._id,
      patientId: data.patientId,
      userId: data.userId,
      customerName: appointment.patientName,
      customerEmail: appointment.patientEmail,
      customerPhone: appointment.patientPhone,
      description: bookingType === 'ONLINE'
        ? `Online Appointment (${pricing.planLabel})`
        : 'Offline Clinic Appointment',
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
  if (filters.consultation_type) {
    query.$or = [
      { consultation_type: filters.consultation_type.toLowerCase() },
      { bookingType: filters.consultation_type.toUpperCase() },
    ];
  }
  if (filters.bookingType) {
    query.bookingType = { $regex: new RegExp(`^${filters.bookingType}$`, 'i') };
  }
  if (filters.planType) {
    query.planType = filters.planType;
  }
  if (filters.payment_status) {
    query.payment_status = filters.payment_status;
  }

  return Appointment.find(query).sort({ createdAt: -1 }).populate('user slot patient');
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

exports.getPricingConfig = async () => {
  const settings = await SiteSettings.findOne().lean().catch(() => null);
  return getEffectivePricingConfig(settings?.appointment_settings?.pricing);
};
