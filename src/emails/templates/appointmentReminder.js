const {
  formatDate,
  formatTime,
  renderConsultationBadge,
  renderTableRow,
  renderCallout,
  wrapEmail,
} = require('./emailBase');

/**
 * Generate HTML email for Appointment Reminder (Tomorrow / Upcoming)
 * @param {Object} data - Appointment & user data
 * @returns {String} HTML email string
 */
function generateAppointmentReminderEmail(data = {}) {
  const appointment = data.appointment || data;
  const user = data.user || {};
  const slot = data.slot || appointment.slot;

  const patientName = user.name || appointment.patientName || data.name || 'Valued Patient';
  const bookingId = appointment._id
    ? `#APPT-${String(appointment._id).slice(-8).toUpperCase()}`
    : (appointment.bookingId || '#APPT-REMINDER');

  const consultationType = appointment.consultation_type || appointment.consultationType || 'offline';
  const isOnline = String(consultationType).toLowerCase() === 'online';

  const appointmentDate = slot?.startTime || appointment.appointmentDate;
  const formattedDate = appointmentDate ? formatDate(appointmentDate) : 'Tomorrow';
  const formattedTime = slot?.startTime
    ? formatTime(slot.startTime)
    : (appointment.appointmentTime || 'Scheduled slot');

  const slotDuration = (slot && slot.durationMinutes) || 30;

  const concernText = appointment.concern === 'Other' && appointment.customConcern
    ? `Other (${appointment.customConcern})`
    : (appointment.concern || appointment.reason || 'General Consultation');

  let rowCount = 0;
  const isAlt = () => rowCount++ % 2 === 1;

  const tableRows = [
    renderTableRow('Booking Reference ID', `<span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #047857;">${bookingId}</span>`, isAlt()),
    renderTableRow('Patient Name', `<strong>${patientName}</strong>`, isAlt()),
    renderTableRow('Consultation Type', renderConsultationBadge(consultationType), isAlt()),
    renderTableRow('Health Concern', concernText, isAlt()),
    renderTableRow('Scheduled Date', formattedDate, isAlt()),
    renderTableRow('Scheduled Time', `<span style="font-weight: 700; color: #047857;">${formattedTime}</span>`, isAlt()),
    renderTableRow('Slot Duration', `${slotDuration} Minutes`, isAlt()),
  ];

  const reminderInstructions = isOnline
    ? '<strong>Online Preparation:</strong> Please be ready online 5-10 minutes prior to your scheduled consultation time. You will receive your video link via WhatsApp/email.'
    : '<strong>Clinic Visit Preparation:</strong> Please arrive at the clinic 10 minutes early. Bring any previous prescriptions, reports, or symptom diaries.';

  const content = `
    <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
      <p style="margin: 0 0 12px 0;">Dear <strong>${patientName}</strong>,</p>
      <p style="margin: 0 0 16px 0;">
        This is a friendly reminder from <strong>MD's Homoeopathy Clinic</strong> about your upcoming consultation scheduled for <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>.
      </p>
    </div>

    ${renderCallout(`
      <strong>⏰ Appointment Reminder:</strong> Your consultation is scheduled for <strong>${formattedDate} at ${formattedTime}</strong>. Please ensure your availability.
    `, 'warning')}

    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${tableRows.join('')}
    </table>

    ${renderCallout(reminderInstructions, 'info')}

    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 13px; color: #475569; line-height: 1.5;">
      <strong>Need to reschedule or cancel?</strong><br>
      Please notify us as soon as possible by calling <strong>+91 7668610031</strong> or replying to this email.
    </div>
  `;

  return wrapEmail({
    subtitle: 'Upcoming Appointment Reminder',
    content,
  });
}

module.exports = {
  generateAppointmentReminderEmail,
};
