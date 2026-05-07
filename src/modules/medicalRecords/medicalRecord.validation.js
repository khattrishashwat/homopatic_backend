exports.validateUploadRecord = (payload, file) => {
  if (!payload.patientId) {
    const error = new Error('patientId is required');
    error.statusCode = 400;
    throw error;
  }
  if (!file) {
    const error = new Error('A medical record file is required');
    error.statusCode = 400;
    throw error;
  }
};
