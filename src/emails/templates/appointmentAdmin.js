const {
  formatDate,
  formatTime,
  renderStatusBadge,
  renderConsultationBadge,
  renderTableRow,
  renderSectionTitle,
  renderCallout,
  wrapEmail,
} = require('./emailBase');

/**
 * Generate HTML email for Clinic Admin Appointment Notification
 * @param {Object} data - Appointment & slot data
 * @returns {String} HTML email string
 */
function generateAppointmentAdminEmail(data = {}) {
  const appointment = data.appointment || data;
  const slot = data.slot || appointment.slot;

  const patientName = appointment.patientName || data.name || 'Patient';
  const bookingId = appointment._id
    ? `#APPT-${String(appointment._id).slice(-8).toUpperCase()}`
    : (appointment.bookingId || '#APPT-NEW');

  const concernText = appointment.concern === 'Other' && appointment.customConcern
    ? `Other (${appointment.customConcern})`
    : (appointment.concern || appointment.reason || 'General Consultation');

  const consultationType = appointment.consultation_type || appointment.consultationType || 'offline';
  const isOnline = String(consultationType).toLowerCase() === 'online';

  const appointmentDate = slot?.startTime || appointment.appointmentDate;
  const formattedDate = appointmentDate ? formatDate(appointmentDate) : '-';
  const formattedTime = slot?.startTime
    ? formatTime(slot.startTime)
    : (appointment.appointmentTime || '-');

  const slotDuration = (slot && slot.durationMinutes) || 30;

  const paymentMethod = appointment.paymentMethod || (isOnline ? 'online' : 'offline');
  const paymentMethodText = paymentMethod === 'online' ? 'Online Payment' : 'Offline Payment';

  const paymentStatus = appointment.payment_status || (paymentMethod === 'online' ? 'pending' : 'Pending (Pay at Consultation)');
  const amount = appointment.amount !== undefined ? `₹${appointment.amount}` : '-';

  const patientEmail = appointment.patientEmail || data.email || 'Not provided';
  const patientPhone = appointment.patientPhone || data.phone || 'Not provided';
  const address = appointment.address || data.address;
  const city = appointment.city || data.city || 'Not provided';
  const pincode = appointment.pincode || data.pincode;
  const medicineDuration = appointment.medicineDuration || data.medicineDuration;
  const courierCharge = appointment.courierCharge !== undefined ? appointment.courierCharge : data.courierCharge;
  const age = appointment.age || data.age;
  const paymentId = appointment.razorpayPaymentId || appointment.paymentId || 'Not provided';
  const orderId = appointment.razorpayOrderId || 'Not provided';

  const patientRows = [
    renderTableRow('Patient Name', `<strong>${patientName}</strong>`, false),
    renderTableRow('Email Address', patientEmail, true),
    renderTableRow('Phone Number', `<a href="tel:${patientPhone}" style="color: #047857; text-decoration: none; font-weight: 600;">${patientPhone}</a>`, false),
    renderTableRow('Health Concern', `<span style="font-weight: 600; color: #047857;">${concernText}</span>`, true),
  ];
  if (age) {
    patientRows.push(renderTableRow('Age', `${age} Years`, false));
  }
  if (address) {
    patientRows.push(renderTableRow('Delivery Address', `${address}, ${city}${pincode ? ` - ${pincode}` : ''}`, true));
  } else if (city) {
    patientRows.push(renderTableRow('City / Location', city, true));
  }

  const appointmentRows = [
    renderTableRow('Booking Reference ID', `<span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #047857;">${bookingId}</span>`, false),
    renderTableRow('Consultation Type', renderConsultationBadge(consultationType), true),
    renderTableRow('Appointment Date', formattedDate, false),
    renderTableRow('Appointment Time', formattedTime, true),
    renderTableRow('Slot Duration', `${slotDuration} Minutes`, false),
  ];
  if (medicineDuration) {
    const medTitle = medicineDuration === '7_days' ? '7 Days Course' : medicineDuration === '15_days' ? '15 Days Course' : '1 Month (30 Days) Course';
    appointmentRows.push(renderTableRow('Prescribed Course', `<strong>${medTitle}</strong>`, true));
  }

  const paymentRows = [
    renderTableRow('Payment Method', paymentMethodText, false),
    renderTableRow('Payment Status', renderStatusBadge(paymentStatus), true),
    renderTableRow('Total Amount Received', `<span style="font-weight: 700; font-size: 15px; color: #047857;">${amount}</span>`, false),
  ];
  if (courierCharge > 0) {
    paymentRows.push(renderTableRow('Courier Delivery Charge', `₹${courierCharge}`, true));
  }
  paymentRows.push(
    renderTableRow('Razorpay Payment ID', `<span style="font-family: monospace;">${paymentId}</span>`, false),
    renderTableRow('Razorpay Order ID', `<span style="font-family: monospace;">${orderId}</span>`, true)
  );

  const content = `
    <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0;">Hello <strong>Dr. Parth Bhargava & Admin Team</strong>,</p>
      <p style="margin: 0 0 16px 0;">
        A new homoeopathy appointment booking has been registered on the platform.
      </p>
    </div>

    ${renderCallout(`
      <strong>📋 New Booking Alert:</strong> ${patientName} has booked an ${isOnline ? '<strong>Online Consultation</strong>' : '<strong>In-Clinic Visit</strong>'} for <strong>${formattedDate} at ${formattedTime}</strong>.
    `, 'info')}

    ${renderSectionTitle('Patient Information')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${patientRows.join('')}
    </table>

    ${renderSectionTitle('Appointment Information')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${appointmentRows.join('')}
    </table>

    ${renderSectionTitle('Payment Information')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${paymentRows.join('')}
    </table>

    <div style="background-color: #f8fafc; border-left: 4px solid #64748b; padding: 14px 16px; border-radius: 4px; font-size: 12px; color: #64748b; margin-top: 20px;">
      This is an automated notification from the MD's Homoeopathy Appointment System. All details have been logged in the admin database.
    </div>
  `;

  return wrapEmail({
    subtitle: 'New Appointment Notification',
    content,
  });
}

module.exports = {
  generateAppointmentAdminEmail,
};
