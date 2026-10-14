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

exports.validateUploadBulkRecords = (payload, files) => {
  if (!payload.patientId) {
    const error = new Error('patientId is required');
    error.statusCode = 400;
    throw error;
  }
  if (!files || files.length === 0) {
    const error = new Error('At least one medical record file (PNG, JPG, JPEG, PDF) is required');
    error.statusCode = 400;
    throw error;
  }
};
