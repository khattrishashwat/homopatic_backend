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
 * Generate HTML email for Customer Product Order Confirmation
 * @param {Object} data - Populated order object or data wrapper
 * @returns {String} HTML email string
 */
function generateOrderUserEmail(data = {}) {
  const order = data.order || data;
  const customerName = order.customer_name || data.customerName || 'Valued Customer';
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

  // Overview rows
  let rowCount = 0;
  const isAlt = () => rowCount++ % 2 === 1;
  const overviewRows = [
    renderTableRow('Order Number', `<span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #047857;">${orderNumber}</span>`, isAlt()),
    renderTableRow('Order Date & Time', formattedDate, isAlt()),
    renderTableRow('Payment Method', paymentMethod, isAlt()),
    renderTableRow('Payment Status', renderStatusBadge(paymentStatus), isAlt()),
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
        'Discount Applied',
        `<span style="color: #047857; font-weight: 600;">- ₹${discount}${couponCode ? ` (Code: ${couponCode})` : ''}</span>`,
        isSummaryAlt()
      )
    );
  }
  summaryRows.push(
    renderTableRow('Delivery Charges', `₹${shippingCost || 80}`, isSummaryAlt())
  );
  if (tax > 0) {
    summaryRows.push(renderTableRow('Applicable Tax', `₹${tax}`, isSummaryAlt()));
  }
  summaryRows.push(
    renderTableRow(
      '<span style="font-size: 15px; font-weight: 700; color: #0f172a;">Final Total Amount</span>',
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

  // Address rows
  let addrCount = 0;
  const isAddrAlt = () => addrCount++ % 2 === 1;
  const addressRows = [
    renderTableRow('Recipient Name', order.customer_name || customerName, isAddrAlt()),
    renderTableRow('Contact Phone', order.customer_phone || '-', isAddrAlt()),
    renderTableRow('Shipping Address', hasAddress ? addressString : 'Address provided at checkout', isAddrAlt()),
  ];

  const content = `
    <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
      <p style="margin: 0 0 12px 0;">Dear <strong>${customerName}</strong>,</p>
      <p style="margin: 0 0 16px 0;">
        Thank you for your purchase. Your order has been <strong>successfully placed</strong> and is being prepared with utmost clinical care.
      </p>
    </div>

    ${renderCallout(`
      <strong>✓ Order Confirmed:</strong> Your order confirmation has been sent successfully. Your order number is <strong>${orderNumber}</strong>.
    `, 'success')}

    ${renderSectionTitle('Order Overview')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${overviewRows.join('')}
    </table>

    ${renderSectionTitle('Purchased Products')}
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

    ${renderSectionTitle('Payment Details')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${paymentRows.join('')}
    </table>

    ${renderSectionTitle('Delivery Information')}
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${addressRows.join('')}
    </table>

    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 13px; color: #475569; line-height: 1.5;">
      <strong>Track your order:</strong> You will receive delivery and shipping updates once your package is dispatched. For questions regarding your order, contact us at <strong>drparthbhargava@mdshomoeopathy.com</strong>.
    </div>
  `;

  return wrapEmail({
    subtitle: 'Order Confirmation',
    content,
  });
}

module.exports = {
  generateOrderUserEmail,
};
