const nodemailer = require('nodemailer');
const Email = require('../models/Email');
const {
  generateAppointmentUserEmail,
  generateAppointmentAdminEmail,
  generateContactUserEmail,
  generateContactAdminEmail,
  generateOrderUserEmail,
  generateOrderAdminEmail,
  generateAppointmentReminderEmail,
} = require('../emails/templates');

/**
 * Initialize Nodemailer transporter with Hostinger SMTP configuration
 */
const getTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.hostinger.com';
  const port = Number(process.env.EMAIL_PORT) || 465;
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
};

const transporter = getTransporter();

/**
 * Verify transporter connection safely without throwing
 */
exports.verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('[EmailService] Nodemailer Hostinger SMTP connected successfully.');
    return true;
  } catch (error) {
    const safeError = error.message ? error.message.replace(process.env.EMAIL_PASSWORD || '___NONE___', '******') : 'Unknown error';
    console.warn('[EmailService] Hostinger SMTP verification note:', safeError);
    return false;
  }
};

/**
 * Central email sending function
 * Creates DB record before sending, dispatches via Nodemailer, updates DB record
 * @param {Object} data - Email parameters
 * @returns {Promise<Object|null>} Saved Email record
 */
exports.sendEmail = async (data = {}) => {
  const {
    to,
    subject,
    html,
    emailType = 'generic',
    userId,
    appointmentId,
    orderId,
    replyTo,
    from,
  } = data;

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.log('[EmailService] Skipped: No valid recipient email provided:', to);
    return null;
  }

  const recipient = to.trim();
  let emailRecord = null;

  try {
    // 1. Create DB record before sending with 'pending' status
    emailRecord = await Email.create({
      user: userId || undefined,
      appointment: appointmentId || undefined,
      order: orderId || undefined,
      to_email: recipient,
      subject,
      html_content: html,
      email_type: emailType,
      status: 'pending',
    });

    const senderEmail = from || process.env.EMAIL_FROM || process.env.EMAIL_USER || 'drparthbhargava@mdshomoeopathy.com';
    const mailOptions = {
      from: `"MD's Homoeopathy" <${senderEmail}>`,
      to: recipient,
      subject,
      html,
    };

    if (replyTo && typeof replyTo === 'string' && replyTo.includes('@')) {
      mailOptions.replyTo = replyTo.trim();
    }

    console.log(`[EmailService] Dispatching [${emailType}] to ${recipient}: "${subject}"`);

    // 2. Dispatch via Nodemailer
    const info = await transporter.sendMail(mailOptions);

    console.log(`[EmailService] Sent successfully to ${recipient}. MessageId: ${info?.messageId}`);

    // 3. Mark as sent only after successful dispatch
    emailRecord.status = 'sent';
    emailRecord.sent_at = new Date();
    emailRecord.message_id = info?.messageId;
    emailRecord.sendgrid_message_id = info?.messageId; // Preserve legacy field compatibility
    await emailRecord.save();

    return emailRecord;
  } catch (error) {
    const password = process.env.EMAIL_PASSWORD || '___NONE___';
    const safeError = error.message ? error.message.split(password).join('******') : 'Unknown email error';
    console.error(`[EmailService Error sending ${emailType} to ${recipient}]:`, safeError);

    if (emailRecord) {
      emailRecord.status = 'failed';
      emailRecord.error_message = safeError;
      await emailRecord.save().catch((saveErr) => {
        console.error('[EmailService] Error updating email failure status:', saveErr.message);
      });
    }

    return emailRecord;
  }
};

/**
 * Send Patient and Admin Appointment Booking Emails
 * @param {Object} appointment - Appointment document
 * @param {Object} slot - Slot document
 * @returns {Promise<Object>} { userEmailResult, adminEmailResult }
 */
exports.sendAppointmentBookingEmails = async (appointment, slot) => {
  const results = { userEmailResult: null, adminEmailResult: null };

  try {
    const patientEmail = appointment.patientEmail;
    const adminEmail = process.env.ADMIN_EMAIL || 'drparthbhargava@mdshomoeopathy.com';

    // A) Send to Patient
    if (patientEmail && patientEmail.includes('@')) {
      const userHtml = generateAppointmentUserEmail({ appointment, slot });
      results.userEmailResult = await exports.sendEmail({
        to: patientEmail,
        subject: "Appointment Booking Confirmed - MD's Homoeopathy",
        html: userHtml,
        emailType: 'appointment_user',
        userId: appointment.user,
        appointmentId: appointment._id,
      });
    } else {
      console.log('[EmailService] No patient email available for appointment confirmation:', appointment._id);
    }

    // B) Send to Admin
    if (adminEmail && adminEmail.includes('@')) {
      const adminHtml = generateAppointmentAdminEmail({ appointment, slot });
      results.adminEmailResult = await exports.sendEmail({
        to: adminEmail,
        subject: `New Appointment Booked - ${appointment.patientName || 'Patient'}`,
        html: adminHtml,
        emailType: 'appointment_admin',
        userId: appointment.user,
        appointmentId: appointment._id,
      });
    }
  } catch (err) {
    console.error('[EmailService.sendAppointmentBookingEmails Error]:', err.message);
  }

  return results;
};

