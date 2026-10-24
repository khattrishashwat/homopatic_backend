exports.validatePatientPayload = (_payload) => {
  // All fields are optional per requirements - allow registration even when fields are empty
  return true;
};

exports.validateFamilyLink = (payload) => {
  if (!payload.primaryPatientId || !payload.familyMemberId) {
    const error = new Error('Both primaryPatientId and familyMemberId are required');
    error.statusCode = 400;
    throw error;
  }
};
