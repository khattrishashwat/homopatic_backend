/**
 * Shared email base layout, styling, and helper components for MD's Homoeopathy.
 * Designed for cross-client compatibility (Gmail, Outlook, iOS Mail, Android).
 */

const CLINIC_INFO = {
  name: "MD's Homoeopathy",
  tagline: "Trusted Care for Long-term Wellness",
  phone: "+91 7668610031",
  email: "drparthbhargava@mdshomoeopathy.com",
  address: "MD's Homoeopathy Clinic",
};

/**
 * Format date for display in IST
 */
const formatDate = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
};

/**
 * Format time for display in IST
 */
const formatTime = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateVal);
  }
};

/**
 * Render payment status badge with appropriate styling
 */
const renderStatusBadge = (status) => {
  const s = String(status || 'pending').toLowerCase();
  let bg = '#fffbeb';
  let border = '#f59e0b';
  let color = '#b45309';
  let text = 'Pending';

  if (s === 'paid' || s === 'completed' || s === 'captured' || s === 'success') {
    bg = '#ecfdf5';
    border = '#10b981';
    color = '#047857';
    text = 'Paid';
  } else if (s === 'failed') {
    bg = '#fef2f2';
    border = '#ef4444';
    color = '#b91c1c';
    text = 'Failed';
  } else if (s === 'refunded') {
    bg = '#f3f4f6';
    border = '#9ca3af';
    color = '#374151';
    text = 'Refunded';
  } else if (s.includes('offline') || s.includes('consultation')) {
    bg = '#fffbeb';
    border = '#f59e0b';
    color = '#b45309';
    text = status;
  } else {
    text = status || 'Pending';
  }

  return `<span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background-color: ${bg}; border: 1px solid ${border}; color: ${color};">${text}</span>`;
};

/**
 * Render consultation type badge
 */
const renderConsultationBadge = (type) => {
  const isOnline = String(type || '').toLowerCase() === 'online';
  if (isOnline) {
    return `<span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #eff6ff; border: 1px solid #3b82f6; color: #1d4ed8;">🌐 Online Consultation</span>`;
  }
  return `<span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #f0fdfa; border: 1px solid #14b8a6; color: #0f766e;">🏥 Clinic Visit (Offline)</span>`;
};

/**
 * Key-value table row
 */
const renderTableRow = (label, value, isAlt = false) => {
  const bg = isAlt ? '#f8fafc' : '#ffffff';
  return `
    <tr style="background-color: ${bg};">
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600; width: 38%; vertical-align: top;">
        ${label}
      </td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 500; vertical-align: top;">
        ${value !== undefined && value !== null && value !== '' ? value : '-'}
      </td>
    </tr>
  `;
};

/**
 * Section Title Component
 */
const renderSectionTitle = (title) => {
  return `
    <div style="margin: 24px 0 10px 0; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;">
      <h3 style="margin: 0; font-size: 13px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.75px;">
        ${title}
      </h3>
    </div>
  `;
};

/**
 * Highlight / Callout Box
 */
const renderCallout = (content, type = 'success') => {
  let bg = '#ecfdf5';
  let border = '#10b981';
  let color = '#065f46';

  if (type === 'info') {
    bg = '#eff6ff';
    border = '#3b82f6';
    color = '#1e40af';
  } else if (type === 'warning') {
    bg = '#fffbeb';
    border = '#f59e0b';
    color = '#92400e';
  }

  return `
    <div style="background-color: ${bg}; border-left: 4px solid ${border}; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: ${color}; line-height: 1.5;">
      ${content}
    </div>
  `;
};

/**
 * Wrap content in full responsive HTML email template
 */
const wrapEmail = ({ subtitle, content }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${CLINIC_INFO.name} - ${subtitle}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; border-radius: 0 !important; }
      .email-padding { padding: 16px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; color: #1e293b;">
  <center style="width: 100%; background-color: #f1f5f9;">
    <!--[if mso]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center">
    <tr>
    <td>
    <![endif]-->
    <div style="max-width: 600px; margin: 0 auto;" class="email-container">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
        
        <!-- HEADER -->
        <tr>
          <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
              <tr>
                <td align="center">
                  <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 50%; width: 44px; height: 44px; line-height: 44px; text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 10px; color: #ffffff;">
                    ✚
                  </div>
                  <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-transform: uppercase;">
                    ${CLINIC_INFO.name}
                  </h1>
                  <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 500; color: #d1fae5; letter-spacing: 0.25px;">
                    ${subtitle}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY CONTENT -->
        <tr>
          <td class="email-padding" style="padding: 28px 28px 20px 28px; background-color: #ffffff;">
            ${content}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color: #f8fafc; padding: 24px 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a;">
              ${CLINIC_INFO.name}
            </p>
            <p style="margin: 0 0 8px 0; font-style: italic; color: #059669; font-weight: 500;">
              ${CLINIC_INFO.tagline}
            </p>
            <p style="margin: 0; color: #64748b;">
              Phone: <a href="tel:${CLINIC_INFO.phone}" style="color: #059669; text-decoration: none; font-weight: 600;">${CLINIC_INFO.phone}</a> &nbsp;|&nbsp; 
              Email: <a href="mailto:${CLINIC_INFO.email}" style="color: #059669; text-decoration: none; font-weight: 600;">${CLINIC_INFO.email}</a>
            </p>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">
              © ${new Date().getFullYear()} ${CLINIC_INFO.name}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </div>
    <!--[if mso]>
    </td>
    </tr>
    </table>
    <![endif]-->
  </center>
</body>
</html>`;
};

module.exports = {
  CLINIC_INFO,
  formatDate,
  formatTime,
  renderStatusBadge,
  renderConsultationBadge,
  renderTableRow,
  renderSectionTitle,
  renderCallout,
  wrapEmail,
};
