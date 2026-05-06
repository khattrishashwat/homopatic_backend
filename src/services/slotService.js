const Slot = require('../models/Slot');

const WEEKEND_DAYS = [0, 6];
const DEFAULT_INTERVAL_MINUTES = 20;
const DEFAULT_DAYS_AHEAD = 30;
const SLOT_START_HOUR = '10';
const SLOT_END_HOUR = '20';

const validateHourFormat = (hour, name) => {
  if (!/^\d{2}$/.test(hour)) {
    throw new Error(`${name} must be in HH format`);
  }

  const value = Number(hour);
  if (value < 0 || value > 23) {
    throw new Error(`${name} must be between 00 and 23`);
  }

  return value;
};

const getSlotIntervalMinutes = (intervalMinutes) => {
  const interval = Number(intervalMinutes || process.env.SLOT_INTERVAL_MINUTES || DEFAULT_INTERVAL_MINUTES);
  if (!Number.isInteger(interval) || interval <= 0) {
    throw new Error('Slot interval must be a positive number');
  }

  return interval;
};

const getDaysAhead = (daysAhead) => {
  const days = Number(daysAhead || DEFAULT_DAYS_AHEAD);
  if (!Number.isInteger(days) || days < 0) {
    throw new Error('daysAhead must be a positive number');
  }

  return days;
};

const isWeekend = (date) => WEEKEND_DAYS.includes(date.getDay());

const getDayBounds = (date) => {
  const startHour = validateHourFormat(SLOT_START_HOUR, 'SLOT_START_HOUR');
  const endHour = validateHourFormat(SLOT_END_HOUR, 'SLOT_END_HOUR');

  if (startHour >= endHour) {
    throw new Error('SLOT_START_HOUR must be earlier than SLOT_END_HOUR');
  }

  const start = new Date(date);
  start.setHours(startHour, 0, 0, 0);

  const end = new Date(date);
  end.setHours(endHour, 0, 0, 0);

  return { start, end };
};

const normalizeDay = (date) => {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const parseTime = (time, name) => {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    const error = new Error(`${name} must be in HH:mm format`);
    error.statusCode = 400;
    throw error;
  }

  const [hours, minutes] = time.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    const error = new Error(`${name} must be a valid 24-hour time`);
    error.statusCode = 400;
    throw error;
  }

  return { hours, minutes };
};

const buildDateTime = (date, time, name) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error('date must be in YYYY-MM-DD format');
    error.statusCode = 400;
    throw error;
  }

  const { hours, minutes } = parseTime(time, name);
  const dateTime = new Date(`${date}T00:00:00`);
  dateTime.setHours(hours, minutes, 0, 0);

  if (Number.isNaN(dateTime.getTime())) {
    const error = new Error('date must be a valid date');
    error.statusCode = 400;
    throw error;
  }

  return dateTime;
};

const ensureWeekendSlot = (startTime) => {
  if (!isWeekend(startTime)) {
    const error = new Error('Slots can only be created for Saturday and Sunday');
    error.statusCode = 400;
    throw error;
  }
};

const ensureSlotWithinClinicHours = (startTime, endTime) => {
  const { start, end } = getDayBounds(startTime);
  if (startTime < start || endTime > end) {
    const error = new Error('Slots can only be created between 10:00 and 20:00');
    error.statusCode = 400;
    throw error;
  }
};

const createSlotsForDateRange = async (data) => {
  const interval = getSlotIntervalMinutes(data.interval || data.intervalMinutes);
  const rangeStart = buildDateTime(data.date, data.startTime, 'startTime');
  const rangeEnd = buildDateTime(data.date, data.endTime, 'endTime');

  ensureWeekendSlot(rangeStart);
  ensureSlotWithinClinicHours(rangeStart, rangeEnd);

  if (rangeStart >= rangeEnd) {
    const error = new Error('startTime must be earlier than endTime');
    error.statusCode = 400;
    throw error;
  }

  const slots = [];
  for (let startTime = new Date(rangeStart); startTime < rangeEnd; startTime = new Date(startTime.getTime() + interval * 60000)) {
    const endTime = new Date(startTime.getTime() + interval * 60000);
    if (endTime > rangeEnd) {
      break;
    }

    slots.push({
      startTime: new Date(startTime),
      endTime,
      available: data.available !== undefined ? data.available : true,
      doctor: data.doctor,
    });
  }

  const operations = slots.map((slot) => ({
    updateOne: {
      filter: { startTime: slot.startTime, endTime: slot.endTime },
      update: { $setOnInsert: slot },
      upsert: true,
    },
  }));

  if (!operations.length) {
    return [];
  }

  await Slot.bulkWrite(operations);
  return Slot.find({
    startTime: { $gte: rangeStart },
    endTime: { $lte: rangeEnd },
  });
};

exports.createSlot = async (data) => {
  if (data.date) {
    return createSlotsForDateRange(data);
  }

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  ensureWeekendSlot(startTime);
  ensureSlotWithinClinicHours(startTime, endTime);
  return Slot.create(data);
};

exports.getAllSlots = async () => {
  return Slot.find({
    $expr: { $in: [{ $dayOfWeek: '$startTime' }, [1, 7]] },
  });
};

exports.getAvailableSlots = async () => {
  return Slot.find({
    available: true,
    $expr: { $in: [{ $dayOfWeek: '$startTime' }, [1, 7]] },
  });
};

exports.updateSlot = async (id, data) => {
  const slot = await Slot.findById(id);
  if (!slot) {
    const error = new Error('Slot not found');
    error.statusCode = 404;
    throw error;
  }
  Object.assign(slot, data);

  if (data.startTime) {
    ensureWeekendSlot(new Date(data.startTime));
  }

  return slot.save();
};

exports.makeAllSlotsAvailable = async () => {
  return Slot.updateMany(
    { $expr: { $in: [{ $dayOfWeek: '$startTime' }, [1, 7]] } },
    { $set: { available: true } },
  );
};

exports.deleteWeekdaySlots = async () => {
  return Slot.deleteMany({
    $expr: { $not: [{ $in: [{ $dayOfWeek: '$startTime' }, [1, 7]] }] },
  });
};

exports.generateWeekendSlots = async ({ daysAhead, intervalMinutes } = {}) => {
  const interval = getSlotIntervalMinutes(intervalMinutes);
  const days = getDaysAhead(daysAhead);
  const today = normalizeDay(new Date());
  const endDate = addDays(today, days);
  const slots = [];

  await exports.deleteWeekdaySlots();

  for (let day = new Date(today); day <= endDate; day = addDays(day, 1)) {
    if (!isWeekend(day)) {
      continue;
    }

    const { start, end } = getDayBounds(day);

    for (let startTime = new Date(start); startTime < end; startTime = new Date(startTime.getTime() + interval * 60000)) {
      const endTime = new Date(startTime.getTime() + interval * 60000);
      if (endTime > end) {
        break;
      }

      slots.push({ startTime: new Date(startTime), endTime, available: true });
    }
  }

  const operations = slots.map((slot) => ({
    updateOne: {
      filter: { startTime: slot.startTime, endTime: slot.endTime },
      update: { $setOnInsert: slot },
      upsert: true,
    },
  }));

  if (!operations.length) {
    return { createdOrMatchedSlots: 0 };
  }

  const result = await Slot.bulkWrite(operations);
  return {
    createdOrMatchedSlots: slots.length,
    insertedCount: result.upsertedCount || 0,
    matchedCount: result.matchedCount || 0,
  };
};

exports.countSlots = async () => {
  return Slot.countDocuments();
};
