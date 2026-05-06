const sgMail = require('@sendgrid/mail');
const Email = require('../models/Email');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendEmail = async (data) => {
  try {
    const { to, subject, html, emailType = 'generic', userId, appointmentId } = data;

    // Create email record in DB
    const emailRecord = await Email.create({
      user: userId,
      appointment: appointmentId,
      to_email: to,
      subject,
      html_content: html,
      email_type: emailType,
      status: 'pending',
    });

    // Send email via SendGrid
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@homeopathyclinic.com',
      subject,
      html,
    };

    const response = await sgMail.send(msg);

    // Update email record with success
    emailRecord.status = 'sent';
    emailRecord.sent_at = new Date();
    emailRecord.sendgrid_message_id = response[0].headers['x-message-id'];
    await emailRecord.save();

    return emailRecord;
  } catch (error) {
    console.error('SendGrid error:', error);
    const err = new Error(`Failed to send email: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

exports.sendAppointmentConfirmation = async (appointment, user) => {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; text-align: center; border-radius: 5px 5px 0 0;">
        <h1>Appointment Confirmed</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear ${user.name},</p>
        <p>Your appointment has been successfully booked!</p>
        <h3 style="color: #333;">Appointment Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date & Time:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${appointment.slot?.startTime}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Patient Name:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${appointment.patientName}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${appointment.reason}</td>
          </tr>
        </table>
        <p style="color: #666;">We will send you a reminder 24 hours before your appointment.</p>
        <p>If you need to cancel or reschedule, please contact us.</p>
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
          This is an automated email. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  return exports.sendEmail({
    to: user.email,
    subject: 'Your Appointment Confirmation',
    html: htmlTemplate,
    emailType: 'appointment_confirmation',
    userId: user._id,
    appointmentId: appointment._id,
  });
};

exports.sendAppointmentReminder = async (appointment, user) => {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #FFA500; padding: 20px; color: white; text-align: center; border-radius: 5px 5px 0 0;">
        <h1>Appointment Reminder</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear ${user.name},</p>
        <p>This is a reminder about your upcoming appointment with us tomorrow!</p>
        <h3 style="color: #333;">Appointment Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date & Time:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${appointment.slot?.startTime}</td>
          </tr>
        </table>
        <p>Please arrive 10 minutes early. If you wish to cancel or reschedule, please let us know as soon as possible.</p>
      </div>
    </div>
  `;

  return exports.sendEmail({
    to: user.email,
    subject: 'Appointment Reminder - Tomorrow',
    html: htmlTemplate,
    emailType: 'appointment_reminder',
    userId: user._id,
    appointmentId: appointment._id,
  });
};

exports.sendContactFormEmail = async (formData) => {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${formData.name}</p>
      <p><strong>Email:</strong> ${formData.email}</p>
      <p><strong>Phone:</strong> ${formData.phone}</p>
      <p><strong>Message:</strong></p>
      <p>${formData.message}</p>
    </div>
  `;

  return exports.sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `New Contact Form Submission from ${formData.name}`,
    html: htmlTemplate,
    emailType: 'contact_form',
  });
};

exports.getEmailHistory = async (userId, filters = {}) => {
  const query = { user: userId };

  if (filters.status) query.status = filters.status;

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const emails = await Email.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Email.countDocuments(query);

  return {
    data: emails,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};
