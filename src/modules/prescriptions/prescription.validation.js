exports.validateCreatePrescription = (payload) => {
  if (!payload.patientId) {
    const error = new Error('patientId is required');
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(payload.medicines) || payload.medicines.length === 0) {
    const error = new Error('At least one medicine is required');
    error.statusCode = 400;
    throw error;
  }
};
