const { calculateAppointmentPricing } = require('../../constants/pricing');

exports.validateCreateAppointment = (payload) => {
  if (!payload.name || !payload.name.trim()) {
    const error = new Error('Patient name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!payload.slotId && !payload.slot) {
    const error = new Error('Slot ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!payload.phone && !payload.email) {
    const error = new Error('Phone number is required');
    error.statusCode = 400;
    throw error;
  }

  const concern = payload.concern || payload.reason;
  if (!concern || !concern.trim()) {
    const error = new Error('Health concern is required');
    error.statusCode = 400;
    throw error;
  }

  if (concern === 'Other' && (!payload.customConcern || !payload.customConcern.trim())) {
    const error = new Error('Please describe your custom concern');
    error.statusCode = 400;
    throw error;
  }

  // Determine and validate bookingType & planType
  const rawBookingType = payload.bookingType || payload.consultationType || payload.consultation_type || 'ONLINE';
  const bookingType = String(rawBookingType).trim().toUpperCase();

  let planType = payload.planType;
  if (!planType && payload.medicineDuration) {
    if (payload.medicineDuration === '7_days') planType = 'SEVEN_DAYS';
    else if (payload.medicineDuration === '30_days' || payload.medicineDuration === '1_month') planType = 'ONE_MONTH';
  }

  // This throws 400 error for invalid plan, invalid booking type, offline with plan, online without plan, etc.
  calculateAppointmentPricing({
    bookingType,
    planType,
  });

  const consultationType = bookingType.toLowerCase();
  const paymentMethod = (payload.paymentMethod || payload.payment_method || (consultationType === 'online' ? 'online' : 'offline')).toLowerCase();
  if (!['online', 'offline'].includes(paymentMethod)) {
    const error = new Error('Payment method must be online or offline');
    error.statusCode = 400;
    throw error;
  }

  if (consultationType === 'online' && paymentMethod === 'offline') {
    const error = new Error('Online consultation requires online payment. Offline payment is only available for clinic visits.');
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
