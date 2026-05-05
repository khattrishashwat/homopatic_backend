const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');

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
    patientName: data.name,
    patientEmail: data.email,
    patientPhone: data.phone,
    slot: slot._id,
    reason: data.reason,
  });

  slot.available = false;
  await slot.save();

  return appointment;
};

exports.getUserAppointments = async (filters = {}) => {
  const query = {};

  if (filters.userId) {
    query.user = filters.userId;
  }

  if (filters.email) {
    query.patientEmail = filters.email;
  }

  if (filters.phone) {
    query.patientPhone = filters.phone;
  }

  return Appointment.find(query).populate('slot');
};

exports.getAllAppointments = async () => {
  return Appointment.find().populate('user slot');
};

exports.updateAppointmentStatus = async (id, status) => {
  const appointment = await Appointment.findById(id);
  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }
  appointment.status = status;
  return appointment.save();
};

exports.countAppointments = async () => {
  return Appointment.countDocuments();
};
