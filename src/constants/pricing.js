/**
 * Centralized Single Source of Truth for Appointment Pricing
 * Supports Online Subscription Plans (7 Days, 1 Month) and Offline Clinic Appointments
 */

const APPOINTMENT_PRICING = Object.freeze({
  ONLINE: Object.freeze({
    SEVEN_DAYS: Object.freeze({
      key: 'SEVEN_DAYS',
      label: '7 Days Plan',
      durationDays: 7,
      baseAmount: 500,
      deliveryCharge: 0,
      deliveryIncluded: true,
      totalAmount: 500,
    }),
    ONE_MONTH: Object.freeze({
      key: 'ONE_MONTH',
      label: '1 Month Plan',
      durationDays: 30,
      baseAmount: 1000,
      deliveryCharge: 0,
      deliveryIncluded: true,
      totalAmount: 1000,
    }),
  }),
  OFFLINE: Object.freeze({
    APPOINTMENT: Object.freeze({
      key: 'OFFLINE',
      label: 'Offline Appointment',
      durationDays: null,
      baseAmount: 200,
      deliveryCharge: 0,
      deliveryIncluded: false,
      totalAmount: 200,
    }),
  }),
});

/**
 * Calculates and validates appointment pricing server-side.
 * Never trusts frontend prices or delivery charges.
 *
 * @param {Object} params
 * @param {string} params.bookingType - 'ONLINE' or 'OFFLINE' (case-insensitive)
 * @param {string} [params.planType] - 'SEVEN_DAYS' or 'ONE_MONTH' (required for ONLINE, prohibited for OFFLINE)
 * @param {Object} [params.pricingSettings] - Optional dynamic price overrides from SiteSettings
 * @returns {Object} Validated pricing breakdown
 */
function calculateAppointmentPricing({ bookingType, planType, pricingSettings = {} }) {
  if (!bookingType || typeof bookingType !== 'string') {
    const error = new Error('Booking type is required and must be either ONLINE or OFFLINE');
    error.statusCode = 400;
    throw error;
  }

  const normBookingType = bookingType.trim().toUpperCase();

  if (!['ONLINE', 'OFFLINE'].includes(normBookingType)) {
    const error = new Error(`Invalid booking type: "${bookingType}". Must be ONLINE or OFFLINE.`);
    error.statusCode = 400;
    throw error;
  }

  // A. ONLINE BOOKING
  if (normBookingType === 'ONLINE') {
    if (!planType || typeof planType !== 'string' || !planType.trim()) {
      const error = new Error('Online booking requires a subscription plan selection (SEVEN_DAYS or ONE_MONTH)');
      error.statusCode = 400;
      throw error;
    }

    const normPlanType = planType.trim().toUpperCase();

    if (!['SEVEN_DAYS', 'ONE_MONTH'].includes(normPlanType)) {
      const error = new Error(`Invalid plan for online booking: "${planType}". Allowed plans: SEVEN_DAYS, ONE_MONTH.`);
      error.statusCode = 400;
      throw error;
    }

    const defaultPlan = APPOINTMENT_PRICING.ONLINE[normPlanType];
    const customPrice = normPlanType === 'SEVEN_DAYS'
      ? pricingSettings.online_7_days
      : pricingSettings.online_1_month;

    const baseAmount = Number(customPrice) > 0 ? Number(customPrice) : defaultPlan.baseAmount;
    const deliveryCharge = 0; // Delivery charges are strictly included in online plans
    const totalAmount = baseAmount; // No extra delivery charge

    return {
      bookingType: 'ONLINE',
      planType: normPlanType,
      planDuration: defaultPlan.durationDays,
      planLabel: defaultPlan.label,
      baseAmount,
      deliveryCharge,
      deliveryIncluded: true,
      totalAmount,
    };
  }

  // B. OFFLINE BOOKING
  // Offline appointments must not have online subscription plans
  if (planType && String(planType).trim() !== '' && String(planType).trim().toUpperCase() !== 'NULL') {
    const error = new Error('Offline appointments do not support online subscription plans. Plan type must be null.');
    error.statusCode = 400;
    throw error;
  }

  const defaultOffline = APPOINTMENT_PRICING.OFFLINE.APPOINTMENT;
  const customOffline = pricingSettings.offline;
  const baseAmount = Number(customOffline) > 0 ? Number(customOffline) : defaultOffline.baseAmount;
  const deliveryCharge = 0;
  const totalAmount = baseAmount;

  return {
    bookingType: 'OFFLINE',
    planType: null,
    planDuration: null,
    planLabel: defaultOffline.label,
    baseAmount,
    deliveryCharge,
    deliveryIncluded: false,
    totalAmount,
  };
}

/**
 * Returns current effective pricing configuration
 * @param {Object} [pricingSettings] - Optional SiteSettings overrides
 */
function getEffectivePricingConfig(pricingSettings = {}) {
  const online7 = Number(pricingSettings.online_7_days) > 0
    ? Number(pricingSettings.online_7_days)
    : APPOINTMENT_PRICING.ONLINE.SEVEN_DAYS.baseAmount;

  const online30 = Number(pricingSettings.online_1_month) > 0
    ? Number(pricingSettings.online_1_month)
    : APPOINTMENT_PRICING.ONLINE.ONE_MONTH.baseAmount;

  const offline = Number(pricingSettings.offline) > 0
    ? Number(pricingSettings.offline)
    : APPOINTMENT_PRICING.OFFLINE.APPOINTMENT.baseAmount;

  return {
    ONLINE: {
      SEVEN_DAYS: {
        ...APPOINTMENT_PRICING.ONLINE.SEVEN_DAYS,
        baseAmount: online7,
        totalAmount: online7,
      },
      ONE_MONTH: {
        ...APPOINTMENT_PRICING.ONLINE.ONE_MONTH,
        baseAmount: online30,
        totalAmount: online30,
      },
    },
    OFFLINE: {
      APPOINTMENT: {
        ...APPOINTMENT_PRICING.OFFLINE.APPOINTMENT,
        baseAmount: offline,
        totalAmount: offline,
      },
    },
  };
}

module.exports = {
  APPOINTMENT_PRICING,
  calculateAppointmentPricing,
  getEffectivePricingConfig,
};
