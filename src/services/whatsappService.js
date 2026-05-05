exports.sendWhatsAppMessage = async ({ to, body }) => {
  // Implement WhatsApp provider integration here.
  // Example: Twilio, Vonage, or any WhatsApp Business API.
  return {
    success: true,
    to,
    body,
    delivered: false,
    message: 'WhatsApp integration is not configured yet.',
  };
};
