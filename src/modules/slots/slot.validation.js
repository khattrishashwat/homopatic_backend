exports.validateCreateSlot = (payload) => {
  if (!payload.startTime && !payload.date) {
    const error = new Error('Either a startTime or a date is required to create a slot');
    error.statusCode = 400;
    throw error;
  }

  if (payload.startTime && !payload.endTime) {
    const error = new Error('endTime is required when startTime is provided');
    error.statusCode = 400;
    throw error;
  }
};

exports.validateGenerateWeekendSlots = (payload) => {
  if (payload.daysAhead !== undefined && Number(payload.daysAhead) < 0) {
    const error = new Error('daysAhead must be a non-negative number');
    error.statusCode = 400;
    throw error;
  }
};
