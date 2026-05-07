exports.validateOrderPayload = (payload) => {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    const error = new Error('Order must include at least one item');
    error.statusCode = 400;
    throw error;
  }
  if (!payload.customer_name || !payload.customer_email || !payload.customer_phone) {
    const error = new Error('Customer name, email, and phone are required');
    error.statusCode = 400;
    throw error;
  }
};
