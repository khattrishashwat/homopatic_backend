const cron = require('node-cron');
const slotService = require('../services/slotService');
const Appointment = require('../models/Appointment');
const notificationService = require('../services/notificationService');
const whatsappService = require('../services/whatsappService');

const generateWeekendSlots = async () => {
  try {
    const result = await slotService.generateWeekendSlots();
  } catch (error) {
    console.error('Weekend slot generation failed:', error.message);
  }
};

const sendAppointmentReminders = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({ status: 'confirmed' }).populate('slot patient');
    const reminders = appointments.filter((appointment) => {
      if (!appointment.slot || !appointment.slot.startTime) return false;
      const start = new Date(appointment.slot.startTime);
      return start >= tomorrow && start <= tomorrowEnd;
    });

    for (const appointment of reminders) {
      const recipient = appointment.patient?.name || appointment.patientName || 'patient';
      const message = `Reminder: You have an appointment scheduled on ${new Date(appointment.slot.startTime).toLocaleString()} (${appointment.consultation_type}).`;
      await notificationService.createNotification(
        appointment.user,
        'Appointment Reminder',
        message,
      );

      const phone = appointment.patientPhone || appointment.patient?.phone;
      if (phone) {
        await whatsappService.sendWhatsAppMessage({
          to: phone,
          body: `Hello ${recipient},\n${message}`,
        });
      }
    }

    console.log(`Appointment reminder scheduler sent ${reminders.length} reminders`);
  } catch (error) {
    console.error('Appointment reminder scheduler failed:', error.message);
  }
};

exports.scheduleDailyReports = () => {
  cron.schedule('0 0 * * *', () => {
    console.log('Running daily report scheduler');
  });
};

exports.scheduleSlotGeneration = () => {
  generateWeekendSlots();
  sendAppointmentReminders();

  cron.schedule('0 0 * * *', () => {
    generateWeekendSlots();
    sendAppointmentReminders();
  });
};
