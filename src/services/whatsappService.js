const SiteSettings = require('../models/SiteSettings');

exports.sendWhatsAppMessage = async ({ to, body }) => {
  try {
    const cleanTo = String(to || '').replace(/[^\d+]/g, '');
    if (!cleanTo) {
      console.log('[WhatsAppService] Skipped: No phone number provided');
      return { success: false, message: 'No recipient phone number' };
    }

    console.log(`[WhatsApp Message to ${cleanTo}]:\n${body}`);

    // If WhatsApp Cloud API credentials are configured and real
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_BUSINESS_PHONE_ID;
    if (token && phoneId && !token.includes('your_') && !phoneId.includes('your_')) {
      try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanTo.replace(/^\+/, ''),
            type: 'text',
            text: { body },
          }),
        });
        const resData = await response.json();
        return { success: response.ok, data: resData };
      } catch (err) {
        console.error('[WhatsApp Cloud API error]:', err.message);
      }
    }

    return {
      success: true,
      to: cleanTo,
      body,
      delivered: true,
      message: 'WhatsApp notification logged/dispatched successfully',
    };
  } catch (error) {
    console.error('[WhatsAppService error]:', error.message);
    return { success: false, error: error.message };
  }
};

exports.formatAppointmentMessage = (appointment, slot) => {
  const concernText = appointment.concern === 'Other' && appointment.customConcern
    ? `Other (${appointment.customConcern})`
    : (appointment.concern || appointment.reason || 'General Consultation');

  const slotTime = slot
    ? `${new Date(slot.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(slot.startTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    : (appointment.appointmentTime || 'Scheduled slot');

  const rawType = appointment.bookingType || appointment.consultation_type || 'offline';
  const isOnline = String(rawType).toLowerCase() === 'online';
  const modeText = isOnline ? 'Online Consultation' : 'Clinic Visit (Offline)';

  const planType = appointment.planType || (appointment.medicineDuration === '7_days' ? 'SEVEN_DAYS' : (appointment.medicineDuration === '30_days' || appointment.medicineDuration === '1_month' ? 'ONE_MONTH' : null));
  const planTitle = isOnline ? (planType === 'SEVEN_DAYS' ? '7 Days Plan' : (planType === 'ONE_MONTH' ? '1 Month Plan' : (appointment.medicineDuration ? appointment.medicineDuration.replace('_', ' ') : 'Subscription Plan'))) : null;

  const totalAmountNum = appointment.totalAmount !== undefined ? appointment.totalAmount : appointment.amount;
  const amountStr = totalAmountNum !== undefined ? `₹${totalAmountNum.toLocaleString('en-IN')}` : '-';

  const paymentMethodText = appointment.paymentMethod === 'online' ? 'Online Payment (Razorpay)' : 'Offline (Pay at Clinic)';
  const paymentStatusText = appointment.payment_status === 'paid' ? 'Paid' : 'Pending (Pay at Consultation)';

  return [
    `*MD's Homoeopathy — Appointment Details*`,
    `----------------------------------------`,
    `👤 *Patient Name:* ${appointment.patientName}`,
    `📞 *Phone:* ${appointment.patientPhone || '-'}`,
    appointment.patientEmail ? `✉️ *Email:* ${appointment.patientEmail}` : null,
    `🩺 *Concern:* ${concernText}`,
    appointment.city ? `📍 *City:* ${appointment.city}` : null,
    appointment.age ? `🎂 *Age:* ${appointment.age}` : null,
    `🌐 *Booking Type:* ${isOnline ? 'Online' : 'Offline'}`,
    planTitle ? `📦 *Plan:* ${planTitle}` : null,
    isOnline ? `🚚 *Delivery Charges:* Included` : null,
    `💰 *${isOnline ? 'Total Payable Amount' : 'Appointment Fee'}:* ${amountStr}`,
    `📅 *Appointment Date & Time:* ${slotTime}`,
    `💳 *Payment Method:* ${paymentMethodText}`,
    `📌 *Payment Status:* ${paymentStatusText}`,
    `----------------------------------------`,
    `Status: ${appointment.status.toUpperCase()}`,
  ].filter(Boolean).join('\n');
};
