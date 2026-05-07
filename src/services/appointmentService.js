const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');

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

exports.bookAppointment = async (data) => {
  if (!data.name) {
    const error = new Error('name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!data.email && !data.phone) {
    const error = new Error('email or phone is required');
    error.statusCode = 400;
    throw error;
  }

  const slot = await Slot.findById(data.slotId);
  if (!slot || !slot.available) {
    const error = new Error('Selected slot is not available');
    error.statusCode = 400;
    throw error;
  }

  const appointment = await Appointment.create({
    user: data.userId,
    patient: data.patientId,
    patientName: data.name,
    patientEmail: data.email,
    patientPhone: data.phone,
    slot: slot._id,
    status: 'pending',
    reason: data.reason,
    consultation_type: data.consultationType || 'offline',
    payment_status: data.paymentStatus || 'pending',
    notes: data.notes,
  });

  slot.available = false;
  await slot.save();

  return appointment.populate('slot');
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
