const {
  formatDate,
  formatTime,
  renderStatusBadge,
  renderTableRow,
  renderSectionTitle,
  renderCallout,
  wrapEmail,
} = require('./emailBase');

/**
 * Generate HTML email for Admin Product Order Notification
 * @param {Object} data - Populated order object or data wrapper
 * @returns {String} HTML email string
 */
function generateOrderAdminEmail(data = {}) {
  const order = data.order || data;
  const customerName = order.customer_name || data.customerName || 'Customer';
  const customerEmail = order.customer_email || 'Not provided';
  const customerPhone = order.customer_phone || 'Not provided';

  const orderNumber = order.order_number || (order._id ? `ORD-${String(order._id).slice(-8).toUpperCase()}` : 'ORD-NEW');

  const orderDate = order.created_at || order.createdAt || new Date();
  const formattedDate = `${formatDate(orderDate)} at ${formatTime(orderDate)}`;

  const paymentStatus = order.payment_status || 'pending';
  const paymentMethod = order.payment_method || (order.razorpay_order_id ? 'Online Payment' : 'Offline / COD');

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount || 0);
  const couponCode = order.coupon_code || order.couponCode;
  const shippingCost = Number(order.shipping_cost || 0);
  const tax = Number(order.tax || 0);
  const total = Number(order.total || 0);

  const address = order.shipping_address || {};
  const hasAddress = Boolean(address.street || address.city || address.state || address.postal_code);

  const addressString = [
    address.street,
    address.city,
    address.state,
    address.postal_code,
    address.country || 'India',
  ].filter(Boolean).join(', ');

  // Product rows
  const productRowsHtml = items.map((item, index) => {
    const productName = item.product?.name || item.name || 'Homoeopathy Medicine / Product';
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.price || item.unitPrice || 0);
    const lineTotal = unitPrice * qty;
    const bg = index % 2 === 1 ? '#f8fafc' : '#ffffff';

    return `
      <tr style="background-color: ${bg};">
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600;">
          ${productName}
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: center;">
          ${qty}
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: right;">
          ₹${unitPrice}
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #047857; font-weight: 700; text-align: right;">
          ₹${lineTotal}
        </td>
      </tr>
    `;
  }).join('');

  // Customer rows
  let custCount = 0;
  const isCustAlt = () => custCount++ % 2 === 1;
  const customerRows = [
    renderTableRow('Customer Name', `<strong>${customerName}</strong>`, isCustAlt()),
    renderTableRow('Email Address', customerEmail !== 'Not provided' ? `<a href="mailto:${customerEmail}" style="color: #047857; text-decoration: none; font-weight: 600;">${customerEmail}</a>` : customerEmail, isCustAlt()),
    renderTableRow('Contact Phone', customerPhone !== 'Not provided' ? `<a href="tel:${customerPhone}" style="color: #047857; text-decoration: none; font-weight: 600;">${customerPhone}</a>` : customerPhone, isCustAlt()),
  ];

  // Order overview rows
  let ordCount = 0;
  const isOrdAlt = () => ordCount++ % 2 === 1;
  const orderRows = [
    renderTableRow('Order Number', `<span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #047857;">${orderNumber}</span>`, isOrdAlt()),
    renderTableRow('Order Date & Time', formattedDate, isOrdAlt()),
  ];

  // Summary rows
  let summaryCount = 0;
  const isSummaryAlt = () => summaryCount++ % 2 === 1;
  const summaryRows = [
    renderTableRow('Subtotal', `₹${subtotal}`, isSummaryAlt()),
  ];
  if (discount > 0) {
    summaryRows.push(
      renderTableRow(
        'Discount Given',
        `<span style="color: #047857; font-weight: 600;">- ₹${discount}${couponCode ? ` (Coupon: ${couponCode})` : ''}</span>`,
        isSummaryAlt()
      )
    );
  }
  summaryRows.push(
    renderTableRow('Delivery Charges', `₹${shippingCost || 80}`, isSummaryAlt())
  );
  if (tax > 0) {
    summaryRows.push(renderTableRow('Tax Collected', `₹${tax}`, isSummaryAlt()));
  }
  summaryRows.push(
    renderTableRow(
      '<span style="font-size: 15px; font-weight: 700; color: #0f172a;">Final Amount Payable</span>',
      `<span style="font-size: 18px; font-weight: 800; color: #047857;">₹${total}</span>`,
      isSummaryAlt()
    )
  );

  // Payment rows
  let payCount = 0;
  const isPayAlt = () => payCount++ % 2 === 1;
  const paymentRows = [
    renderTableRow('Payment Method', paymentMethod, isPayAlt()),
    renderTableRow('Payment Status', renderStatusBadge(paymentStatus), isPayAlt()),
  ];
  if (order.razorpay_payment_id) {
    paymentRows.push(renderTableRow('Razorpay Payment ID', `<span style="font-family: monospace;">${order.razorpay_payment_id}</span>`, isPayAlt()));
  }
  if (order.razorpay_order_id) {
    paymentRows.push(renderTableRow('Razorpay Order ID', `<span style="font-family: monospace;">${order.razorpay_order_id}</span>`, isPayAlt()));
  }

  // Shipping rows
  let shipCount = 0;
  const isShipAlt = () => shipCount++ % 2 === 1;
  const shippingRows = [
    renderTableRow('Recipient Name', order.customer_name || customerName, isShipAlt()),
    renderTableRow('Contact Phone', order.customer_phone || '-', isShipAlt()),
    renderTableRow('Full Shipping Address', hasAddress ? addressString : 'Standard Address', isShipAlt()),
  ];
  if (address.city) shippingRows.push(renderTableRow('City', address.city, isShipAlt()));
  if (address.state) shippingRows.push(renderTableRow('State', address.state, isShipAlt()));
  if (address.postal_code) shippingRows.push(renderTableRow('Postal / ZIP Code', address.postal_code, isShipAlt()));

  const content = `
    <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0;">Hello <strong>Dr. Parth Bhargava & Admin Team</strong>,</p>
      <p style="margin: 0 0 16px 0;">
        A new product order has been successfully placed by a customer.
      </p>
    </div>

    ${renderCallout(`
      <strong>📦 New Product Order:</strong> ${orderNumber} from <strong>${customerName}</strong> for total value of <strong>₹${total}</strong>.
    `, 'info')}

    ${renderSectionTitle('Customer Information')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${customerRows.join('')}
    </table>

    ${renderSectionTitle('Order Information')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${orderRows.join('')}
    </table>

    ${renderSectionTitle('Products Ordered')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background-color: #047857; color: #ffffff;">
          <th style="padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase;">Product</th>
          <th style="padding: 10px 14px; text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase;">Qty</th>
          <th style="padding: 10px 14px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase;">Unit Price</th>
          <th style="padding: 10px 14px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${productRowsHtml || '<tr><td colspan="4" style="padding: 14px; text-align: center; color: #64748b;">No items listed</td></tr>'}
      </tbody>
    </table>

    ${renderSectionTitle('Order Summary')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${summaryRows.join('')}
    </table>

    ${renderSectionTitle('Payment Information')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${paymentRows.join('')}
    </table>

    ${renderSectionTitle('Shipping & Delivery Address')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${shippingRows.join('')}
    </table>

    <div style="background-color: #f8fafc; border-left: 4px solid #64748b; padding: 14px 16px; border-radius: 4px; font-size: 12px; color: #64748b; margin-top: 20px;">
      This order is logged in your clinic database. Please proceed with packaging and dispatch through your inventory dashboard.
    </div>
  `;

  return wrapEmail({
    subtitle: 'New Product Order Notification',
    content,
  });
}

module.exports = {
  generateOrderAdminEmail,
};
