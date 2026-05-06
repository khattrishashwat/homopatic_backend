const twilio = require('twilio');
const SMS = require('../models/SMS');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendSMS = async (data) => {
  try {
    const { phoneNumber, message, messageType = 'generic', userId, appointmentId } = data;

    // Create SMS record in DB
    const smsRecord = await SMS.create({
      user: userId,
      appointment: appointmentId,
      phone_number: phoneNumber,
      message,
      message_type: messageType,
      status: 'pending',
    });

    // Send SMS via Twilio
    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    // Update SMS record with success
    smsRecord.status = 'sent';
    smsRecord.sent_at = new Date();
    smsRecord.twilio_sid = response.sid;
    await smsRecord.save();

    return smsRecord;
  } catch (error) {
    console.error('Twilio error:', error);

    // Update SMS record with error
    if (data.userId || data.appointmentId) {
      await SMS.updateOne(
        {
          user: data.userId,
          appointment: data.appointmentId,
          phone_number: data.phoneNumber,
        },
        {
          status: 'failed',
          error_message: error.message,
        }
      );
    }

    const err = new Error(`Failed to send SMS: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

exports.sendAppointmentConfirmationSMS = async (appointment, user) => {
  const message = `Hi ${user.name}, Your appointment is confirmed for ${appointment.slot?.startTime}. Reply STOP to unsubscribe.`;

  return exports.sendSMS({
    phoneNumber: user.phone,
    message,
    messageType: 'appointment_confirmed',
    userId: user._id,
    appointmentId: appointment._id,
  });
};

exports.sendAppointmentReminderSMS = async (appointment, user) => {
  const message = `Hi ${user.name}, Reminder: Your appointment is tomorrow at ${appointment.slot?.startTime}. Call us if you need to reschedule.`;

  return exports.sendSMS({
    phoneNumber: user.phone,
    message,
    messageType: 'appointment_reminder',
    userId: user._id,
    appointmentId: appointment._id,
  });
};

exports.sendAppointmentCancelledSMS = async (appointment, user) => {
  const message = `Hi ${user.name}, Your appointment scheduled for ${appointment.slot?.startTime} has been cancelled. Contact us for rebooking.`;

  return exports.sendSMS({
    phoneNumber: user.phone,
    message,
    messageType: 'appointment_cancelled',
    userId: user._id,
    appointmentId: appointment._id,
  });
};

exports.getSMSHistory = async (userId, filters = {}) => {
  const query = { user: userId };

  if (filters.status) query.status = filters.status;

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const sms = await SMS.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);

  const total = await SMS.countDocuments(query);

  return {
    data: sms,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};