/**
 * Legacy wrapper: Send appointment confirmation
 * Maintains backward compatibility with existing callers
 */
exports.sendAppointmentConfirmation = async (appointment, recipient, slot) => {
  const toEmail = recipient?.email || appointment.patientEmail;
  if (!toEmail) return null;

  const isAdmin = toEmail === process.env.ADMIN_EMAIL || recipient?.name === 'Clinic Admin';
  const html = isAdmin
    ? generateAppointmentAdminEmail({ appointment, slot })
    : generateAppointmentUserEmail({ appointment, slot });

  const subject = isAdmin
    ? `New Appointment Booked - ${appointment.patientName || 'Patient'}`
    : "Appointment Booking Confirmed - MD's Homoeopathy";

  const emailType = isAdmin ? 'appointment_admin' : 'appointment_user';

  return exports.sendEmail({
    to: toEmail,
    subject,
    html,
    emailType,
    userId: recipient?._id || appointment.user,
    appointmentId: appointment._id,
  });
};

/**
 * Send Appointment Reminder (Tomorrow / Upcoming)
 * @param {Object} appointment - Appointment document
 * @param {Object} user - User / patient object
 * @returns {Promise<Object|null>}
 */
exports.sendAppointmentReminder = async (appointment, user = {}) => {
  try {
    const toEmail = user.email || appointment.patientEmail;
    if (!toEmail) return null;

    const html = generateAppointmentReminderEmail({ appointment, user, slot: appointment.slot });

    return exports.sendEmail({
      to: toEmail,
      subject: "Appointment Reminder - Tomorrow - MD's Homoeopathy",
      html,
      emailType: 'appointment_reminder',
      userId: user._id || appointment.user,
      appointmentId: appointment._id,
    });
  } catch (error) {
    console.error('[EmailService.sendAppointmentReminder Error]:', error.message);
    return null;
  }
};

/**
 * Send Contact Form Emails (Admin notification + User acknowledgement)
 * @param {Object} formData - { name, email, phone, message }
 * @returns {Promise<Object>} { adminEmailResult, userEmailResult }
 */
exports.sendContactFormEmails = async (formData = {}) => {
  const results = { adminEmailResult: null, userEmailResult: null };

  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'drparthbhargava@mdshomoeopathy.com';
    const userEmail = formData.email;

    // A) Send Admin Notification
    if (adminEmail) {
      const adminHtml = generateContactAdminEmail(formData);
      results.adminEmailResult = await exports.sendEmail({
        to: adminEmail,
        replyTo: userEmail || undefined,
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        subject: `New Contact Form Submission - ${formData.name || 'Visitor'}`,
        html: adminHtml,
        emailType: 'contact_form_admin',
      });
    }

    // B) Send User Acknowledgement (if valid email provided)
    if (userEmail && userEmail.includes('@')) {
      const userHtml = generateContactUserEmail(formData);
      results.userEmailResult = await exports.sendEmail({
        to: userEmail,
        subject: "Your message has been received - MD's Homoeopathy",
        html: userHtml,
        emailType: 'contact_form_user',
      });
    }
  } catch (err) {
    console.error('[EmailService.sendContactFormEmails Error]:', err.message);
  }

  return results;
};

/**
 * Backward compatibility alias for single contact form email
 */
exports.sendContactFormEmail = async (formData) => {
  return exports.sendContactFormEmails(formData);
};

/**
 * Send Customer & Admin Product Order Emails
 * @param {Object} order - Populated Order document
 * @returns {Promise<Object>} { userEmailResult, adminEmailResult }
 */
exports.sendOrderEmails = async (order = {}) => {
  const results = { userEmailResult: null, adminEmailResult: null };

  try {
    const customerEmail = order.customer_email;
    const adminEmail = process.env.ADMIN_EMAIL || 'drparthbhargava@mdshomoeopathy.com';
    const orderNumber = order.order_number || String(order._id);

    // A) Customer Email
    if (customerEmail && customerEmail.includes('@')) {
      const customerHtml = generateOrderUserEmail({ order });
      results.userEmailResult = await exports.sendEmail({
        to: customerEmail,
        subject: `Order Confirmed - ${orderNumber}`,
        html: customerHtml,
        emailType: 'order_user',
        userId: order.user,
        orderId: order._id,
      });
    } else {
      console.log('[EmailService] No customer email available for order confirmation:', order._id);
    }

    // B) Admin Email
    if (adminEmail && adminEmail.includes('@')) {
      const adminHtml = generateOrderAdminEmail({ order });
      results.adminEmailResult = await exports.sendEmail({
        to: adminEmail,
        subject: `New Product Order - ${orderNumber}`,
        html: adminHtml,
        emailType: 'order_admin',
        userId: order.user,
        orderId: order._id,
      });
    }
  } catch (err) {
    console.error('[EmailService.sendOrderEmails Error]:', err.message);
  }

  return results;
};

/**
 * Get Email History for a user
 * @param {String} userId
 * @param {Object} filters
 */
exports.getEmailHistory = async (userId, filters = {}) => {
  const query = { user: userId };

  if (filters.status) query.status = filters.status;
  if (filters.email_type) query.email_type = filters.email_type;

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
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
