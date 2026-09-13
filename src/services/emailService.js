const sgMail = require('@sendgrid/mail');
const Email = require('../models/Email');

if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

exports.sendEmail = async (data) => {
  try {
    const { to, subject, html, emailType = 'generic', userId, appointmentId } = data;
    if (!to || !to.includes('@')) {
      console.log('[EmailService] Skipped: No valid recipient email provided:', to);
      return null;
    }

    console.log(`[Email to ${to}]: Subject: ${subject}`);

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

    const hasRealSendGrid = process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.');
    if (hasRealSendGrid) {
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@homeopathyclinic.com',
        subject,
        html,
      };

      const response = await sgMail.send(msg);
      emailRecord.status = 'sent';
      emailRecord.sent_at = new Date();
      emailRecord.sendgrid_message_id = response[0]?.headers?.['x-message-id'];
      await emailRecord.save();
    } else {
      emailRecord.status = 'sent';
      emailRecord.sent_at = new Date();
      await emailRecord.save();
    }

    return emailRecord;
  } catch (error) {
    console.error('[EmailService error]:', error.message);
    return null;
  }
};

exports.sendAppointmentConfirmation = async (appointment, recipient, slot) => {
  const toEmail = recipient?.email || appointment.patientEmail;
  if (!toEmail) return null;

  const recipientName = recipient?.name || appointment.patientName || 'Valued Patient';
  const concernText = appointment.concern === 'Other' && appointment.customConcern
    ? `Other (${appointment.customConcern})`
    : (appointment.concern || appointment.reason || 'General Consultation');

  const slotTime = slot
    ? `${new Date(slot.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(slot.startTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    : (appointment.appointmentTime || 'Scheduled slot');

  const modeText = appointment.consultation_type === 'online' ? 'Online Consultation' : 'Clinic Visit (Offline)';
  const paymentMethodText = appointment.paymentMethod === 'online' ? 'Online Payment' : 'Offline Payment';
  const paymentStatusText = appointment.payment_status === 'paid' ? 'Paid' : 'Pending (Pay at Consultation)';

  const htmlTemplate = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1a202c;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700;">MD's Homoeopathy</h1>
        <p style="margin: 6px 0 0; opacity: 0.9; font-size: 15px;">Appointment Details & Confirmation</p>
      </div>
      <div style="padding: 24px; background: #ffffff;">
        <p style="font-size: 16px;">Dear <strong>${recipientName}</strong>,</p>
        <p style="color: #4a5568; line-height: 1.6;">Your Homoeopathy consultation appointment has been scheduled successfully.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background: #f8fafc;">
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 40%;"><strong>Patient Name</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${appointment.patientName}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Phone</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${appointment.patientPhone || '-'}</td>
          </tr>
          ${appointment.city ? `
          <tr style="background: #f8fafc;">
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>City</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${appointment.city}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Health Concern</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #047857;">${concernText}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Consultation Mode</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${modeText}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Appointment Date & Time</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${slotTime}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Payment Method</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${paymentMethodText}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Payment Status</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${paymentStatusText}</td>
          </tr>
        </table>

        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px; border-radius: 4px; margin-top: 20px;">
          <p style="margin: 0; font-size: 13px; color: #065f46;">Need to reschedule or have questions? Contact us at <strong>+91 7668610031</strong> or reply via WhatsApp.</p>
        </div>
      </div>
      <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        MD's Homoeopathy Clinic · Trusted Care for Long-term Wellness
      </div>
    </div>
  `;

  return exports.sendEmail({
    to: toEmail,
    subject: `Appointment Details — MD's Homoeopathy (${appointment.patientName})`,
    html: htmlTemplate,
    emailType: 'appointment_confirmation',
    userId: recipient?._id || appointment.user,
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
