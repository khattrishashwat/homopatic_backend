const {
  formatDate,
  formatTime,
  renderStatusBadge,
  renderConsultationBadge,
  renderTableRow,
  renderCallout,
  wrapEmail,
} = require('./emailBase');

/**
 * Generate HTML email for Patient Appointment Confirmation
 * @param {Object} data - Appointment & slot data
 * @returns {String} HTML email string
 */
function generateAppointmentUserEmail(data = {}) {
  const appointment = data.appointment || data;
  const slot = data.slot || appointment.slot;

  const patientName = appointment.patientName || data.name || 'Valued Patient';
  const bookingId = appointment._id
    ? `#APPT-${String(appointment._id).slice(-8).toUpperCase()}`
    : (appointment.bookingId || '#APPT-NEW');

  const concernText = appointment.concern === 'Other' && appointment.customConcern
    ? `Other (${appointment.customConcern})`
    : (appointment.concern || appointment.reason || 'General Consultation');

  const rawType = appointment.bookingType || appointment.consultation_type || appointment.consultationType || 'offline';
  const isOnline = String(rawType).toLowerCase() === 'online';
  const bookingTypeDisplay = isOnline ? 'Online' : 'Offline';

  const planType = appointment.planType || (appointment.medicineDuration === '7_days' ? 'SEVEN_DAYS' : (appointment.medicineDuration === '30_days' || appointment.medicineDuration === '1_month' ? 'ONE_MONTH' : null));
  const planDisplay = isOnline
    ? (planType === 'SEVEN_DAYS' ? '7 Days' : (planType === 'ONE_MONTH' ? '1 Month' : (appointment.medicineDuration ? appointment.medicineDuration.replace('_', ' ') : 'Subscription Plan')))
    : null;

  const appointmentDate = slot?.startTime || appointment.appointmentDate;
  const formattedDate = appointmentDate ? formatDate(appointmentDate) : '-';
  const formattedTime = slot?.startTime
    ? formatTime(slot.startTime)
    : (appointment.appointmentTime || '-');

  const slotDuration = (slot && slot.durationMinutes) || 30;

  const paymentMethod = appointment.paymentMethod || (isOnline ? 'online' : 'offline');
  const paymentMethodText = paymentMethod === 'online' ? 'Online Payment (Razorpay)' : 'Offline / Pay at Clinic';

  const paymentStatus = appointment.payment_status || (paymentMethod === 'online' ? 'paid' : 'pending');
  const totalAmountNum = appointment.totalAmount !== undefined ? appointment.totalAmount : appointment.amount;
  const formattedAmount = totalAmountNum !== undefined ? `₹${totalAmountNum.toLocaleString('en-IN')}` : '-';

  const patientEmail = appointment.patientEmail || data.email;
  const patientPhone = appointment.patientPhone || data.phone;
  const address = appointment.address || data.address;
  const city = appointment.city || data.city;
  const pincode = appointment.pincode || data.pincode;
  const paymentId = appointment.razorpayPaymentId || appointment.paymentId;
  const orderId = appointment.razorpayOrderId;

  let rowCount = 0;
  const isAlt = () => rowCount++ % 2 === 1;

  const tableRows = [
    renderTableRow('Booking Reference ID', `<span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #047857;">${bookingId}</span>`, isAlt()),
    renderTableRow('Patient Name', `<strong>${patientName}</strong>`, isAlt()),
    renderTableRow('Booking Type', `<strong style="color: ${isOnline ? '#0284c7' : '#047857'}; font-size: 14px;">${bookingTypeDisplay}</strong>`, isAlt()),
  ];

  if (isOnline && planDisplay) {
    tableRows.push(renderTableRow('Plan', `<strong>${planDisplay}</strong>`, isAlt()));
  }

  tableRows.push(
    renderTableRow('Health Concern', `<span style="font-weight: 600; color: #0f172a;">${concernText}</span>`, isAlt()),
    renderTableRow('Appointment Date', formattedDate, isAlt()),
    renderTableRow('Appointment Time', formattedTime, isAlt()),
    renderTableRow('Slot Duration', `${slotDuration} Minutes`, isAlt()),
  );

  if (isOnline) {
    tableRows.push(renderTableRow('Delivery Charges', `<span style="font-weight: 600; color: #047857;">Included</span>`, isAlt()));
    tableRows.push(renderTableRow('Total Payable Amount', `<span style="font-weight: 700; font-size: 16px; color: #047857;">${formattedAmount}</span>`, isAlt()));
  } else {
    tableRows.push(renderTableRow('Appointment Fee', `<span style="font-weight: 700; font-size: 16px; color: #047857;">${formattedAmount}</span>`, isAlt()));
  }

  tableRows.push(
    renderTableRow('Payment Method', paymentMethodText, isAlt()),
    renderTableRow('Payment Status', renderStatusBadge(paymentStatus), isAlt())
  );

  if (isOnline && address) {
    tableRows.push(renderTableRow('Delivery Address', `${address}${city ? `, ${city}` : ''}${pincode ? ` - ${pincode}` : ''}`, isAlt()));
  }

  if (patientEmail) {
    tableRows.push(renderTableRow('Patient Email', patientEmail, isAlt()));
  }
  if (patientPhone) {
    tableRows.push(renderTableRow('Patient Phone', patientPhone, isAlt()));
  }
  if (city && !address) {
    tableRows.push(renderTableRow('City', city, isAlt()));
  }
  if (paymentId) {
    tableRows.push(renderTableRow('Payment ID', `<span style="font-family: monospace;">${paymentId}</span>`, isAlt()));
  } else if (orderId) {
    tableRows.push(renderTableRow('Order Reference', `<span style="font-family: monospace;">${orderId}</span>`, isAlt()));
  }

  const instructions = isOnline
    ? '<strong>Online Consultation Note:</strong> You will receive a video consultation link before your scheduled appointment time. Please ensure you are connected to a stable internet connection.'
    : '<strong>Clinic Visit Note:</strong> Please arrive at the clinic 10 minutes prior to your scheduled appointment. Bring any relevant prior medical prescriptions or lab reports with you.';

  const content = `
    <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
      <p style="margin: 0 0 12px 0;">Dear <strong>${patientName}</strong>,</p>
      <p style="margin: 0 0 16px 0;">
        Your homoeopathy consultation appointment has been <strong>successfully booked</strong>.
      </p>
    </div>

    ${renderCallout(`
      <strong>✓ Appointment Confirmed</strong><br>
      Your appointment is confirmed. Please keep your Booking Reference ID <strong>${bookingId}</strong> handy for future communication.
    `, 'success')}

    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${tableRows.join('')}
    </table>

    ${renderCallout(instructions, 'info')}

    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 13px; color: #475569; line-height: 1.5;">
      <strong>Need assistance or wish to reschedule?</strong><br>
      Please contact us at <strong>+91 7668610031</strong> or email us at <strong>drparthbhargava@mdshomoeopathy.com</strong>.
    </div>
  `;

  return wrapEmail({
    subtitle: 'Appointment Confirmation',
    content,
  });
}

module.exports = {
  generateAppointmentUserEmail,
};
