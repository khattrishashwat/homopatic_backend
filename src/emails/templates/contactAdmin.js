const {
  formatDate,
  formatTime,
  renderTableRow,
  renderSectionTitle,
  renderCallout,
  wrapEmail,
} = require('./emailBase');

/**
 * Generate HTML email for Admin Contact Form Notification
 * @param {Object} data - Contact form data { name, email, phone, message, submittedAt }
 * @returns {String} HTML email string
 */
function generateContactAdminEmail(data = {}) {
  const name = data.name || 'Visitor';
  const email = data.email || 'Not provided';
  const phone = data.phone || 'Not provided';
  const submittedAt = data.submittedAt || new Date();
  const formattedDate = formatDate(submittedAt);
  const formattedTime = formatTime(submittedAt);
  const message = data.message || '(No message provided)';

  const detailsRows = [
    renderTableRow('Sender Name', `<strong>${name}</strong>`, false),
    renderTableRow('Email Address', email !== 'Not provided' ? `<a href="mailto:${email}" style="color: #047857; text-decoration: none; font-weight: 600;">${email}</a>` : email, true),
    renderTableRow('Phone Number', phone !== 'Not provided' ? `<a href="tel:${phone}" style="color: #047857; text-decoration: none; font-weight: 600;">${phone}</a>` : phone, false),
    renderTableRow('Submission Date', formattedDate, true),
    renderTableRow('Submission Time', formattedTime, false),
  ];

  const content = `
    <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0;">Hello <strong>Dr. Parth Bhargava & Admin Team</strong>,</p>
      <p style="margin: 0 0 16px 0;">
        A new contact form inquiry has been submitted through the clinic website.
      </p>
    </div>

    ${renderCallout(`
      <strong>📩 New Message Received:</strong> From <strong>${name}</strong> (${phone}). You can reply directly to this email to reach them.
    `, 'info')}

    ${renderSectionTitle('Sender Information')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${detailsRows.join('')}
    </table>

    ${renderSectionTitle('User Message')}
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #047857; border-radius: 6px; padding: 18px; font-size: 14px; color: #0f172a; line-height: 1.7; white-space: pre-wrap; margin-bottom: 24px;">
      ${message}
    </div>

    <div style="background-color: #f1f5f9; border-radius: 6px; padding: 12px 16px; font-size: 12px; color: #64748b;">
      💡 <strong>Quick Action:</strong> Click "Reply" in your email client to respond directly to <strong>${email}</strong>.
    </div>
  `;

  return wrapEmail({
    subtitle: 'New Contact Form Submission',
    content,
  });
}

module.exports = {
  generateContactAdminEmail,
};
