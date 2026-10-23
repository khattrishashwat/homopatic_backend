exports.validateCreatePrescription = (payload) => {
  if (!payload.patientId) {
    const error = new Error('patientId is required');
    error.statusCode = 400;
    throw error;
  }

  const hasMedicines = Array.isArray(payload.medicines) && payload.medicines.length > 0;
  const hasNotesOrImage =
    Boolean(payload.notes && payload.notes.trim()) ||
    Boolean(payload.imageData) ||
    Boolean(payload.imageUrl || payload.image_url || payload.image_s3_key || payload.imageS3Key);

  if (!hasMedicines && !hasNotesOrImage) {
    const error = new Error('Please write prescription details or add medicines');
    error.statusCode = 400;
    throw error;
  }
};
