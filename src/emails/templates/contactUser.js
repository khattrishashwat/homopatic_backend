const {
  formatDate,
  formatTime,
  renderTableRow,
  renderSectionTitle,
  renderCallout,
  wrapEmail,
} = require('./emailBase');

/**
 * Generate HTML email for Contact Form User Confirmation
 * @param {Object} data - Contact form data { name, email, phone, message, submittedAt }
 * @returns {String} HTML email string
 */
function generateContactUserEmail(data = {}) {
  const name = data.name || 'Valued Visitor';
  const email = data.email || '-';
  const submittedAt = data.submittedAt || new Date();
  const formattedDate = formatDate(submittedAt);
  const formattedTime = formatTime(submittedAt);
  const userMessage = data.message || '';

  const detailsRows = [
    renderTableRow('Your Name', `<strong>${name}</strong>`, false),
    renderTableRow('Registered Email', email, true),
    renderTableRow('Submission Date', formattedDate, false),
    renderTableRow('Submission Time', formattedTime, true),
  ];

  const content = `
    <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
      <p style="margin: 0 0 12px 0;">Dear <strong>${name}</strong>,</p>
      <p style="margin: 0 0 16px 0;">
        Thank you for contacting <strong>MD's Homoeopathy Clinic</strong>. Your message has been successfully received by our clinic team.
      </p>
    </div>

    ${renderCallout(`
      <strong>✓ Message Received:</strong> Our medical and support team will review your query and get back to you shortly via phone or email.
    `, 'success')}

    ${renderSectionTitle('Submission Summary')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${detailsRows.join('')}
    </table>

    ${userMessage ? `
      ${renderSectionTitle('Your Query / Message')}
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 6px; padding: 16px; font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap; margin-bottom: 24px;">
        ${userMessage}
      </div>
    ` : ''}

    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin-top: 24px; text-align: center;">
      <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #065f46;">Need immediate consultation or urgent assistance?</p>
      <p style="margin: 0; font-size: 13px; color: #047857;">
        Call our direct helpline at <a href="tel:+917668610031" style="color: #047857; font-weight: bold; text-decoration: underline;">+91 7668610031</a>
      </p>
    </div>
  `;

  return wrapEmail({
    subtitle: 'Message Received',
    content,
  });
}

module.exports = {
  generateContactUserEmail,
};
