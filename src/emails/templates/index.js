const { generateAppointmentUserEmail } = require('./appointmentUser');
const { generateAppointmentAdminEmail } = require('./appointmentAdmin');
const { generateContactUserEmail } = require('./contactUser');
const { generateContactAdminEmail } = require('./contactAdmin');
const { generateOrderUserEmail } = require('./orderUser');
const { generateOrderAdminEmail } = require('./orderAdmin');
const { generateAppointmentReminderEmail } = require('./appointmentReminder');

module.exports = {
  generateAppointmentUserEmail,
  generateAppointmentAdminEmail,
  generateContactUserEmail,
  generateContactAdminEmail,
  generateOrderUserEmail,
  generateOrderAdminEmail,
  generateAppointmentReminderEmail,
};
