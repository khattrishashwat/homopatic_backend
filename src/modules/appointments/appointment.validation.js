exports.validateCreateAppointment = (payload) => {
  if (!payload.name) {
    const error = new Error('Patient name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!payload.slotId) {
    const error = new Error('Slot ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!payload.email && !payload.phone) {
    const error = new Error('Either email or phone is required');
    error.statusCode = 400;
    throw error;
  }
};

exports.validateReschedule = (payload) => {
  if (!payload.newSlotId) {
    const error = new Error('New slot ID is required');
    error.statusCode = 400;
    throw error;
  }
};

exports.validateConsultationType = (type) => {
  const allowed = ['online', 'offline'];
  if (!allowed.includes(type)) {
    const error = new Error('Consultation type must be online or offline');
    error.statusCode = 400;
    throw error;
  }
};

exports.validatePaymentStatus = (status) => {
  const allowed = ['pending', 'paid', 'failed'];
  if (!allowed.includes(status)) {
    const error = new Error('Payment status must be pending, paid, or failed');
    error.statusCode = 400;
    throw error;
  }
};
