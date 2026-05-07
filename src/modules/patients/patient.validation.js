exports.validatePatientPayload = (payload) => {
  if (!payload.name) {
    const error = new Error('Patient name is required');
    error.statusCode = 400;
    throw error;
  }
  if (!payload.email) {
    const error = new Error('Patient email is required');
    error.statusCode = 400;
    throw error;
  }
  if (!payload.phone) {
    const error = new Error('Patient phone is required');
    error.statusCode = 400;
    throw error;
  }
};

exports.validateFamilyLink = (payload) => {
  if (!payload.primaryPatientId || !payload.familyMemberId) {
    const error = new Error('Both primaryPatientId and familyMemberId are required');
    error.statusCode = 400;
    throw error;
  }
};
